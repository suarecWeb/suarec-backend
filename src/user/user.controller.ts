import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
  Query,
  Patch,
  Request,
} from "@nestjs/common";
import { UserService } from "./user.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { Public } from "../auth/decorators/public.decorator";
import { RolesGuard } from "../auth/guard/roles.guard";
import { Roles } from "../auth/decorators/role.decorator";
import { PaginationDto } from "../common/dto/pagination.dto";
import { PaginationResponse } from "../common/interfaces/paginated-response.interface";
import { User } from "./entities/user.entity";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from "@nestjs/swagger";
import { AuthGuard } from "../auth/guard/auth.guard";
import { GalleryService } from "./services/gallery.service";
import {
  CreateGalleryImageDto,
  UpdateGalleryImageDto,
  UploadGalleryImagesDto,
} from "./dto/gallery.dto";
import { IdPhotosService } from "./services/id-photos.service";
import { CreateIdPhotoDto, ReviewIdPhotoDto, UpdateIdPhotoDto } from "./dto/id-photos.dto";

@ApiTags("Users")
@Controller("users")
@UseGuards(RolesGuard)
export class UserController {
  constructor(
    private readonly userService: UserService, // eslint-disable-line no-unused-vars
    private readonly galleryService: GalleryService, // eslint-disable-line no-unused-vars
    private readonly idPhotosService: IdPhotosService, // eslint-disable-line no-unused-vars
  ) {}

