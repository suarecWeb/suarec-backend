// src/comment/comment.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommentService } from './services/comment.service';
import { CommentController } from './controllers/comment.controller';
import { Comment } from './entities/comment.entity';
import { User } from '../user/entities/user.entity';
import { Publication } from '../publication/entities/publication.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Comment, User, Publication])],
  controllers: [CommentController],
  providers: [CommentService],
  exports: [CommentService],
})
export class CommentModule {}
