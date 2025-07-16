import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Body,
  UseGuards,
  Request,
} from "@nestjs/common";
import { PublicationLikeService } from "./services/publication-like.service";
import { CreatePublicationLikeDto } from "./dto/create-publication-like.dto";
import { AuthGuard } from "../auth/guard/auth.guard";

@Controller("publications")
@UseGuards(AuthGuard)
export class PublicationLikeController {
  constructor(
    private readonly publicationLikeService: PublicationLikeService,
  ) {}

  // Dar like a una publicación
  @Post(":id/like")
  async likePublication(@Param("id") publicationId: string, @Request() req) {
    const createLikeDto: CreatePublicationLikeDto = {
      userId: req.user.id,
      publicationId,
    };

    return await this.publicationLikeService.likePublication(createLikeDto);
  }

  // Quitar like de una publicación
  @Delete(":id/like")
  async unlikePublication(@Param("id") publicationId: string, @Request() req) {
    await this.publicationLikeService.unlikePublication(
      req.user.id,
      publicationId,
    );
    return { message: "Like removido exitosamente" };
  }

  // Obtener likes de una publicación
  @Get(":id/likes")
  async getPublicationLikes(@Param("id") publicationId: string) {
    return await this.publicationLikeService.getPublicationLikes(publicationId);
  }

  // Contar likes de una publicación
  @Get(":id/likes/count")
  async getPublicationLikesCount(@Param("id") publicationId: string) {
    const count =
      await this.publicationLikeService.getPublicationLikesCount(publicationId);
    return { count };
  }

  // Verificar si el usuario actual dio like
  @Get(":id/like/check")
  async checkUserLike(@Param("id") publicationId: string, @Request() req) {
    const hasLiked = await this.publicationLikeService.hasUserLiked(
      req.user.id,
      publicationId,
    );
    return { hasLiked };
  }

  // Obtener likes del usuario actual
  @Get("user/likes")
  async getUserLikes(@Request() req) {
    return await this.publicationLikeService.getUserLikes(req.user.id);
  }
}
