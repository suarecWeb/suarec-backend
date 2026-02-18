import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Request,
} from "@nestjs/common";
import { MessageService } from "./message.service";
import { CreateMessageDto } from "./dto/create-message.dto";
import { UpdateMessageDto } from "./dto/update-message.dto";
import { UpdateTicketStatusDto } from "./dto/update-ticket-status.dto";
import { CreateTicketDto } from "./dto/create-ticket.dto";
import { AuthGuard } from "../auth/guard/auth.guard";
import { RolesGuard } from "../auth/guard/roles.guard";
import { Roles } from "../auth/decorators/role.decorator";
import { Message } from "./entities/message.entity";
import { PaginationDto } from "../common/dto/pagination.dto";
import { PaginationResponse } from "../common/interfaces/paginated-response.interface";
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from "@nestjs/swagger";
import { MessageGateway } from "./message.gateway";
import { Public } from "../auth/decorators/public.decorator";

@ApiTags("Messages")
@Controller("messages")
@UseGuards(AuthGuard, RolesGuard)
export class MessageController {
  constructor(
    private readonly messageService: MessageService, // eslint-disable-line no-unused-vars
    private readonly messageGateway: MessageGateway, // eslint-disable-line no-unused-vars
  ) {}

  @Post()
  @Roles("ADMIN", "PERSON", "BUSINESS")
  @ApiOperation({ summary: "Create a new message" })
  @ApiResponse({ status: 201, description: "Message created successfully" })
  create(@Body() createMessageDto: CreateMessageDto): Promise<Message> {
    return this.messageService.create(createMessageDto);
  }

  @Post("create-ticket")
  @Roles("PERSON", "BUSINESS")
  @ApiOperation({ summary: "Create a new support ticket" })
  @ApiResponse({ status: 201, description: "Ticket created successfully" })
  async createTicket(@Body() createTicketDto: CreateTicketDto): Promise<Message> {
    return this.messageService.createTicket(+createTicketDto.userId, createTicketDto.content);
  }

  @Post("add-to-ticket")
  @Roles("PERSON", "BUSINESS")
  @ApiOperation({ summary: "Add message to existing ticket" })
  @ApiResponse({ status: 201, description: "Message added to ticket successfully" })
  async addMessageToTicket(@Body() data: { ticketId: string; userId: number; content: string }): Promise<Message> {
    return this.messageService.addMessageToTicket(data.ticketId, data.userId, data.content);
  }

  @Post("admin-reply")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Send admin reply to support ticket" })
  @ApiResponse({ status: 201, description: "Admin reply sent successfully" })
  async sendAdminReply(@Body() data: { ticketId: string; content: string }): Promise<Message> {
    return this.messageService.respondToTicket(data.ticketId, data.content);
  }

  @Get("active-ticket/:userId")
  @Roles("ADMIN", "PERSON", "BUSINESS")
  @ApiOperation({ summary: "Get active ticket for a user" })
  @ApiResponse({ status: 200, description: "Active ticket retrieved successfully" })
  async getActiveTicket(@Param("userId") userId: string): Promise<Message | null> {
    return this.messageService.getActiveTicketForUser(+userId);
  }

  @Get("ticket/:ticketId/messages")
  @Roles("ADMIN", "PERSON", "BUSINESS")
  @ApiOperation({ summary: "Get all messages for a specific ticket" })
  @ApiResponse({ status: 200, description: "Ticket messages retrieved successfully" })
  async getTicketMessages(@Param("ticketId") ticketId: string): Promise<Message[]> {
    return this.messageService.getTicketMessages(ticketId);
  }

  @Patch(":id/status")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Update ticket status" })
  @ApiResponse({ status: 200, description: "Ticket status updated successfully" })
  async updateTicketStatus(
    @Param("id") id: string,
    @Body() updateTicketStatusDto: UpdateTicketStatusDto,
  ): Promise<Message> {
    return this.messageService.updateTicketStatus(id, updateTicketStatusDto.status);
  }