  @Public()
  @Post()
  @ApiOperation({ summary: "Create a new user" })
  @ApiResponse({ status: 201, description: "User created successfully" })
  async create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Roles("ADMIN")
  @Get()
  @ApiOperation({ summary: "Get all users with pagination" })
  @ApiQuery({ type: PaginationDto })
  findAll(
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginationResponse<User>> {
    return this.userService.findAll(paginationDto);
  }

  @Get("search")
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "Search users by name or email" })
  @ApiQuery({
    name: "q",
    description: "Search query (name or email)",
    required: true,
  })
  @ApiQuery({
    name: "limit",
    description: "Maximum number of results",
    required: false,
  })
  searchUsers(
    @Query("q") query: string,
    @Query("limit") limit: string = "10",
    @Request() req,
  ): Promise<User[]> {
    return this.userService.searchUsers(query, +limit, req.user.id);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a user by id" })
  findOne(@Param("id") id: number): Promise<User> {
    return this.userService.findOne(+id);
  }

  @Get("email/:email")
  @ApiOperation({ summary: "Get a user by email" })
  findByEmail(@Param("email") email: string) {
    return this.userService.findByEmail(email);
  }

  @Put(":id")
  @ApiOperation({ summary: "Update a user" })
  update(@Param("id") id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(+id, updateUserDto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Partially update a user" })
  @ApiResponse({ status: 200, description: "User updated successfully" })
  @ApiResponse({ status: 404, description: "User not found" })
  @ApiParam({ name: "id", description: "User ID" })
  partialUpdate(@Param("id") id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(+id, updateUserDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a user" })
  remove(@Param("id") id: string) {
    return this.userService.remove(+id);
  }

  @Roles("ADMIN")
  @Get("companies")
  @ApiOperation({ summary: "Get all company users with pagination" })
  @ApiQuery({ type: PaginationDto })
  findAllCompanies(
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginationResponse<User>> {
    return this.userService.findAllCompanies(paginationDto);
  }

  // Endpoint para listar usuarios por empleador
  @Get("by-employer/:employerId")
  @Roles("ADMIN", "BUSINESS")
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: "Get users by employer company ID" })
  @ApiParam({ name: "employerId", description: "Employer (Company) ID" })
  @ApiQuery({ type: PaginationDto })
  findByEmployer(
    @Param("employerId") employerId: string,
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginationResponse<User>> {
    return this.userService.findByEmployer(employerId, paginationDto);
  }

  // Endpoint para cambiar el empleador de un usuario
  @Patch(":id/change-employer")
  @Roles("ADMIN", "BUSINESS")
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: "Change user employer" })
  @ApiParam({ name: "id", description: "User ID" })
  changeEmployer(
    @Param("id") id: string,
    @Body("employerId") employerId: string | null,
  ): Promise<User> {
    const updateDto: UpdateUserDto = { employerId };
    return this.userService.update(+id, updateDto);
  }

  // Endpoint para quitar un usuario de una empresa (quitar su empleador)
  @Delete(":id/employer")
  @Roles("ADMIN", "BUSINESS")
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({ summary: "Remove user from employer company" })
  @ApiParam({ name: "id", description: "User ID" })
  removeEmployer(@Param("id") id: string): Promise<User> {
    const updateDto: UpdateUserDto = { employerId: null };
    return this.userService.update(+id, updateDto);
  }

  // Endpoints para galería de fotos
  @UseGuards(AuthGuard)
  @Get("me/gallery")
  async getUserGallery(@Request() req) {
    return this.galleryService.getUserGallery(req.user.id);
  }

  @UseGuards(AuthGuard)
  @Post("me/gallery")
  async addImageToGallery(
    @Request() req,
    @Body() createDto: CreateGalleryImageDto,
  ) {
    return this.galleryService.addImageToGallery(req.user.id, createDto);
  }

  @UseGuards(AuthGuard)
  @Post("me/gallery/upload-multiple")
  async uploadMultipleImages(
    @Request() req,
    @Body() uploadDto: UploadGalleryImagesDto,
  ) {
    return this.galleryService.uploadMultipleImages(req.user.id, uploadDto);
  }

  @UseGuards(AuthGuard)
  @Patch("me/gallery/:imageId")
  async updateImage(
    @Request() req,
    @Param("imageId") imageId: string,
    @Body() updateDto: UpdateGalleryImageDto,
  ) {
    return this.galleryService.updateImage(req.user.id, +imageId, updateDto);
  }

  @UseGuards(AuthGuard)
  @Delete("me/gallery/:imageId")
  async deleteImage(@Request() req, @Param("imageId") imageId: string) {
    return this.galleryService.deleteImage(req.user.id, +imageId);
  }

  @UseGuards(AuthGuard)
  @Post("me/gallery/reorder")
  async reorderImages(@Request() req, @Body() body: { imageIds: number[] }) {
    return this.galleryService.reorderImages(req.user.id, body.imageIds);
  }

  @Patch("me")
  @UseGuards(AuthGuard)
  @ApiOperation({ 
    summary: "Update current user profile",
    description: "Allows authenticated users to update their own profile partially"
  })
  @ApiResponse({ status: 200, description: "Profile updated successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async updateMyProfile(@Request() req, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(req.user.id, updateUserDto);
  }

  @Get("me/stats")
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: "Get user statistics",
    description: "Get basic statistics about user performance and activity",
  })
  @ApiResponse({
    status: 200,
    description: "User statistics retrieved successfully",
    schema: {
      type: "object",
      properties: {
        userId: { type: "number" },
        totalEarnings: {
          type: "number",
          description: "Total money earned from completed contracts",
        },
        totalContractsCompleted: {
          type: "number",
          description: "Total contracts completed with status accepted",
        },
        totalPublications: {
          type: "number",
          description: "Total publications created by user",
        },
      },
    },
  })
  async getMyStats(@Request() req) {
    return this.userService.getUserStats(req.user.id);
  }

  @Get(":id/stats")
  @Roles("ADMIN")
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({
    summary: "Get user statistics by ID (Admin only)",
    description:
      "Get basic statistics about any user performance and activity (Admin access required)",
  })
  @ApiParam({ name: "id", description: "User ID", type: "number" })
  @ApiResponse({
    status: 200,
    description: "User statistics retrieved successfully",
    schema: {
      type: "object",
      properties: {
        userId: { type: "number" },
        totalEarnings: {
          type: "number",
          description: "Total money earned from completed contracts",
        },
        totalContractsCompleted: {
          type: "number",
          description: "Total contracts completed with status accepted",
        },
        totalPublications: {
          type: "number",
          description: "Total publications created by user",
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Admin access required",
  })
  @ApiResponse({ status: 404, description: "User not found" })
  async getUserStats(@Param("id") id: number) {
    return this.userService.getUserStats(+id);
  }

  @UseGuards(AuthGuard)
  @Get("me/id-photos")
  @ApiOperation({ 
    summary: "Get current user ID photos",
    description: "Get ID photos (cedula) for the authenticated user"
  })
  @ApiResponse({ status: 200, description: "ID photos retrieved successfully" })
  async getMyIdPhotos(@Request() req) {
    return this.idPhotosService.getUserIdPhotos(req.user.id);
  }

  @UseGuards(AuthGuard)
  @Post("me/id-photos")
  @ApiOperation({ 
    summary: "Upload ID photo",
    description: "Add a new ID photo (front or back of cedula) for the authenticated user"
  })
  @ApiResponse({ status: 201, description: "ID photo uploaded successfully" })
  @ApiResponse({ status: 400, description: "Photo type already exists or validation error" })
  async addMyIdPhoto(
    @Request() req,
    @Body() createDto: CreateIdPhotoDto,
  ) {
    return this.idPhotosService.addIdPhoto(req.user.id, createDto);
  }

  @UseGuards(AuthGuard)
  @Put("me/id-photos/:photoId")
  @ApiOperation({ 
    summary: "Update ID photo",
    description: "Update an existing ID photo for the authenticated user"
  })
  @ApiParam({ name: "photoId", description: "ID Photo ID" })
  @ApiResponse({ status: 200, description: "ID photo updated successfully" })
  @ApiResponse({ status: 404, description: "ID photo not found" })
  async updateMyIdPhoto(
    @Request() req,
    @Param("photoId") photoId: string,
    @Body() updateDto: UpdateIdPhotoDto,
  ) {
    return this.idPhotosService.updateIdPhoto(req.user.id, +photoId, updateDto);
  }

  @UseGuards(AuthGuard)
  @Delete("me/id-photos/:photoId")
  @ApiOperation({ 
    summary: "Delete ID photo",
    description: "Delete an ID photo for the authenticated user"
  })
  @ApiParam({ name: "photoId", description: "ID Photo ID" })
  @ApiResponse({ status: 200, description: "ID photo deleted successfully" })
  @ApiResponse({ status: 404, description: "ID photo not found" })
  async deleteMyIdPhoto(@Request() req, @Param("photoId") photoId: string) {
    await this.idPhotosService.deleteIdPhoto(req.user.id, +photoId);
    return { message: "Foto de cédula eliminada exitosamente" };
  }

  // Endpoints para administradores (revisar fotos de cédula)
  @Roles("ADMIN")
  @UseGuards(AuthGuard, RolesGuard)
  @Get("id-photos/pending")
  @ApiOperation({ 
    summary: "Get pending ID photos (Admin only)",
    description: "Get all ID photos with pending status for review"
  })
  @ApiResponse({ status: 200, description: "Pending ID photos retrieved successfully" })
  @ApiResponse({ status: 403, description: "Forbidden - Admin access required" })
  async getPendingIdPhotos() {
    return this.idPhotosService.getAllPendingPhotos();
  }

  @Roles("ADMIN")
  @UseGuards(AuthGuard, RolesGuard)
  @Patch("id-photos/:photoId/review")
  @ApiOperation({ 
    summary: "Review ID photo (Admin only)",
    description: "Approve or reject an ID photo"
  })
  @ApiParam({ name: "photoId", description: "ID Photo ID" })
  @ApiResponse({ status: 200, description: "ID photo reviewed successfully" })
  @ApiResponse({ status: 403, description: "Forbidden - Admin access required" })
  @ApiResponse({ status: 404, description: "ID photo not found" })
  async reviewIdPhoto(
    @Request() req,
    @Param("photoId") photoId: string,
    @Body() reviewDto: ReviewIdPhotoDto,
  ) {
    return this.idPhotosService.reviewIdPhoto(+photoId, reviewDto, req.user.id);
  }

  @Roles("ADMIN")
  @UseGuards(AuthGuard, RolesGuard)
  @Get("id-photos/:photoId")
  @ApiOperation({ 
    summary: "Get ID photo by ID (Admin only)",
    description: "Get detailed information about a specific ID photo"
  })
  @ApiParam({ name: "photoId", description: "ID Photo ID" })
  @ApiResponse({ status: 200, description: "ID photo retrieved successfully" })
  @ApiResponse({ status: 403, description: "Forbidden - Admin access required" })
  @ApiResponse({ status: 404, description: "ID photo not found" })
  async getIdPhotoById(@Param("photoId") photoId: string) {
    return this.idPhotosService.getPhotoById(+photoId);
  }

  @Roles("ADMIN")
  @UseGuards(AuthGuard, RolesGuard)
  @Get(":id/id-photos")
  @ApiOperation({ 
    summary: "Get user ID photos by user ID (Admin only)",
    description: "Get all ID photos for a specific user"
  })
  @ApiParam({ name: "id", description: "User ID" })
  @ApiResponse({ status: 200, description: "User ID photos retrieved successfully" })
  @ApiResponse({ status: 403, description: "Forbidden - Admin access required" })
  @ApiResponse({ status: 404, description: "User not found" })
  async getUserIdPhotosById(@Param("id") id: string) {
    return this.idPhotosService.getUserIdPhotosByUserId(+id);
  }
}
