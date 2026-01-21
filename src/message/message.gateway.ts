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
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Like } from "typeorm";

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
      "https://www.suarec.com",
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
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>, // eslint-disable-line no-unused-vars
  ) {}

  async handleConnection(client: Socket) {
    try {
      console.log("🔌 Nueva conexión WebSocket:", client.id);
      
      // Establecer el server en el MessageService
      this.messageService.setServer(this.server);

      // Verificar autenticación del usuario
      const token = client.handshake.auth.token;
      console.log("🔑 Token recibido:", token ? "Sí" : "No");

      if (!token) {
        console.log("❌ No hay token, desconectando");
        client.disconnect();
        return;
      }

      // Verificar el token JWT
      const userId = this.extractUserIdFromToken(token);
      console.log("👤 UserId extraído:", userId);

      if (!userId) {
        console.log("❌ Token inválido, desconectando");
        client.disconnect();
        return;
      }

      // Verificar si el usuario ya está conectado y desconectarlo
      const existingConnection = Array.from(this.connectedUsers.entries()).find(
        ([_, userData]) => userData.userId === userId, // eslint-disable-line no-unused-vars
      );

      if (existingConnection) {
        console.log("🔄 Usuario ya conectado, actualizando referencia");
        this.connectedUsers.delete(existingConnection[0]);
      }

      // Guardar la nueva conexión del usuario
      this.connectedUsers.set(client.id, { userId, socket: client });

      // Unir al usuario a su sala personal
      await client.join(`user_${userId}`);
      console.log("✅ Usuario conectado exitosamente:", { userId, socketId: client.id });
    } catch (error) {
      console.error("❌ Error en handleConnection:", error);
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
      console.log("📨 Mensaje recibido:", data);
      
      // Crear el mensaje normalmente
      const message = await this.messageService.create(data);

      const senderId = message?.sender?.id ?? (message as any)?.senderId ?? data.senderId;
      const recipientId = message?.recipient?.id ?? (message as any)?.recipientId ?? data.recipientId;
      const conversationId = `${Math.min(senderId, recipientId)}_${Math.max(senderId, recipientId)}`;

      // Emitir el mensaje
      const messageData = {
        message,
        senderId,
        recipientId,
        conversationId,
      };

      // Emitir solo al destinatario, no al remitente
      this.server.to(`user_${data.recipientId}`).emit("new_message", messageData);
      // this.server.to(`user_${data.senderId}`).emit("new_message", messageData);

      // Confirmar al remitente
      const messageSentPayload = {
        message,
        senderId,
        recipientId,
        conversationId,
      };
      client.emit("message_sent", messageSentPayload);

      // Emitir actualización de conversación
      this.server.to(`user_${data.senderId}`).emit("conversation_updated", {
        conversationId,
        senderId,
        recipientId,
        lastMessage: message,
      });

      this.server.to(`user_${data.recipientId}`).emit("conversation_updated", {
        conversationId,
        senderId,
        recipientId,
        lastMessage: message,
      });

      // Si es un ticket nuevo (mensaje a Suarec), crear respuesta automática
      if (data.recipientId === 0 && message.status === "open") {
        const autoResponse = await this.messageService.create({
          content: `🎫 **Ticket #${message.id} creado exitosamente**\n\nHemos recibido tu mensaje y lo hemos registrado como ticket de soporte.\n\n**Estado:** Pendiente de revisión\n**Prioridad:** Normal\n\nNuestro equipo de soporte revisará tu consulta y te responderá lo antes posible.\n\nGracias por contactarnos.`,
          senderId: 0,
          recipientId: data.senderId,
        });

        const autoResponseData = {
          message: autoResponse,
          senderId: 0,
          recipientId: data.senderId,
          conversationId: `${Math.min(0, data.senderId)}_${Math.max(0, data.senderId)}`,
        };

        this.server.to(`user_${data.senderId}`).emit("new_message", autoResponseData);
      }
    } catch (error) {
      console.error("❌ Error en handleSendMessage:", error);
      client.emit("message_error", { error: "Error al enviar mensaje" });
    }
  }

  @SubscribeMessage("add_message_to_ticket")
  async handleAddMessageToTicket(
    @MessageBody() data: { ticketId: string; content: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      console.log("📨 Agregando mensaje a ticket:", data);
      console.log("📨 Datos recibidos:", JSON.stringify(data, null, 2));
      
      // Obtener el userId del token
      const token = client.handshake.auth.token;
      const userId = this.extractUserIdFromToken(token);
      
      console.log("👤 UserId extraído del token:", userId);
      
      if (!userId) {
        console.log("❌ Usuario no autenticado");
        client.emit("message_error", { error: "Usuario no autenticado" });
        return;
      }

      console.log("🎫 Llamando a addMessageToTicket...");

      // Agregar mensaje al ticket
      const message = await this.messageService.addMessageToTicket(data.ticketId, userId, data.content);
      
      console.log("✅ Mensaje agregado exitosamente:", message.id);

      // Emitir el mensaje
      const messageData = {
        message,
        senderId: userId,
        recipientId: 0,
        conversationId: `${Math.min(0, userId)}_${Math.max(0, userId)}`,
      };

      console.log("📤 Emitiendo new_message:", messageData);

      // NO emitir al remitente - solo confirmar que se envió
      // this.server.to(`user_${userId}`).emit("new_message", messageData);
      
      // Emitir actualización de conversación
      this.server.to(`user_${userId}`).emit("conversation_updated", {
        conversationId: `${Math.min(0, userId)}_${Math.max(0, userId)}`,
        senderId: userId,
        recipientId: 0,
        lastMessage: message,
      });

      // Confirmar al remitente
      client.emit("message_sent", {
        message,
        senderId: userId,
        recipientId: 0,
        conversationId: `${Math.min(0, userId)}_${Math.max(0, userId)}`,
      });

      console.log("✅ Mensaje agregado al ticket:", data.ticketId);
    } catch (error) {
      console.error("❌ Error en handleAddMessageToTicket:", error);
      client.emit("message_error", { error: error.message || "Error al agregar mensaje al ticket" });
    }
  }

  @SubscribeMessage("create_ticket")
  async handleCreateTicket(
    @MessageBody() data: { userId: number; content: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      console.log("🎫 Creando ticket:", data);
      
      // Verificar si el usuario ya tiene un ticket activo
      const activeTicket = await this.messageService.getActiveTicketForUser(data.userId);
      
      if (activeTicket) {
        client.emit("error", {
          message: "Ya tienes un ticket activo. Usa el ticket existente para enviar mensajes adicionales.",
          activeTicketId: activeTicket.id,
        });
        return;
      }

      // Crear el ticket
      const ticket = await this.messageService.createTicket(data.userId, data.content);
      
      console.log("🎫 Ticket creado:", ticket.id);
      
      // Emitir el ticket creado
      client.emit("ticket_created", ticket);
      
      // Emitir el mensaje del usuario que creó el ticket
      const userMessageData = {
        message: ticket,
        senderId: data.userId,
        recipientId: 0,
        conversationId: `${Math.min(0, data.userId)}_${Math.max(0, data.userId)}`,
      };
      
      // Emitir al usuario
      this.server.to(`user_${data.userId}`).emit("new_message", userMessageData);
      
      // Emitir actualización de conversación
      this.server.to(`user_${data.userId}`).emit("conversation_updated", {
        conversationId: `${Math.min(0, data.userId)}_${Math.max(0, data.userId)}`,
        senderId: data.userId,
        recipientId: 0,
        lastMessage: ticket,
      });
      
      // Buscar el mensaje automático que se creó junto con el ticket
      const autoResponse = await this.messageRepository.findOne({
        where: {
          sender: { id: 0 },
          recipient: { id: data.userId },
          content: Like(`%Ticket #${ticket.id}%`)
        },
        relations: ["sender", "recipient"],
        order: { sent_at: "DESC" }
      });

      if (autoResponse) {
        console.log("🎫 Emitiendo mensaje automático:", autoResponse.id);
        
        const autoResponseData = {
          message: autoResponse,
          senderId: 0,
          recipientId: data.userId,
          conversationId: `${Math.min(0, data.userId)}_${Math.max(0, data.userId)}`,
        };

        // Emitir al usuario
        this.server.to(`user_${data.userId}`).emit("new_message", autoResponseData);
        
        // Emitir actualización de conversación
        this.server.to(`user_${data.userId}`).emit("conversation_updated", {
          conversationId: `${Math.min(0, data.userId)}_${Math.max(0, data.userId)}`,
          senderId: 0,
          recipientId: data.userId,
          lastMessage: autoResponse,
        });
      }
    } catch (error) {
      console.error("Error en handleCreateTicket:", error);
      client.emit("error", { message: "Error al crear el ticket" });
    }
  }

  @SubscribeMessage("admin_reply")
  async handleAdminReply(
    @MessageBody() data: { ticketId: string; content: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      console.log("🎫 Admin respondiendo a ticket:", data);
      
      // Crear respuesta del admin
      const message = await this.messageService.respondToTicket(data.ticketId, data.content);
      
      console.log("🎫 Respuesta de admin creada:", message.id);
      
      // Emitir el mensaje al usuario
      const messageData = {
        message,
        senderId: 0,
        recipientId: message.recipient.id,
        conversationId: `${Math.min(0, message.recipient.id)}_${Math.max(0, message.recipient.id)}`,
      };

      // Emitir al usuario
      this.server.to(`user_${message.recipient.id}`).emit("new_message", messageData);
      
      // Emitir actualización de conversación
      this.server.to(`user_${message.recipient.id}`).emit("conversation_updated", {
        conversationId: `${Math.min(0, message.recipient.id)}_${Math.max(0, message.recipient.id)}`,
        senderId: 0,
        recipientId: message.recipient.id,
        lastMessage: message,
      });

      // Confirmar al admin
      client.emit("admin_reply_sent", { message });
      
    } catch (error) {
      console.error("Error en handleAdminReply:", error);
      client.emit("error", { message: "Error al enviar respuesta de admin" });
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

  @SubscribeMessage("mark_conversation_as_read")
  async handleMarkConversationAsRead(
    @MessageBody() data: { senderId: number },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const token = client.handshake.auth.token;
      const recipientId = this.extractUserIdFromToken(token);

      if (!recipientId) {
        client.emit("mark_read_error", { error: "Usuario no autenticado" });
        return;
      }

      if (data?.senderId === undefined || data?.senderId === null) {
        client.emit("mark_read_error", { error: "senderId es requerido" });
        return;
      }

      const result = await this.messageService.markConversationAsRead(
        recipientId,
        data.senderId,
      );

      const conversationId = `${Math.min(recipientId, data.senderId)}_${Math.max(recipientId, data.senderId)}`;

      if (result.updated > 0) {
        this.server.to(`user_${data.senderId}`).emit("conversation_read", {
          conversationId,
          readerId: recipientId,
          readAt: result.readAt,
          updated: result.updated,
        });
      }

      client.emit("conversation_marked_read", {
        conversationId,
        updated: result.updated,
        readAt: result.readAt,
      });
    } catch (error) {
      console.error("Error en handleMarkConversationAsRead:", error);
      client.emit("mark_read_error", {
        error: "Error al marcar conversacion como leida",
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
      senderId: message.sender?.id ?? (message as any)?.senderId,
      recipientId: message.recipient?.id ?? (message as any)?.recipientId,
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
