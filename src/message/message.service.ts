import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './entities/message.entity';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { User } from '../user/entities/user.entity';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginationResponse } from '../common/interfaces/paginated-response.interface';

@Injectable()
export class MessageService {
  private readonly logger = new Logger('MessageService');

  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createMessageDto: CreateMessageDto): Promise<Message> {
    try {
      const { senderId, recipientId, content } = createMessageDto;

      // Verificar que el remitente existe
      const sender = await this.userRepository.findOne({ where: { id: senderId } });
      if (!sender) {
        throw new BadRequestException(`Sender with ID ${senderId} not found`);
      }

      // Verificar que el destinatario existe
      const recipient = await this.userRepository.findOne({ where: { id: recipientId } });
      if (!recipient) {
        throw new BadRequestException(`Recipient with ID ${recipientId} not found`);
      }

      // Crear y guardar el mensaje
      const message = this.messageRepository.create({
        content,
        sender,
        recipient,
        sent_at: new Date(),
        read: false,
      });

      await this.messageRepository.save(message);
      
      // Cargar el mensaje con las relaciones para retornarlo completo
      const savedMessage = await this.messageRepository.findOne({
        where: { id: message.id },
        relations: ['sender', 'recipient'],
      });
      
      // Debug: Log para verificar que las relaciones están correctas
      console.log('Mensaje creado:', {
        id: savedMessage.id,
        content: savedMessage.content,
        senderId: savedMessage.sender?.id,
        senderName: savedMessage.sender?.name,
        recipientId: savedMessage.recipient?.id,
        recipientName: savedMessage.recipient?.name,
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
        relations: ['sender', 'recipient'],
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

  async findAll(paginationDto: PaginationDto): Promise<PaginationResponse<Message>> {
    try {
      const { page = 1, limit = 10 } = paginationDto;
      const skip = (page - 1) * limit;

      const [data, total] = await this.messageRepository.findAndCount({
        relations: ['sender', 'recipient'],
        skip,
        take: limit,
        order: { sent_at: 'DESC' },
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
    paginationDto: PaginationDto
  ): Promise<PaginationResponse<Message>> {
    try {
      const { page = 1, limit = 10 } = paginationDto;
      const skip = (page - 1) * limit;

      // Consulta para obtener mensajes entre dos usuarios (en ambas direcciones)
      const queryBuilder = this.messageRepository.createQueryBuilder('message')
        .leftJoinAndSelect('message.sender', 'sender')
        .leftJoinAndSelect('message.recipient', 'recipient')
        .where(
          '(message.sender.id = :user1Id AND message.recipient.id = :user2Id) OR ' +
          '(message.sender.id = :user2Id AND message.recipient.id = :user1Id)',
          { user1Id, user2Id }
        )
        .orderBy('message.sent_at', 'DESC')
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
      const queryBuilder = this.messageRepository.createQueryBuilder('message')
        .select('DISTINCT CASE WHEN message.sender.id = :userId THEN message.recipient.id ELSE message.sender.id END', 'userId')
        .where('message.sender.id = :userId OR message.recipient.id = :userId', { userId })
        .getRawMany();

      const conversations = await queryBuilder;
      
      // Para cada conversación, obtener el último mensaje y el usuario
      const result = [];
      for (const conv of conversations) {
        const otherUserId = conv.userId;
        
        // Obtener el otro usuario
        const otherUser = await this.userRepository.findOne({ where: { id: otherUserId } });
        
        // Obtener el último mensaje entre los usuarios
        const lastMessage = await this.messageRepository.createQueryBuilder('message')
          .leftJoinAndSelect('message.sender', 'sender')
          .leftJoinAndSelect('message.recipient', 'recipient')
          .where(
            '(message.sender.id = :userId AND message.recipient.id = :otherUserId) OR ' +
            '(message.sender.id = :otherUserId AND message.recipient.id = :userId)',
            { userId, otherUserId }
          )
          .orderBy('message.sent_at', 'DESC')
          .getOne();
        
        if (otherUser && lastMessage) {
          result.push({
            user: otherUser,
            lastMessage,
            unreadCount: await this.countUnreadMessages(userId, otherUserId),
          });
        }
      }
      
      return result;
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
        relations: ['sender', 'recipient'],
      });

      if (!message) {
        throw new NotFoundException(`Message with ID ${id} not found`);
      }

      return message;
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async update(id: string, updateMessageDto: UpdateMessageDto): Promise<Message> {
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

    if (error.code === '23505') {
      throw new BadRequestException(error.detail);
    }

    throw new InternalServerErrorException('Unexpected error, check server logs');
  }
}