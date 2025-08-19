import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Not, Between, Like } from "typeorm";
import { Message } from "./entities/message.entity";
import { CreateMessageDto } from "./dto/create-message.dto";
import { UpdateMessageDto } from "./dto/update-message.dto";
import { User } from "../user/entities/user.entity";
import { PaginationDto } from "../common/dto/pagination.dto";
import { PaginationResponse } from "../common/interfaces/paginated-response.interface";

@Injectable()
export class MessageService {
  private readonly logger = new Logger("MessageService");

  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>, // eslint-disable-line no-unused-vars
    @InjectRepository(User)
    private readonly userRepository: Repository<User>, // eslint-disable-line no-unused-vars
  ) {}

  private server: any = null;

  setServer(server: any) {
    this.server = server;
  }

  async create(createMessageDto: CreateMessageDto): Promise<Message> {
    try {
      const { senderId, recipientId, content } = createMessageDto;
      
      console.log("📝 Creando mensaje:", { senderId, recipientId, content });

      // Verificar que el remitente existe
      const sender = await this.userRepository.findOne({
        where: { id: senderId },
      });
      console.log("📝 Sender encontrado:", sender ? `ID ${sender.id} - ${sender.name}` : "NO ENCONTRADO");
      if (!sender) {
        throw new BadRequestException(`Sender with ID ${senderId} not found`);
      }

      // Verificar que el destinatario existe
      const recipient = await this.userRepository.findOne({
        where: { id: recipientId },
      });
      console.log("📝 Recipient encontrado:", recipient ? `ID ${recipient.id} - ${recipient.name}` : "NO ENCONTRADO");
      if (!recipient) {
        throw new BadRequestException(
          `Recipient with ID ${recipientId} not found`,
        );
      }

      // Verificar si es un mensaje a Suarec y hay un ticket activo
      let activeTicket = null;
      let isNewTicket = false;
      
      if (recipientId === 0) {
        console.log("🔍 Buscando ticket activo para usuario:", senderId);
        activeTicket = await this.getActiveTicketForUser(senderId);
        if (activeTicket) {
          console.log("📝 Asociando mensaje al ticket activo:", activeTicket.id);
        } else {
          console.log("📝 No hay ticket activo, creando nuevo ticket");
          isNewTicket = true;
        }
      }

      console.log("📝 Estado del mensaje:", { isNewTicket, activeTicketId: activeTicket?.id });

      // Crear y guardar el mensaje
               const message = this.messageRepository.create({
           content,
           sender,
           recipient,
           sent_at: new Date(), // Usar fecha local
           read: false,
        status: isNewTicket ? "open" : "message", // "open" para tickets nuevos, "message" para mensajes normales
        ticket_id: activeTicket ? activeTicket.id : (isNewTicket ? "temp" : null), // Asignar ticket_id si hay ticket activo o temp para nuevos
         });

      await this.messageRepository.save(message);

      // Si es un ticket nuevo, establecer el ticket_id como su propio ID
      if (isNewTicket) {
        message.ticket_id = message.id;
        await this.messageRepository.save(message);
        console.log("🎫 Nuevo ticket creado:", message.id);
      }

      // Cargar el mensaje con las relaciones para retornarlo completo
      const savedMessage = await this.messageRepository.findOne({
        where: { id: message.id },
        relations: ["sender", "recipient"],
      });

      // Asegurar que el senderId y recipientId estén presentes
      if (savedMessage) {
        (savedMessage as any).senderId = savedMessage.sender?.id;
        (savedMessage as any).recipientId = savedMessage.recipient?.id;
      }

      return savedMessage;
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async markAsRead(id: string): Promise<Message> {
    try {
      const message = await this.messageRepository.findOne({ where: { id } });

      if (!message) {
        throw new NotFoundException(`Message with ID ${id} not found`);
      }

      // Marcar como leído y establecer la fecha de lectura
      message.read = true;
      message.read_at = new Date();

      await this.messageRepository.save(message);

      // Cargar el mensaje con las relaciones para retornarlo completo
      const savedMessage = await this.messageRepository.findOne({
        where: { id: message.id },
        relations: ["sender", "recipient"],
      });

      // Asegurar que el senderId y recipientId estén presentes
      if (savedMessage) {
        (savedMessage as any).senderId = savedMessage.sender?.id;
        (savedMessage as any).recipientId = savedMessage.recipient?.id;
      }

      return savedMessage;
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async findAll(
    paginationDto: PaginationDto,
  ): Promise<PaginationResponse<Message>> {
    try {
      const { page = 1, limit = 10 } = paginationDto;
      const skip = (page - 1) * limit;

      const [data, total] = await this.messageRepository.findAndCount({
        relations: ["sender", "recipient"],
        skip,
        take: limit,
        order: { sent_at: "DESC" },
      });

      const totalPages = Math.ceil(total / limit);

      return {
        data,
        meta: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      };
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async findBetweenUsers(
    user1Id: number,
    user2Id: number,
    paginationDto: PaginationDto,
  ): Promise<PaginationResponse<Message>> {
    try {
      const { page = 1, limit = 10 } = paginationDto;
      const skip = (page - 1) * limit;

      // Consulta para obtener mensajes entre dos usuarios (en ambas direcciones)
      const queryBuilder = this.messageRepository
        .createQueryBuilder("message")
        .leftJoinAndSelect("message.sender", "sender")
        .leftJoinAndSelect("message.recipient", "recipient")
        .where(
          "(message.sender.id = :user1Id AND message.recipient.id = :user2Id) OR " +
            "(message.sender.id = :user2Id AND message.recipient.id = :user1Id)",
          { user1Id, user2Id },
        )
        .orderBy("message.sent_at", "DESC")
        .skip(skip)
        .take(limit);

      const [data, total] = await queryBuilder.getManyAndCount();
      const totalPages = Math.ceil(total / limit);

      return {
        data,
        meta: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      };
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async findUserConversations(userId: number): Promise<any[]> {
    try {
      // Obtener todos los usuarios con los que el usuario actual tiene conversaciones
      const queryBuilder = this.messageRepository
        .createQueryBuilder("message")
        .select(
          "DISTINCT CASE WHEN message.sender.id = :userId THEN message.recipient.id ELSE message.sender.id END",
          "userId",
        )
        .where(
          "message.sender.id = :userId OR message.recipient.id = :userId",
          { userId },
        )
        .getRawMany();

      const conversations = await queryBuilder;

      // Para cada conversación, obtener el último mensaje y el usuario
      const result = [];
      for (const conv of conversations) {
        const otherUserId = conv.userId;

        // Obtener el otro usuario
        const otherUser = await this.userRepository.findOne({
          where: { id: otherUserId },
        });

        // Obtener el último mensaje entre los usuarios
        const lastMessage = await this.messageRepository
          .createQueryBuilder("message")
          .leftJoinAndSelect("message.sender", "sender")
          .leftJoinAndSelect("message.recipient", "recipient")
          .where(
            "(message.sender.id = :userId AND message.recipient.id = :otherUserId) OR " +
              "(message.sender.id = :otherUserId AND message.recipient.id = :userId)",
            { userId, otherUserId },
          )
          .orderBy("message.sent_at", "DESC")
          .getOne();

        if (otherUser && lastMessage) {
          result.push({
            user: otherUser,
            lastMessage,
            unreadCount: await this.countUnreadMessages(userId, otherUserId),
          });
        }
      }

      // Agregar conversación con Suarec (ID 0) si existe algún mensaje Y no está ya en la lista
      const suarecLastMessage = await this.messageRepository
        .createQueryBuilder("message")
        .leftJoinAndSelect("message.sender", "sender")
        .leftJoinAndSelect("message.recipient", "recipient")
        .where(
          "(message.sender.id = :userId AND message.recipient.id = 0) OR " +
            "(message.sender.id = 0 AND message.recipient.id = :userId)",
          { userId },
        )
        .orderBy("message.sent_at", "DESC")
        .getOne();

      if (suarecLastMessage) {
        // Verificar si ya existe una conversación con Suarec en la lista
        const suarecExists = result.some(conv => conv.user.id === 0);
        
        if (!suarecExists) {
          // Crear objeto de usuario Suarec
          const suarecUser = {
            id: 0,
            name: "Suarec",
            email: "soporte@suarec.com",
            profile_image: null,
            // Agregar otros campos necesarios
          };

          result.push({
            user: suarecUser,
            lastMessage: suarecLastMessage,
            unreadCount: await this.countUnreadMessages(userId, 0),
          });
        }
      }

      console.log("📋 Conversaciones encontradas:", result.map(conv => ({
        userId: conv.user.id,
        userName: conv.user.name,
        lastMessageId: conv.lastMessage?.id
      })));

      return result;
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async getSupportTickets(
    paginationDto: PaginationDto,
  ): Promise<PaginationResponse<Message>> {
    try {
      const { page = 1, limit = 10 } = paginationDto;
      const skip = (page - 1) * limit;

      // Obtener solo los tickets iniciales (donde id = ticket_id)
      const queryBuilder = this.messageRepository
        .createQueryBuilder("message")
        .leftJoinAndSelect("message.sender", "sender")
        .leftJoinAndSelect("message.recipient", "recipient")
        .where("message.recipient.id = :suarecId", { suarecId: 0 })
        .andWhere("CAST(message.id AS VARCHAR) = message.ticket_id") // Solo tickets iniciales
        .orderBy("message.sent_at", "DESC")
        .skip(skip)
        .take(limit);

      const [data, total] = await queryBuilder.getManyAndCount();
      const totalPages = Math.ceil(total / limit);

      return {
        data,
        meta: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      };
    } catch (error) {
      this.handleDBErrors(error);
    }
  }



  // Crear un nuevo ticket
  async createTicket(userId: number, content: string): Promise<Message> {
    try {
      // Crear el mensaje inicial del ticket
      const ticket = await this.messageRepository.save({
        content,
        sender: { id: userId },
        recipient: { id: 0 },
        status: "open", // Cambiar a "open" para tickets nuevos
        ticket_id: null, // Se establecerá después
      });

      // Establecer el ticket_id como su propio ID
      ticket.ticket_id = ticket.id;
      await this.messageRepository.save(ticket);

      // Crear el mensaje automático de respuesta
      const autoResponse = await this.messageRepository.save({
        content: `🎫 **Ticket #${ticket.id}** creado exitosamente.\n\nHemos recibido tu solicitud y nuestro equipo de soporte te responderá pronto.`,
        sender: { id: 0 },
        recipient: { id: userId },
        status: "message",
        ticket_id: ticket.id,
      });

      console.log(`🎫 Ticket creado: ${ticket.id}`);
      console.log(`📨 Auto-response creado: ${autoResponse.id} con ticket_id: ${autoResponse.ticket_id}`);

      return ticket;
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  // Obtener todos los mensajes de un ticket específico
  async getTicketMessages(ticketId: string): Promise<Message[]> {
    try {
      // Verificar que el ticket existe
      const ticket = await this.messageRepository.findOne({
        where: { id: ticketId },
        relations: ["sender", "recipient"],
      });

      if (!ticket) {
        throw new NotFoundException(`Ticket with ID ${ticketId} not found`);
      }

      // Obtener todos los mensajes asociados a este ticket
      const messages = await this.messageRepository.find({
        where: { ticket_id: ticketId },
        relations: ["sender", "recipient"],
        order: { sent_at: "ASC" },
      });

      console.log(`📋 Ticket ${ticketId} - Mensajes encontrados:`, messages.length);
      console.log(`📋 Mensajes con fechas:`, messages.map(m => `${m.id}: ${m.content} (${m.sent_at})`));

      return messages;
    } catch (error) {
      this.handleDBErrors(error);
    }
  }



  // Obtener el ticket activo de un usuario
  async getActiveTicketForUser(userId: number): Promise<Message | null> {
    try {
      console.log("🔍 Ejecutando consulta para usuario:", userId);
      
      // Primero, buscar todos los mensajes del usuario a Suarec para debuggear
      const allMessages = await this.messageRepository
        .createQueryBuilder("message")
        .leftJoinAndSelect("message.sender", "sender")
        .leftJoinAndSelect("message.recipient", "recipient")
        .where("message.sender.id = :userId", { userId })
        .andWhere("message.recipient.id = 0")
        .orderBy("message.sent_at", "DESC")
        .getMany();
      
      console.log("📋 Todos los mensajes del usuario a Suarec:", allMessages.map(m => ({
        id: m.id,
        status: m.status,
        ticket_id: m.ticket_id,
        content: m.content.substring(0, 50)
      })));
      
      // Buscar el ticket más reciente usando query builder
      const ticket = await this.messageRepository
        .createQueryBuilder("message")
        .leftJoinAndSelect("message.sender", "sender")
        .leftJoinAndSelect("message.recipient", "recipient")
        .where("message.sender.id = :userId", { userId })
        .andWhere("message.recipient.id = 0")
        .andWhere("CAST(message.id AS VARCHAR) = message.ticket_id") // Comparar UUID con VARCHAR usando CAST
        .andWhere("message.status = 'open'") // Solo tickets abiertos
        .orderBy("message.sent_at", "DESC")
        .getOne();
      
      console.log(`🎫 Buscando ticket activo para usuario ${userId}:`, ticket ? `Encontrado (${ticket.id}) - Status: ${ticket.status} - Ticket ID: ${ticket.ticket_id}` : "No encontrado");
      
      return ticket;
    } catch (error) {
      console.error("❌ Error en getActiveTicketForUser:", error);
      this.handleDBErrors(error);
    }
  }

  // Agregar mensaje a un ticket existente
  async addMessageToTicket(ticketId: string, userId: number, content: string): Promise<Message> {
    try {
      console.log(`🎫 Agregando mensaje al ticket ${ticketId} para usuario ${userId}:`, content);
      
      // Verificar que el ticket existe y está abierto
      const ticket = await this.messageRepository.findOne({
        where: { id: ticketId, status: "open" },
      });

      if (!ticket) {
        console.log(`❌ Ticket activo con ID ${ticketId} no encontrado`);
        throw new NotFoundException(`Active ticket with ID ${ticketId} not found`);
      }

      console.log(`✅ Ticket encontrado:`, ticket.id, ticket.status);

      // Crear el nuevo mensaje asociado al ticket
      const messageData = {
        content,
        sender: { id: userId },
        recipient: { id: 0 },
        status: "message",
        ticket_id: ticketId,
      };
      
      console.log(`📝 Creando mensaje con datos:`, messageData);
      
      const message = await this.messageRepository.save(messageData);
      console.log(`💾 Mensaje guardado en BD:`, message.id);

      // Cargar el mensaje con las relaciones para devolverlo completo
      const savedMessage = await this.messageRepository.findOne({
        where: { id: message.id },
        relations: ["sender", "recipient"],
      });

      console.log(`📨 Mensaje agregado al ticket ${ticketId}: ${savedMessage?.id} con ticket_id: ${savedMessage?.ticket_id}`);
      console.log(`📨 Mensaje completo:`, JSON.stringify(savedMessage, null, 2));

      return savedMessage;
    } catch (error) {
      console.error(`❌ Error en addMessageToTicket:`, error);
      this.handleDBErrors(error);
    }
  }

  // Responder como admin a un ticket
  async respondToTicket(ticketId: string, content: string): Promise<Message> {
    try {
      // Verificar que el ticket existe (no importa el status)
      const ticket = await this.messageRepository.findOne({
        where: { id: ticketId },
        relations: ["sender", "recipient"],
      });

      if (!ticket) {
        throw new NotFoundException(`Ticket with ID ${ticketId} not found`);
      }

      // Crear la respuesta del admin asociada al ticket
      const message = await this.messageRepository.save({
        content,
        sender: { id: 0 }, // Suarec
        recipient: { id: ticket.sender.id },
        status: "message",
        ticket_id: ticketId,
      });

      // Cargar el mensaje con las relaciones para devolverlo completo
      const savedMessage = await this.messageRepository.findOne({
        where: { id: message.id },
        relations: ["sender", "recipient"],
      });

      console.log(`📨 Respuesta de admin al ticket ${ticketId}: ${savedMessage?.id} con ticket_id: ${savedMessage?.ticket_id}`);

      return savedMessage;
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  // Actualizar el estado de un ticket
  async updateTicketStatus(ticketId: string, status: string): Promise<Message> {
    try {
      // Buscar el ticket por su ID (donde ticket_id es igual a su propio id)
      const ticket = await this.messageRepository.findOne({
        where: { 
          id: ticketId,
          ticket_id: ticketId // El ticket inicial tiene ticket_id igual a su propio id
        },
        relations: ["sender", "recipient"],
      });
      
      if (!ticket) {
        throw new NotFoundException(`Ticket with ID ${ticketId} not found`);
      }

      // Solo permitir actualizar tickets de soporte (donde Suarec es el destinatario)
      if (ticket.recipient.id !== 0) {
        throw new BadRequestException("Only support tickets can have their status updated");
      }

      ticket.status = status;
      await this.messageRepository.save(ticket);

      console.log(`🎫 Ticket ${ticketId} actualizado a estado: ${status}`);

      // Emitir evento de cambio de estado del ticket
      if (ticket.sender && ticket.sender.id) {
        // Notificar al usuario que su ticket ha cambiado de estado
        this.server?.to(`user_${ticket.sender.id}`).emit("ticket_status_changed", {
          ticketId: ticketId,
          status: status,
        });
        
        console.log(`📡 Evento ticket_status_changed emitido para usuario ${ticket.sender.id}`);
      }

      return ticket;
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async countUnreadMessages(userId: number, senderId: number): Promise<number> {
    try {
      const count = await this.messageRepository.count({
        where: {
          recipient: { id: userId },
          sender: { id: senderId },
          read: false,
        },
      });

      return count;
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async findOne(id: string): Promise<Message> {
    try {
      const message = await this.messageRepository.findOne({
        where: { id },
        relations: ["sender", "recipient"],
      });

      if (!message) {
        throw new NotFoundException(`Message with ID ${id} not found`);
      }

      return message;
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async update(
    id: string,
    updateMessageDto: UpdateMessageDto,
  ): Promise<Message> {
    try {
      const message = await this.findOne(id);

      // Solo permitir actualizar ciertos campos
      if (updateMessageDto.read !== undefined) {
        message.read = updateMessageDto.read;
      }

      if (updateMessageDto.read_at) {
        message.read_at = updateMessageDto.read_at;
      }

      await this.messageRepository.save(message);
      return message;
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async remove(id: string): Promise<void> {
    try {
      const message = await this.findOne(id);
      await this.messageRepository.remove(message);
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  private handleDBErrors(error: any) {
    this.logger.error(error);

    if (error.status === 400) {
      throw new BadRequestException(error.response.message);
    }

    if (error instanceof NotFoundException) {
      throw error;
    }

    if (error.code === "23505") {
      throw new BadRequestException(error.detail);
    }

    throw new InternalServerErrorException(
      "Unexpected error, check server logs",
    );
  }

  // Método para emitir mensaje manualmente (para respuestas de admin)
  async createAndEmit(createMessageDto: CreateMessageDto, gateway: any): Promise<Message> {
    try {
      console.log("📝 createAndEmit llamado con:", createMessageDto);
      const message = await this.create(createMessageDto);
      
      // Emitir el mensaje al destinatario
      const recipientRoom = `user_${createMessageDto.recipientId}`;
      const messageData = {
        message,
        conversationId: `${Math.min(createMessageDto.senderId, createMessageDto.recipientId)}_${Math.max(createMessageDto.senderId, createMessageDto.recipientId)}`,
      };

      console.log("📤 Emitiendo mensaje manualmente a:", recipientRoom);
      gateway.server.to(recipientRoom).emit("new_message", messageData);
      
      // Emitir actualización de conversación
      gateway.server.to(`user_${createMessageDto.recipientId}`).emit("conversation_updated", {
        conversationId: `${Math.min(createMessageDto.senderId, createMessageDto.recipientId)}_${Math.max(createMessageDto.senderId, createMessageDto.recipientId)}`,
        lastMessage: message,
      });

      return message;
    } catch (error) {
      this.handleDBErrors(error);
    }
  }
}
