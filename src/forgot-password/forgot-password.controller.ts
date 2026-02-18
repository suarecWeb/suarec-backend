import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ForgotPasswordService } from './forgot-password.service';
import { SendCodeDto } from './dto/send-code.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Public } from '../auth/decorators/public.decorator';

@Controller('forgot-password')
export class ForgotPasswordController {
  constructor(private readonly forgotPasswordService: ForgotPasswordService) {}

  @Public()
  @Post('send-code')
  @HttpCode(HttpStatus.OK)
  async sendCode(@Body() sendCodeDto: SendCodeDto) {
    return this.forgotPasswordService.sendCode(sendCodeDto);
  }

  @Public()
  @Post('verify-code')
  @HttpCode(HttpStatus.OK)
  async verifyCode(@Body() verifyCodeDto: VerifyCodeDto) {
    return this.forgotPasswordService.verifyCode(verifyCodeDto);
  }

  @Public()
  @Post('reset')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.forgotPasswordService.resetPassword(resetPasswordDto);
  }
}
