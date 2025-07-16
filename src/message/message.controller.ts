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
} from "@nestjs/common";
import { MessageService } from "./message.service";
import { CreateMessageDto } from "./dto/create-message.dto";
import { UpdateMessageDto } from "./dto/update-message.dto";
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
  ): Promise<PaginationResponse<Message>> {
    return this.messageService.findBetweenUsers(
      +user1Id,
      +user2Id,
      paginationDto,
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
