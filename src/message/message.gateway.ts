import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { WsAuthGuard } from '../auth/guard/ws-auth.guard';
import { MessageService } from './message.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { Message } from './entities/message.entity';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true
  },
  namespace: '/messages'
})
export class MessageGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<string, { userId: number; socket: Socket }>();

  constructor(private readonly messageService: MessageService) {}

  async handleConnection(client: Socket) {
    try {
      // Verificar autenticación del usuario
      const token = client.handshake.auth.token;
      if (!token) {
        client.disconnect();
        return;
      }

      // Aquí deberías verificar el token JWT
      // Por simplicidad, asumimos que el userId viene en el token
      const userId = this.extractUserIdFromToken(token);
      if (!userId) {
        client.disconnect();
        return;
      }

      // Guardar la conexión del usuario
      this.connectedUsers.set(client.id, { userId, socket: client });
      
      // Unir al usuario a su sala personal
      await client.join(`user_${userId}`);
      
      console.log(`Usuario ${userId} conectado: ${client.id}`);
    } catch (error) {
      console.error('Error en conexión WebSocket:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.connectedUsers.delete(client.id);
    console.log(`Cliente desconectado: ${client.id}`);
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @MessageBody() data: CreateMessageDto,
    @ConnectedSocket() client: Socket
  ) {
    try {
      // Crear el mensaje en la base de datos
      const message = await this.messageService.create(data);
      
      // Emitir el mensaje al destinatario si está conectado
      const recipientRoom = `user_${data.recipientId}`;
      this.server.to(recipientRoom).emit('new_message', {
        message,
        conversationId: `${Math.min(data.senderId, data.recipientId)}_${Math.max(data.senderId, data.recipientId)}`
      });

      // Confirmar al remitente que el mensaje se envió
      client.emit('message_sent', { message });

      // Emitir actualización de conversación
      this.server.to(`user_${data.senderId}`).emit('conversation_updated', {
        conversationId: `${Math.min(data.senderId, data.recipientId)}_${Math.max(data.senderId, data.recipientId)}`,
        lastMessage: message
      });

      this.server.to(`user_${data.recipientId}`).emit('conversation_updated', {
        conversationId: `${Math.min(data.senderId, data.recipientId)}_${Math.max(data.senderId, data.recipientId)}`,
        lastMessage: message
      });

    } catch (error) {
      console.error('Error enviando mensaje:', error);
      client.emit('message_error', { error: 'Error al enviar mensaje' });
    }
  }

  @SubscribeMessage('mark_as_read')
  async handleMarkAsRead(
    @MessageBody() data: { messageId: string },
    @ConnectedSocket() client: Socket
  ) {
    try {
      const message = await this.messageService.markAsRead(data.messageId);
      
      // Notificar al remitente que su mensaje fue leído
      const userConnection = this.connectedUsers.get(client.id);
      if (userConnection) {
        this.server.to(`user_${message.sender.id}`).emit('message_read', {
          messageId: data.messageId,
          readAt: message.read_at
        });
      }
    } catch (error) {
      console.error('Error marcando mensaje como leído:', error);
      client.emit('mark_read_error', { error: 'Error al marcar mensaje como leído' });
    }
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @MessageBody() data: { recipientId: number; isTyping: boolean },
    @ConnectedSocket() client: Socket
  ) {
    const userConnection = this.connectedUsers.get(client.id);
    if (userConnection) {
      this.server.to(`user_${data.recipientId}`).emit('user_typing', {
        userId: userConnection.userId,
        isTyping: data.isTyping
      });
    }
  }

  // Método para emitir mensajes desde el servicio
  emitNewMessage(message: Message, recipientId: number) {
    const recipientRoom = `user_${recipientId}`;
    this.server.to(recipientRoom).emit('new_message', {
      message,
      conversationId: `${Math.min(message.sender.id, message.recipient.id)}_${Math.max(message.sender.id, message.recipient.id)}`
    });
  }

  private extractUserIdFromToken(token: string): number | null {
    try {
      // Aquí deberías implementar la verificación real del JWT
      // Por ahora, asumimos que el token contiene el userId
      const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      return decoded.id || null;
    } catch (error) {
      return null;
    }
  }
} 