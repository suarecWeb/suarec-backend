// src/rating/dto/update-rating.dto.ts
import { PartialType } from "@nestjs/mapped-types";
import { CreateRatingDto } from "./create-rating.dto";

export class UpdateRatingDto extends PartialType(CreateRatingDto) {
  // Solo se pueden actualizar stars y comment
  reviewerId?: never;
  revieweeId?: never;
  workContractId?: never;
}
