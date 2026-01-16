import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PublicationService } from "../publication/services/publication.service";
import { PublicationController } from "../publication/controllers/publication.controller";
import { PublicationLikeController } from "./publication-like.controller";
import { PublicationLikeService } from "./services/publication-like.service";
import { Publication } from "./entities/publication.entity";
import { PublicationLike } from "./entities/publication-like.entity";
import { User } from "../user/entities/user.entity";
import { Application } from "../application/entities/application.entity";
import { Comment } from "../comment/entities/comment.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([Publication, PublicationLike, User, Application, Comment]),
  ],
  controllers: [PublicationController, PublicationLikeController],
  providers: [PublicationService, PublicationLikeService],
  exports: [PublicationService, PublicationLikeService],
})
export class PublicationModule {}
