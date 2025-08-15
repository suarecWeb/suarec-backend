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
import { PublicationService } from "../services/publication.service";
import { CreatePublicationDto } from "../dto/create-publication.dto";
import { UpdatePublicationDto } from "../dto/update-publication.dto";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { AuthGuard } from "../../auth/guard/auth.guard";
import { RolesGuard } from "../../auth/guard/roles.guard";
import { Roles } from "../../auth/decorators/role.decorator";
import { Publication } from "../entities/publication.entity";
import { PublicationType } from "../entities/publication.entity";
import { PaginationResponse } from "../../common/interfaces/paginated-response.interface";
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from "@nestjs/swagger";

@ApiTags("Publications")
@Controller("publications")
export class PublicationController {
  constructor(private readonly publicationService: PublicationService) {} // eslint-disable-line no-unused-vars

  @Post()
  @Roles("ADMIN", "PERSON", "BUSINESS")
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: "Create a new publication" })
  @ApiResponse({ status: 201, description: "Publication created successfully" })
  create(
    @Body() createPublicationDto: CreatePublicationDto,
  ): Promise<Publication> {
    return this.publicationService.create(createPublicationDto);
  }

  @Get()
  @Roles("ADMIN", "BUSINESS", "PERSON")
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: "Get all publications with pagination" })
  @ApiQuery({ type: PaginationDto })
  findAll(
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginationResponse<Publication>> {
    console.log("🔍 Controller - Received type:", paginationDto.type);
    console.log("🔍 Controller - Type is valid enum:", Object.values(PublicationType).includes(paginationDto.type as PublicationType));
    return this.publicationService.findAll(paginationDto, paginationDto.type as PublicationType) as Promise<
      PaginationResponse<Publication>
    >;
  }

  @Get("service-offers")
  @Roles("ADMIN", "BUSINESS", "PERSON")
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: "Get service offers only" })
  @ApiQuery({ type: PaginationDto })
  findServiceOffers(
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginationResponse<Publication>> {
    return this.publicationService.findServiceOffers(paginationDto) as Promise<
      PaginationResponse<Publication>
    >;
  }

  @Get("service-requests")
  @Roles("ADMIN", "BUSINESS", "PERSON")
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: "Get service requests only" })
  @ApiQuery({ type: PaginationDto })
  findServiceRequests(
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginationResponse<Publication>> {
    return this.publicationService.findServiceRequests(paginationDto) as Promise<
      PaginationResponse<Publication>
    >;
  }

  @Get("deleted")
  @Roles("ADMIN")
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: "Get all deleted publications (Admin only)" })
  @ApiQuery({ type: PaginationDto })
  findDeleted(
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginationResponse<Publication>> {
    return this.publicationService.findDeleted(paginationDto) as Promise<
      PaginationResponse<Publication>
    >;
  }

  @Get(":id")
  @Roles("ADMIN", "BUSINESS", "PERSON")
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: "Get a publication by id" })
  findOne(@Param("id") id: string): Promise<Publication> {
    return this.publicationService.findOne(id);
  }

  @Patch(":id")
  @Roles("ADMIN", "BUSINESS", "PERSON")
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: "Update a publication" })
  update(
    @Param("id") id: string,
    @Body() updatePublicationDto: UpdatePublicationDto,
    @Request() req,
  ): Promise<Publication> {
    return this.publicationService.update(id, updatePublicationDto, req.user);
  }

  @Delete(":id")
  @Roles("ADMIN", "BUSINESS", "PERSON")
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: "Soft delete a publication" })
  remove(@Param("id") id: string, @Request() req): Promise<void> {
    return this.publicationService.remove(id, req.user);
  }

  @Post(":id/restore")
  @Roles("ADMIN")
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: "Restore a deleted publication (Admin only)" })
  restore(@Param("id") id: string, @Request() req): Promise<Publication> {
    return this.publicationService.restore(id, req.user);
  }
}
