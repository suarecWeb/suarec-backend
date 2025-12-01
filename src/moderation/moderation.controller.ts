import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ModerationService } from './moderation.service';
import { CreateContentReportDto, UpdateReportStatusDto } from './dto/create-content-report.dto';
import { CreateUserBlockDto } from './dto/create-user-block.dto';
import { AcceptTermsDto } from './dto/accept-terms.dto';
import { AuthGuard } from '../auth/guard/auth.guard';
import { ReportStatus } from '../enums/report-status.enum';

@Controller('moderation')
@UseGuards(AuthGuard)
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  // =====================================================
  // CONTENT REPORTS ENDPOINTS
  // =====================================================

  @Post('reports')
  @HttpCode(HttpStatus.CREATED)
  async createReport(
    @Request() req,
    @Body() createReportDto: CreateContentReportDto,
  ) {
    const report = await this.moderationService.createReport(
      req.user.id,
      createReportDto,
    );
    return {
      message: 'Report submitted successfully',
      data: report,
    };
  }

  @Get('reports/my')
  async getMyReports(@Request() req) {
    const reports = await this.moderationService.getMyReports(req.user.id);
    return {
      message: 'Reports retrieved successfully',
      data: reports,
    };
  }

  @Get('reports/check/:contentType/:contentId')
  async checkIfReported(
    @Request() req,
    @Param('contentType') contentType: string,
    @Param('contentId') contentId: string, // Changed to string to support UUIDs
  ) {
    const hasReported = await this.moderationService.checkIfReported(
      req.user.id,
      contentType,
      contentId,
    );
    return {
      message: 'Check completed',
      data: { hasReported },
    };
  }

  @Get('reports')
  async getAllReports(
    @Query('status') status?: ReportStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const result = await this.moderationService.getAllReports(
      status,
      page || 1,
      limit || 20,
    );
    return {
      message: 'Reports retrieved successfully',
      data: result.reports,
      total: result.total,
      page: page || 1,
      limit: limit || 20,
    };
  }

  @Patch('reports/:id/status')
  async updateReportStatus(
    @Request() req,
    @Param('id') reportId: number,
    @Body() updateStatusDto: UpdateReportStatusDto,
  ) {
    const report = await this.moderationService.updateReportStatus(
      reportId,
      req.user.id,
      updateStatusDto,
    );
    return {
      message: 'Report status updated successfully',
      data: report,
    };
  }

  // =====================================================
  // USER BLOCKS ENDPOINTS
  // =====================================================

  @Post('blocks')
  @HttpCode(HttpStatus.CREATED)
  async blockUser(
    @Request() req,
    @Body() createBlockDto: CreateUserBlockDto,
  ) {
    const block = await this.moderationService.blockUser(
      req.user.id,
      createBlockDto,
    );
    return {
      message: 'User blocked successfully',
      data: block,
    };
  }

  @Delete('blocks/:blockedId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unblockUser(
    @Request() req,
    @Param('blockedId') blockedId: number,
  ) {
    await this.moderationService.unblockUser(req.user.id, blockedId);
    return {
      message: 'User unblocked successfully',
    };
  }

  @Get('blocks')
  async getBlockedUsers(@Request() req) {
    const blocks = await this.moderationService.getBlockedUsers(req.user.id);
    return {
      message: 'Blocked users retrieved successfully',
      data: blocks,
    };
  }

  @Get('blocks/check/:userId')
  async isUserBlocked(
    @Request() req,
    @Param('userId') userId: number,
  ) {
    const isBlocked = await this.moderationService.isUserBlocked(
      req.user.id,
      userId,
    );
    return {
      message: 'Block status retrieved successfully',
      data: { isBlocked },
    };
  }

  // =====================================================
  // TERMS AND CONDITIONS ENDPOINTS
  // =====================================================

  @Post('terms/accept')
  @HttpCode(HttpStatus.CREATED)
  async acceptTerms(
    @Request() req,
    @Body() acceptTermsDto: AcceptTermsDto,
  ) {
    const acceptance = await this.moderationService.acceptTerms(
      req.user.id,
      acceptTermsDto,
    );
    return {
      message: 'Terms accepted successfully',
      data: acceptance,
    };
  }

  @Get('terms/status')
  async getTermsStatus(
    @Request() req,
    @Query('version') version?: string,
  ) {
    const hasAccepted = await this.moderationService.hasAcceptedTerms(
      req.user.id,
      version || '1.0',
    );
    return {
      message: 'Terms acceptance status retrieved',
      data: { hasAccepted },
    };
  }

  @Get('terms/history')
  async getTermsHistory(@Request() req) {
    const history = await this.moderationService.getUserTermsAcceptance(
      req.user.id,
    );
    return {
      message: 'Terms acceptance history retrieved',
      data: history,
    };
  }
}
