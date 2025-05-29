import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { MessageService } from './message.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { AuthGuard } from '../auth/guard/auth.guard';
import { RolesGuard } from '../auth/guard/roles.guard';
import { Roles } from '../auth/decorators/role.decorator';
import { Message } from './entities/message.entity';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginationResponse } from '../common/interfaces/paginated-response.interface';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';

@ApiTags('Messages')
@Controller('messages')
@UseGuards(AuthGuard, RolesGuard)
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Post()
  @Roles('ADMIN', 'PERSON', 'BUSINESS')
  @ApiOperation({ summary: 'Create a new message' })
  @ApiResponse({ status: 201, description: 'Message created successfully' })
  create(@Body() createMessageDto: CreateMessageDto): Promise<Message> {
    return this.messageService.create(createMessageDto);
  }

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get all messages with pagination (admin only)' })
  @ApiQuery({ type: PaginationDto })
  findAll(@Query() paginationDto: PaginationDto): Promise<PaginationResponse<Message>> {
    return this.messageService.findAll(paginationDto);
  }

  @Get('conversations/:userId')
  @Roles('ADMIN', 'PERSON', 'BUSINESS')
  @ApiOperation({ summary: 'Get all conversations for a user' })
  findUserConversations(@Param('userId') userId: string): Promise<any[]> {
    return this.messageService.findUserConversations(+userId);
  }

  @Get('between/:user1Id/:user2Id')
  @Roles('ADMIN', 'PERSON', 'BUSINESS')
  @ApiOperation({ summary: 'Get messages between two users' })
  @ApiQuery({ type: PaginationDto })
  findBetweenUsers(
    @Param('user1Id') user1Id: string,
    @Param('user2Id') user2Id: string,
    @Query() paginationDto: PaginationDto
  ): Promise<PaginationResponse<Message>> {
    return this.messageService.findBetweenUsers(+user1Id, +user2Id, paginationDto);
  }

  @Get('unread/:userId/:senderId')
  @Roles('ADMIN', 'PERSON', 'BUSINESS')
  @ApiOperation({ summary: 'Count unread messages from a specific sender' })
  countUnreadMessages(
    @Param('userId') userId: string,
    @Param('senderId') senderId: string
  ): Promise<number> {
    return this.messageService.countUnreadMessages(+userId, +senderId);
  }

  @Get(':id')
  @Roles('ADMIN', 'PERSON', 'BUSINESS')
  @ApiOperation({ summary: 'Get a message by id' })
  findOne(@Param('id') id: string): Promise<Message> {
    return this.messageService.findOne(id);
  }

  @Patch(':id/read')
  @Roles('ADMIN', 'PERSON', 'BUSINESS')
  @ApiOperation({ summary: 'Mark a message as read' })
  markAsRead(@Param('id') id: string): Promise<Message> {
    return this.messageService.markAsRead(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'PERSON', 'BUSINESS')
  @ApiOperation({ summary: 'Update a message' })
  update(@Param('id') id: string, @Body() updateMessageDto: UpdateMessageDto): Promise<Message> {
    return this.messageService.update(id, updateMessageDto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete a message (admin only)' })
  remove(@Param('id') id: string): Promise<void> {
    return this.messageService.remove(id);
  }
}