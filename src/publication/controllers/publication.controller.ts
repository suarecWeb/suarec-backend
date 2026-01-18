import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseIntPipe,
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
import { Public } from "../../auth/decorators/public.decorator";
import { Publication } from "../entities/publication.entity";
import { PublicationType } from "../entities/publication.entity";
import { PaginationResponse } from "../../common/interfaces/paginated-response.interface";
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from "@nestjs/swagger";

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
  @Public()
  @ApiOperation({ summary: "Get all publications with advanced filtering and pagination (Public)" })
  @ApiQuery({ type: PaginationDto })
  findAll(
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginationResponse<Publication>> {
    return this.publicationService.findAll(paginationDto) as Promise<
      PaginationResponse<Publication>
    >;
  }

  @Get("me")
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "Get publications created by the current user" })
  @ApiQuery({ type: PaginationDto })
  findMyPublications(
    @Request() req,
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginationResponse<Publication>> {
    return this.publicationService.findAll(paginationDto, req.user.id);
  }

  @Get("user/:id")
  @Public()
  @ApiOperation({ summary: "Get publications created by a user (Public)" })
  @ApiParam({ name: "id", description: "User ID" })
  @ApiQuery({ type: PaginationDto })
  findPublicationsByUser(
    @Param("id", ParseIntPipe) id: number,
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginationResponse<Publication>> {
    return this.publicationService.findAll(paginationDto, id);
  }

  @Get("service-offers")
  @Public()
  @ApiOperation({ summary: "Get service offers only (Public)" })
  @ApiQuery({ type: PaginationDto })
  findServiceOffers(
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginationResponse<Publication>> {
    return this.publicationService.findServiceOffers(paginationDto) as Promise<
      PaginationResponse<Publication>
    >;
  }

  @Get("service-requests")
  @Public()
  @ApiOperation({ summary: "Get service requests only (Public)" })
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
  @Public()
  @ApiOperation({ summary: "Get a publication by id (Public)" })
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

  @Get("filters/categories")
  @Public()
  @ApiOperation({ summary: "Get available categories for filtering (Public)" })
  @ApiResponse({ status: 200, description: "List of available categories" })
  getAvailableCategories(): Promise<string[]> {
    return this.publicationService.getAvailableCategories();
  }

  @Get("filters/types")
  @Public()
  @ApiOperation({ summary: "Get available publication types for filtering (Public)" })
  @ApiResponse({ status: 200, description: "List of available publication types" })
  getAvailableTypes(): Promise<PublicationType[]> {
    return this.publicationService.getAvailableTypes();
  }

  @Get(":id/comments")
  @Public()
  @ApiOperation({ summary: "Get comments for a specific publication (Public)" })
  @ApiResponse({ status: 200, description: "List of comments for the publication" })
  getPublicationComments(@Param("id") id: string) {
    return this.publicationService.getPublicationComments(id);
  }
}
