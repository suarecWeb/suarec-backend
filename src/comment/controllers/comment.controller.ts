import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { CommentService } from '../services/comment.service';
import { CreateCommentDto } from '../dto/create-comment.dto';
import { UpdateCommentDto } from '../dto/update-comment.dto';
import { AuthGuard } from '../../auth/guard/auth.guard';
import { Role } from '../../users/entities/roles.enum';
import { RolesGuard } from '../../auth/guard/roles.guard';
import { Roles } from '../../auth/decorators/role.decorator';
import { Comment } from '../entities/comment.entity';

@Controller('comments')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Post()
  @Roles(Role.ADMIN, Role.USER)
  @UseGuards(AuthGuard, RolesGuard)
  create(@Body() createCommentDto: CreateCommentDto): Promise<Comment> {
    return this.commentService.create(createCommentDto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.USER)
  @UseGuards(AuthGuard, RolesGuard)
  findAll(): Promise<Comment[]> {
    return this.commentService.findAll();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.USER)
  @UseGuards(AuthGuard, RolesGuard)
  findOne(@Param('id') id: string): Promise<Comment> {
    return this.commentService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.USER)
  @UseGuards(AuthGuard, RolesGuard)
  update(@Param('id') id: string, @Body() updateCommentDto: UpdateCommentDto): Promise<Comment> {
    return this.commentService.update(id, updateCommentDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  remove(@Param('id') id: string): Promise<void> {
    return this.commentService.remove(id);
  }
}
