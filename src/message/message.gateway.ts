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
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:8081',
      'http://localhost:19006',
      'http://192.168.1.17:8081',
      'http://192.168.1.17:19006',
      process.env.PUBLIC_FRONT_URL,
      'https://suarec-frontend-production.up.railway.app',
      'https://suarec.com',
      'https://api.suarec.com'
    ],
    credentials: true
  },
  namespace: '/messages'
})
export class MessageGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<string, { userId: number; socket: Socket }>();

  constructor(
    private readonly messageService: MessageService,
    private readonly jwtService: JwtService
  ) {}

  async handleConnection(client: Socket) {
    try {
      // Verificar autenticación del usuario
      const token = client.handshake.auth.token;
      console.log('🔑 Token recibido en WebSocket:', token ? 'Sí' : 'No');
      if (!token) {
        console.log('Token no proporcionado, desconectando cliente');
        client.disconnect();
        return;
      }

      // Verificar el token JWT
      const userId = this.extractUserIdFromToken(token);
      console.log('👤 UserId extraído:', userId);
      if (!userId) {
        console.log('Token inválido, desconectando cliente');
        client.disconnect();
        return;
      }

      // Verificar si el usuario ya está conectado y desconectarlo
      const existingConnection = Array.from(this.connectedUsers.entries())
        .find(([_, userData]) => userData.userId === userId);
      
      if (existingConnection) {
        console.log(`Usuario ${userId} ya conectado, manteniendo conexión anterior`);
        // No desconectar la conexión anterior, solo actualizar la referencia
        this.connectedUsers.delete(existingConnection[0]);
      }

      // Guardar la nueva conexión del usuario
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
    const userData = this.connectedUsers.get(client.id);
    if (userData) {
      console.log(`Usuario ${userData.userId} desconectado: ${client.id}`);
      this.connectedUsers.delete(client.id);
    } else {
      console.log(`Cliente desconectado: ${client.id}`);
    }
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @MessageBody() data: CreateMessageDto,
    @ConnectedSocket() client: Socket
  ) {
    try {
      console.log('📤 Enviando mensaje:', data);
      
      // Crear el mensaje en la base de datos
      const message = await this.messageService.create(data);
      console.log('✅ Mensaje creado:', message);
      
      // Emitir el mensaje al destinatario si está conectado
      const recipientRoom = `user_${data.recipientId}`;
      const messageData = {
        message,
        conversationId: `${Math.min(data.senderId, data.recipientId)}_${Math.max(data.senderId, data.recipientId)}`
      };
      
      console.log('📨 Emitiendo mensaje a:', recipientRoom);
      console.log('📋 Datos del mensaje:', messageData);
      
      this.server.to(recipientRoom).emit('new_message', messageData);

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
      console.error('❌ Error enviando mensaje:', error);
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
      console.log('🔍 Verificando token con JwtService...');
      const payload = this.jwtService.verify(token);
      console.log('✅ Token verificado correctamente, payload:', payload);
      return payload.id || payload.sub || null;
    } catch (error) {
      console.error('❌ Error verificando token:', error);
      return null;
    }
  }
} 