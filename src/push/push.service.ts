import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  Expo,
  ExpoPushMessage,
  ExpoPushReceiptId,
  ExpoPushTicket,
} from "expo-server-sdk";
import { Repository } from "typeorm";
import { RegisterPushTokenDto } from "./dto/register-push-token.dto";
import { PushSendLog } from "./entities/push-send-log.entity";
import { PushToken } from "./entities/push-token.entity";

type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, any>;
};

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly provider = (process.env.PUSH_PROVIDER || "expo").toLowerCase();
  private readonly expo =
    this.provider === "expo"
      ? new Expo(
          process.env.EXPO_ACCESS_TOKEN
            ? { accessToken: process.env.EXPO_ACCESS_TOKEN }
            : undefined,
        )
      : null;

  constructor(
    @InjectRepository(PushToken)
    private readonly pushTokenRepository: Repository<PushToken>, // eslint-disable-line no-unused-vars
    @InjectRepository(PushSendLog)
    private readonly pushSendLogRepository: Repository<PushSendLog>, // eslint-disable-line no-unused-vars
  ) {}

  async registerToken(
    userId: number,
    dto: RegisterPushTokenDto,
  ): Promise<PushToken> {
    if (this.isExpoEnabled() && !Expo.isExpoPushToken(dto.token)) {
      throw new BadRequestException("Invalid Expo push token");
    }

    const existing = await this.pushTokenRepository.findOne({
      where: { token: dto.token },
      relations: ["user"],
    });

    const now = new Date();

    if (existing) {
      existing.user = { id: userId } as any;
      existing.platform = dto.platform;
      existing.deviceId = dto.deviceId ?? existing.deviceId ?? null;
      existing.appVersion = dto.appVersion ?? existing.appVersion ?? null;
      existing.lastSeen = now;
      return this.pushTokenRepository.save(existing);
    }

    const newToken = this.pushTokenRepository.create({
      token: dto.token,
      platform: dto.platform,
      deviceId: dto.deviceId ?? null,
      appVersion: dto.appVersion ?? null,
      lastSeen: now,
      user: { id: userId } as any,
    });

    return this.pushTokenRepository.save(newToken);
  }

  async getTokensByUser(userId: number): Promise<PushToken[]> {
    return this.pushTokenRepository.find({
      where: { user: { id: userId } },
    });
  }

  async invalidateToken(
    token: string,
    requester?: { id: number; roles?: string[] },
  ): Promise<{ removed: boolean }> {
    const existing = await this.pushTokenRepository.findOne({
      where: { token },
      relations: ["user"],
    });

    if (!existing) {
      return { removed: false };
    }

    if (
      requester &&
      !this.isAdmin(requester.roles) &&
      existing.user?.id !== requester.id
    ) {
      throw new ForbiddenException("No tienes permisos para eliminar este token");
    }

    await this.pushTokenRepository.remove(existing);
    return { removed: true };
  }

  async sendToUser(userId: number, payload: PushPayload): Promise<void> {
    if (!this.isExpoEnabled()) {
      this.logger.warn(
        `Push provider "${this.provider}" not supported. Skipping send.`,
      );
      return;
    }

    const tokens = await this.pushTokenRepository.find({
      where: { user: { id: userId } },
      relations: ["user"],
    });

    if (!tokens.length) {
      return;
    }

    await this.sendToTokens(tokens, payload);
  }

  async sendToTokens(tokens: PushToken[], payload: PushPayload): Promise<void> {
    if (!this.isExpoEnabled()) {
      return;
    }

    const validTokens = tokens.filter((token) =>
      Expo.isExpoPushToken(token.token),
    );

    if (!validTokens.length) {
      return;
    }

    const tokenMap = new Map<string, PushToken>(
      validTokens.map((token) => [token.token, token]),
    );

    const messages: ExpoPushMessage[] = validTokens.map((token) => ({
      to: token.token,
      sound: "default",
      title: payload.title,
      body: payload.body,
      data: payload.data || {},
    }));

    const chunks = this.expo?.chunkPushNotifications(messages) ?? [];
    const receiptIds: ExpoPushReceiptId[] = [];
    const receiptIdToToken = new Map<ExpoPushReceiptId, PushToken>();

    for (const chunk of chunks) {
      let tickets: ExpoPushTicket[] = [];
      try {
        tickets = await this.expo.sendPushNotificationsAsync(chunk);
      } catch (error) {
        this.logger.error("Error sending push notifications chunk", error);
        for (const message of chunk) {
          const token = tokenMap.get(message.to as string);
          if (token) {
            await this.logSendResult(token, payload, "error", "SEND_FAILED", String(error));
          }
        }
        continue;
      }

      for (let i = 0; i < tickets.length; i += 1) {
        const ticket = tickets[i];
        const message = chunk[i];
        const tokenValue = message.to as string;
        const token = tokenMap.get(tokenValue);
        if (!token) {
          continue;
        }

        if (ticket.status === "error") {
          const errorCode = (ticket as any).details?.error;
          const errorMessage = ticket.message || "Unknown push error";
          await this.logSendResult(token, payload, "error", errorCode, errorMessage);
          if (errorCode === "DeviceNotRegistered") {
            await this.removeTokenByValue(token.token);
          }
          continue;
        }

        await this.logSendResult(token, payload, "success");

        if (ticket.id) {
          receiptIds.push(ticket.id);
          receiptIdToToken.set(ticket.id, token);
        }
      }
    }

    const receiptIdChunks =
      this.expo?.chunkPushNotificationReceiptIds(receiptIds) ?? [];
    for (const receiptChunk of receiptIdChunks) {
      let receipts: Record<string, any> = {};
      try {
        receipts = await this.expo.getPushNotificationReceiptsAsync(receiptChunk);
      } catch (error) {
        this.logger.error("Error fetching push receipts", error);
        continue;
      }

      for (const receiptId of Object.keys(receipts)) {
        const receipt = receipts[receiptId];
        if (!receipt) {
          continue;
        }
        if (receipt.status === "error") {
          const token = receiptIdToToken.get(receiptId as ExpoPushReceiptId);
          const errorCode = receipt.details?.error;
          const errorMessage = receipt.message || "Unknown receipt error";
          if (token) {
            await this.logSendResult(token, payload, "error", errorCode, errorMessage);
            if (errorCode === "DeviceNotRegistered") {
              await this.removeTokenByValue(token.token);
            }
          }
        }
      }
    }
  }

  private isExpoEnabled(): boolean {
    return this.provider === "expo" && !!this.expo;
  }

  private isAdmin(roles?: string[]): boolean {
    return Array.isArray(roles) && roles.includes("ADMIN");
  }

  private async removeTokenByValue(token: string): Promise<void> {
    try {
      await this.pushTokenRepository.delete({ token });
    } catch (error) {
      this.logger.error(`Error deleting push token ${token}`, error);
    }
  }

  private async logSendResult(
    token: PushToken,
    payload: PushPayload,
    status: string,
    errorCode?: string,
    errorMessage?: string,
  ): Promise<void> {
    try {
      const userId = token.user?.id ?? (token as any).userId ?? null;
      const log = this.pushSendLogRepository.create({
        provider: this.provider,
        status,
        errorCode: errorCode ?? null,
        errorMessage: errorMessage ?? null,
        payload,
        token: token.token,
        userId,
      });
      await this.pushSendLogRepository.save(log);
    } catch (error) {
      this.logger.error("Error saving push send log", error);
    }
  }
}
