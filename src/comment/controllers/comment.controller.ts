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
import { CommentService } from "../services/comment.service";
import { CreateCommentDto } from "../dto/create-comment.dto";
import { UpdateCommentDto } from "../dto/update-comment.dto";
import { AuthGuard } from "../../auth/guard/auth.guard";
import { RolesGuard } from "../../auth/guard/roles.guard";
import { Roles } from "../../auth/decorators/role.decorator";
import { Comment } from "../entities/comment.entity";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { PaginationResponse } from "../../common/interfaces/paginated-response.interface";
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from "@nestjs/swagger";

@ApiTags("Comments")
@Controller("comments")
export class CommentController {
  constructor(private readonly commentService: CommentService) {} // eslint-disable-line no-unused-vars

  @Post()
  @Roles("ADMIN", "PERSON")
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: "Create a new comment" })
  @ApiResponse({ status: 201, description: "Comment created successfully" })
  create(@Body() createCommentDto: CreateCommentDto): Promise<Comment> {
    return this.commentService.create(createCommentDto);
  }

  @Get()
  @Roles("ADMIN", "PERSON", "BUSINESS")
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: "Get comments by publication id" })
  @ApiQuery({ type: PaginationDto })
  findByPublicationId(
    @Query() paginationDto: PaginationDto,
    @Param("id") publicationId: string,
  ): Promise<PaginationResponse<Comment>> {
    return this.commentService.findByPublicationId(
      paginationDto,
      publicationId,
    );
  }

  @Get("all")
  @Roles("ADMIN", "PERSON")
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: "Get all comments with pagination" })
  @ApiQuery({ type: PaginationDto })
  findAll(
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginationResponse<Comment>> {
    return this.commentService.findAll(paginationDto);
  }

  @Get("deleted")
  @Roles("ADMIN")
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: "Get all deleted comments (Admin only)" })
  @ApiQuery({ type: PaginationDto })
  findDeleted(
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginationResponse<Comment>> {
    return this.commentService.findDeleted(paginationDto);
  }

  @Get(":id")
  @Roles("ADMIN", "PERSON")
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: "Get a comment by id" })
  findOne(@Param("id") id: string): Promise<Comment> {
    return this.commentService.findOne(id);
  }

  @Patch(":id")
  @Roles("ADMIN", "PERSON")
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: "Update a comment" })
  update(
    @Param("id") id: string,
    @Body() updateCommentDto: UpdateCommentDto,
  ): Promise<Comment> {
    return this.commentService.update(id, updateCommentDto);
  }

  @Delete(":id")
  @Roles("ADMIN", "PERSON")
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: "Soft delete a comment" })
  remove(@Param("id") id: string, @Request() req): Promise<void> {
    return this.commentService.remove(id, req.user);
  }

  @Post(":id/restore")
  @Roles("ADMIN")
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: "Restore a deleted comment (Admin only)" })
  restore(@Param("id") id: string, @Request() req): Promise<Comment> {
    return this.commentService.restore(id, req.user);
  }
}