  @Get()
  @Roles("ADMIN")
  @ApiOperation({ summary: "Get all messages with pagination (admin only)" })
  @ApiQuery({ type: PaginationDto })
  findAll(
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginationResponse<Message>> {
    return this.messageService.findAll(paginationDto);
  }

  @Get("conversations/:userId")
  @Roles("ADMIN", "PERSON", "BUSINESS")
  @ApiOperation({ summary: "Get all conversations for a user" })
  findUserConversations(@Param("userId") userId: string): Promise<any[]> {
    return this.messageService.findUserConversations(+userId);
  }

  @Get("between/:user1Id/:user2Id")
  @Roles("ADMIN", "PERSON", "BUSINESS")
  @ApiOperation({ summary: "Get messages between two users" })
  @ApiQuery({ type: PaginationDto })
  findBetweenUsers(
    @Param("user1Id") user1Id: string,
    @Param("user2Id") user2Id: string,
    @Query() paginationDto: PaginationDto,
    @Request() req: any,
  ): Promise<PaginationResponse<Message>> {
    return this.messageService.findBetweenUsers(
      +user1Id,
      +user2Id,
      paginationDto,
      req?.user?.id,
    );
  }

  @Get("unread/:userId/:senderId")
  @Roles("ADMIN", "PERSON", "BUSINESS")
  @ApiOperation({ summary: "Count unread messages from a specific sender" })
  countUnreadMessages(
    @Param("userId") userId: string,
    @Param("senderId") senderId: string,
  ): Promise<number> {
    return this.messageService.countUnreadMessages(+userId, +senderId);
  }

  @Get("support-tickets")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Get all support tickets" })
  @ApiResponse({
    status: 200,
    description: "Support tickets retrieved successfully",
  })
  async getSupportTickets(@Query() paginationDto: PaginationDto) {
    return this.messageService.getSupportTickets(paginationDto);
  }

  @Get(":id")
  @Roles("ADMIN", "PERSON", "BUSINESS")
  @ApiOperation({ summary: "Get a message by id" })
  findOne(@Param("id") id: string): Promise<Message> {
    return this.messageService.findOne(id);
  }

  @Patch(":id/read")
  @Roles("ADMIN", "PERSON", "BUSINESS")
  @ApiOperation({ summary: "Mark a message as read" })
  markAsRead(@Param("id") id: string): Promise<Message> {
    return this.messageService.markAsRead(id);
  }

  @Patch("conversation/:userId/:senderId/read")
  @Roles("ADMIN", "PERSON", "BUSINESS")
  @ApiOperation({ summary: "Mark a conversation as read" })
  @ApiResponse({ status: 200, description: "Conversation marked as read" })
  markConversationAsRead(
    @Param("userId") userId: string,
    @Param("senderId") senderId: string,
  ): Promise<{ updated: number; readAt: Date }> {
    return this.messageService.markConversationAsRead(+userId, +senderId);
  }

  @Patch(":id")
  @Roles("ADMIN", "PERSON", "BUSINESS")
  @ApiOperation({ summary: "Update a message" })
  update(
    @Param("id") id: string,
    @Body() updateMessageDto: UpdateMessageDto,
  ): Promise<Message> {
    return this.messageService.update(id, updateMessageDto);
  }

  @Delete(":id")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Delete a message (admin only)" })
  remove(@Param("id") id: string): Promise<void> {
    return this.messageService.remove(id);
  }

  @Get("websocket/status")
  @Public()
  @ApiOperation({ summary: "Get WebSocket connection status" })
  @ApiResponse({
    status: 200,
    description: "WebSocket status retrieved successfully",
  })
  getWebSocketStatus() {
    return {
      success: true,
      ...this.messageGateway.getConnectionStats(),
    };
  }

  @Get("websocket/test")
  @Public()
  @ApiOperation({ summary: "Test WebSocket functionality" })
  @ApiResponse({
    status: 200,
    description: "WebSocket test completed successfully",
  })
  async testWebSocket() {
    try {
      // Crear un mensaje de prueba
      const testData = {
        message: {
          id: "test-message-" + Date.now(),
          content: "Mensaje de prueba del sistema",
          senderId: 1,
          recipientId: 2,
          sent_at: new Date(),
          sender: {
            id: 1,
            name: "Sistema",
            profile_image: null,
          },
        },
        conversationId: "1_2",
      };

      // Emitir el mensaje a través del WebSocket
      this.messageGateway.server.emit("new_message", testData);

      return {
        success: true,
        message: "Mensaje de prueba enviado",
        data: testData,
        connectionStats: this.messageGateway.getConnectionStats(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

}
