import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { MessageService } from "./message.service";
import { CreateMessageDto } from "./dto/create-message.dto";
import { Message } from "./entities/message.entity";
import { JwtService } from "@nestjs/jwt";

@WebSocketGateway({
  cors: {
    origin: [
      "http://localhost:3000",
      "http://localhost:8081", // Expo web
      "http://localhost:19006", // Expo web alternativo
      "http://192.168.1.17:8081", // App móvil desde IP local
      "http://192.168.1.17:19006", // App móvil desde IP local alternativo
      process.env.PUBLIC_FRONT_URL,
      "https://suarec-frontend-production.up.railway.app",
      "https://suarec.com",
    ],
    credentials: true,
  },
  namespace: "/messages",
})
export class MessageGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<
    string,
    { userId: number; socket: Socket }
  >();

  constructor(
    private readonly messageService: MessageService, // eslint-disable-line no-unused-vars
    private readonly jwtService: JwtService, // eslint-disable-line no-unused-vars
  ) {}

  async handleConnection(client: Socket) {
    try {
      // Verificar autenticación del usuario
      const token = client.handshake.auth.token;

      if (!token) {
        client.disconnect();
        return;
      }

      // Verificar el token JWT
      const userId = this.extractUserIdFromToken(token);

      if (!userId) {
        client.disconnect();
        return;
      }

      // Verificar si el usuario ya está conectado y desconectarlo
      const existingConnection = Array.from(this.connectedUsers.entries()).find(
        ([_, userData]) => userData.userId === userId, // eslint-disable-line no-unused-vars
      );

      if (existingConnection) {
        // No desconectar la conexión anterior, solo actualizar la referencia
        this.connectedUsers.delete(existingConnection[0]);
      }

      // Guardar la nueva conexión del usuario
      this.connectedUsers.set(client.id, { userId, socket: client });

      // Unir al usuario a su sala personal
      await client.join(`user_${userId}`);
    } catch (error) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userData = this.connectedUsers.get(client.id);
    if (userData) {
      this.connectedUsers.delete(client.id);
    }
  }

  @SubscribeMessage("send_message")
  async handleSendMessage(
    @MessageBody() data: CreateMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      // Crear el mensaje en la base de datos
      const message = await this.messageService.create(data);

      // Emitir el mensaje al destinatario si está conectado
      const recipientRoom = `user_${data.recipientId}`;
      const messageData = {
        message,
        conversationId: `${Math.min(data.senderId, data.recipientId)}_${Math.max(data.senderId, data.recipientId)}`,
      };

      // Emitir el mensaje al destinatario
      this.server.to(recipientRoom).emit("new_message", messageData);

      // También emitir al remitente para que vea su mensaje confirmado
      this.server.to(`user_${data.senderId}`).emit("new_message", messageData);

      // Confirmar al remitente que el mensaje se envió
      client.emit("message_sent", { message });

      // Emitir actualización de conversación
      this.server.to(`user_${data.senderId}`).emit("conversation_updated", {
        conversationId: `${Math.min(data.senderId, data.recipientId)}_${Math.max(data.senderId, data.recipientId)}`,
        lastMessage: message,
      });

      this.server.to(`user_${data.recipientId}`).emit("conversation_updated", {
        conversationId: `${Math.min(data.senderId, data.recipientId)}_${Math.max(data.senderId, data.recipientId)}`,
        lastMessage: message,
      });
    } catch (error) {
      client.emit("message_error", { error: "Error al enviar mensaje" });
    }
  }

  @SubscribeMessage("mark_as_read")
  async handleMarkAsRead(
    @MessageBody() data: { messageId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      console.log("📖 Backend recibió mark_as_read:", data);
      const message = await this.messageService.markAsRead(data.messageId);
      console.log("📖 Mensaje marcado como leído en BD:", message.id);

      // Notificar al remitente que su mensaje fue leído
      const userConnection = this.connectedUsers.get(client.id);
      if (userConnection) {
        console.log("📖 Emitiendo message_read a usuario:", message.sender.id);
        this.server.to(`user_${message.sender.id}`).emit("message_read", {
          messageId: data.messageId,
          readAt: message.read_at,
        });
      } else {
        console.log("❌ No se encontró conexión del usuario para emitir message_read");
      }
    } catch (error) {
      console.error("❌ Error en handleMarkAsRead:", error);
      client.emit("mark_read_error", {
        error: "Error al marcar mensaje como leído",
      });
    }
  }

  @SubscribeMessage("typing")
  async handleTyping(
    @MessageBody() data: { recipientId: number; isTyping: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    const userConnection = this.connectedUsers.get(client.id);
    if (userConnection) {
      this.server.to(`user_${data.recipientId}`).emit("user_typing", {
        userId: userConnection.userId,
        isTyping: data.isTyping,
      });
    }
  }

  // Método para emitir mensajes desde el servicio
  emitNewMessage(message: Message, recipientId: number) {
    const recipientRoom = `user_${recipientId}`;
    this.server.to(recipientRoom).emit("new_message", {
      message,
      conversationId: `${Math.min(message.sender.id, message.recipient.id)}_${Math.max(message.sender.id, message.recipient.id)}`,
    });
  }

  // Método para depurar conexiones activas
  @SubscribeMessage("debug_connection")
  async handleDebugConnection(@ConnectedSocket() client: Socket) {
    const userConnection = this.connectedUsers.get(client.id);
    const connectionInfo = {
      clientId: client.id,
      connected: client.connected,
      rooms: Array.from(client.rooms),
      userId: userConnection?.userId,
      totalConnections: this.connectedUsers.size,
      timestamp: new Date().toISOString(),
    };

    client.emit("debug_response", connectionInfo);
  }

  // Método para obtener estadísticas del WebSocket
  getConnectionStats() {
    return {
      totalConnections: this.connectedUsers.size,
      connectedUsers: Array.from(this.connectedUsers.values()).map((conn) => ({
        userId: conn.userId,
        socketId: conn.socket.id,
        connected: conn.socket.connected,
      })),
      timestamp: new Date().toISOString(),
    };
  }

  private extractUserIdFromToken(token: string): number | null {
    try {
      const payload = this.jwtService.verify(token);
      return payload.id || payload.sub || null;
    } catch (error) {
      return null;
    }
  }
}
