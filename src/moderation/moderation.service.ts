import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContentReport } from './entities/content-report.entity';
import { UserBlock } from './entities/user-block.entity';
import { UserTermsAcceptance } from './entities/user-terms-acceptance.entity';
import { User } from '../user/entities/user.entity';
import { CreateContentReportDto, UpdateReportStatusDto } from './dto/create-content-report.dto';
import { CreateUserBlockDto } from './dto/create-user-block.dto';
import { AcceptTermsDto } from './dto/accept-terms.dto';
import { ReportStatus } from '../enums/report-status.enum';

@Injectable()
export class ModerationService {
  constructor(
    @InjectRepository(ContentReport)
    private contentReportRepository: Repository<ContentReport>,
    @InjectRepository(UserBlock)
    private userBlockRepository: Repository<UserBlock>,
    @InjectRepository(UserTermsAcceptance)
    private termsAcceptanceRepository: Repository<UserTermsAcceptance>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  // =====================================================
  // CONTENT REPORTS
  // =====================================================

  async createReport(
    reporterId: number,
    createReportDto: CreateContentReportDto,
  ): Promise<ContentReport> {
    // Validate that user is not reporting themselves
    if (reporterId === createReportDto.reported_user_id) {
      throw new BadRequestException('Cannot report yourself');
    }

    // Check if user already reported this content
    const existingReport = await this.contentReportRepository.findOne({
      where: {
        reporter_id: reporterId,
        content_type: createReportDto.content_type,
        content_id: createReportDto.content_id,
      },
    });

    if (existingReport) {
      throw new BadRequestException('You have already reported this content');
    }

    // Check if reported user exists
    const reportedUser = await this.userRepository.findOne({
      where: { id: createReportDto.reported_user_id },
    });

    if (!reportedUser) {
      throw new NotFoundException('Reported user not found');
    }

    // Create the report
    const report = this.contentReportRepository.create({
      reporter_id: reporterId,
      ...createReportDto,
      status: ReportStatus.PENDING,
    });

    return await this.contentReportRepository.save(report);
  }

  async getMyReports(userId: number): Promise<ContentReport[]> {
    return await this.contentReportRepository.find({
      where: { reporter_id: userId },
      relations: ['reportedUser'],
      order: { created_at: 'DESC' },
    });
  }

  async checkIfReported(
    userId: number,
    contentType: string,
    contentId: string, // Changed to string to support UUIDs
  ): Promise<boolean> {
    const report = await this.contentReportRepository.findOne({
      where: {
        reporter_id: userId,
        content_type: contentType as any,
        content_id: contentId,
      },
    });
    return !!report;
  }

  async getAllReports(
    status?: ReportStatus,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ reports: ContentReport[]; total: number }> {
    const query = this.contentReportRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.reporter', 'reporter')
      .leftJoinAndSelect('report.reportedUser', 'reportedUser')
      .leftJoinAndSelect('report.reviewer', 'reviewer')
      .orderBy('report.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) {
      query.where('report.status = :status', { status });
    }

    const [reports, total] = await query.getManyAndCount();

    return { reports, total };
  }

  async updateReportStatus(
    reportId: number,
    reviewerId: number,
    updateStatusDto: UpdateReportStatusDto,
  ): Promise<ContentReport> {
    const report = await this.contentReportRepository.findOne({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    report.status = updateStatusDto.status as ReportStatus;
    report.reviewed_by = reviewerId;
    report.reviewed_at = new Date();
    report.resolution_notes = updateStatusDto.resolution_notes;

    return await this.contentReportRepository.save(report);
  }

  // =====================================================
  // USER BLOCKS
  // =====================================================

  async blockUser(
    blockerId: number,
    createBlockDto: CreateUserBlockDto,
  ): Promise<UserBlock> {
    // Validate that user is not blocking themselves
    if (blockerId === createBlockDto.blocked_id) {
      throw new BadRequestException('Cannot block yourself');
    }

    // Check if blocked user exists
    const blockedUser = await this.userRepository.findOne({
      where: { id: createBlockDto.blocked_id },
    });

    if (!blockedUser) {
      throw new NotFoundException('User to block not found');
    }

    // Check if already blocked
    const existingBlock = await this.userBlockRepository.findOne({
      where: {
        blocker_id: blockerId,
        blocked_id: createBlockDto.blocked_id,
      },
    });

    if (existingBlock) {
      throw new BadRequestException('User is already blocked');
    }

    // Create the block
    const block = this.userBlockRepository.create({
      blocker_id: blockerId,
      ...createBlockDto,
    });

    return await this.userBlockRepository.save(block);
  }

  async unblockUser(blockerId: number, blockedId: number): Promise<void> {
    const block = await this.userBlockRepository.findOne({
      where: {
        blocker_id: blockerId,
        blocked_id: blockedId,
      },
    });

    if (!block) {
      throw new NotFoundException('Block not found');
    }

    await this.userBlockRepository.remove(block);
  }

  async getBlockedUsers(userId: number): Promise<UserBlock[]> {
    return await this.userBlockRepository.find({
      where: { blocker_id: userId },
      relations: ['blocked'],
      order: { created_at: 'DESC' },
    });
  }

  async isUserBlocked(blockerId: number, blockedId: number): Promise<boolean> {
    const count = await this.userBlockRepository.count({
      where: {
        blocker_id: blockerId,
        blocked_id: blockedId,
      },
    });

    return count > 0;
  }

  async getBlockedByUsers(userId: number): Promise<number[]> {
    const blocks = await this.userBlockRepository.find({
      where: { blocked_id: userId },
      select: ['blocker_id'],
    });

    return blocks.map(block => block.blocker_id);
  }

  // =====================================================
  // TERMS AND CONDITIONS
  // =====================================================

  async acceptTerms(
    userId: number,
    acceptTermsDto: AcceptTermsDto,
  ): Promise<UserTermsAcceptance> {
    const termsVersion = acceptTermsDto.terms_version || '1.0';

    // Check if user already accepted this version
    const existingAcceptance = await this.termsAcceptanceRepository.findOne({
      where: {
        user_id: userId,
        terms_version: termsVersion,
      },
    });

    if (existingAcceptance) {
      return existingAcceptance;
    }

    // Create new acceptance record
    const acceptance = this.termsAcceptanceRepository.create({
      user_id: userId,
      terms_version: termsVersion,
      ip_address: acceptTermsDto.ip_address,
      user_agent: acceptTermsDto.user_agent,
    });

    const savedAcceptance = await this.termsAcceptanceRepository.save(acceptance);

    // Update user entity
    await this.userRepository.update(userId, {
      has_accepted_terms: true,
      terms_accepted_at: new Date(),
      terms_version: termsVersion,
    });

    return savedAcceptance;
  }

  async hasAcceptedTerms(
    userId: number,
    termsVersion: string = '1.0',
  ): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user has accepted current or newer version
    return user.has_accepted_terms && user.terms_version === termsVersion;
  }

  async getUserTermsAcceptance(userId: number): Promise<UserTermsAcceptance[]> {
    return await this.termsAcceptanceRepository.find({
      where: { user_id: userId },
      order: { accepted_at: 'DESC' },
    });
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  async getBlockedUserIds(userId: number): Promise<number[]> {
    const blocks = await this.userBlockRepository.find({
      where: { blocker_id: userId },
      select: ['blocked_id'],
    });

    return blocks.map(block => block.blocked_id);
  }

  async getMutualBlocks(userId: number, otherUserId: number): Promise<boolean> {
    const block1 = await this.isUserBlocked(userId, otherUserId);
    const block2 = await this.isUserBlocked(otherUserId, userId);

    return block1 || block2;
  }
}
