import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModerationService } from './moderation.service';
import { ModerationController } from './moderation.controller';
import { ContentReport } from './entities/content-report.entity';
import { UserBlock } from './entities/user-block.entity';
import { UserTermsAcceptance } from './entities/user-terms-acceptance.entity';
import { User } from '../user/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ContentReport,
      UserBlock,
      UserTermsAcceptance,
      User,
    ]),
  ],
  controllers: [ModerationController],
  providers: [ModerationService],
  exports: [ModerationService],
})
export class ModerationModule {}
