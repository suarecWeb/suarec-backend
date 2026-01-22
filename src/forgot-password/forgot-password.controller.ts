import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ForgotPasswordService } from './forgot-password.service';
import { SendCodeDto } from './dto/send-code.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('forgot-password')
export class ForgotPasswordController {
  constructor(private readonly forgotPasswordService: ForgotPasswordService) {}

  @Post('send-code')
  @HttpCode(HttpStatus.OK)
  async sendCode(@Body() sendCodeDto: SendCodeDto) {
    return this.forgotPasswordService.sendCode(sendCodeDto);
  }

  @Post('verify-code')
  @HttpCode(HttpStatus.OK)
  async verifyCode(@Body() verifyCodeDto: VerifyCodeDto) {
    return this.forgotPasswordService.verifyCode(verifyCodeDto);
  }

  @Post('reset')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.forgotPasswordService.resetPassword(resetPasswordDto);
  }
}
