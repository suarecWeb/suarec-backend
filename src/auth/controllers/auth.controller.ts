import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, UseGuards } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { passwordDto } from '../dto/password.dto';
import { Public } from '../decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  create(@Body() signInDto: Record<string, string>) {
    return this.authService.signIn(signInDto.email, signInDto.password);
  }

  @Public()
  @Post('forgot')
  sendMail(@Body('email') email:string){
      return this.authService.sendMail(email)
  }

  @Public()
  @Post('change/:id')
  changePassword(@Param('id') id:string, @Body() passwordDto:passwordDto){
    return this.authService.changePassword(+id, passwordDto.password)
  }
}
