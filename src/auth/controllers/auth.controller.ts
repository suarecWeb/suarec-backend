import { Controller, Post, Body, Res, Param } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { Response } from 'express'; // Importa Response de express
import { passwordDto } from '../dto/password.dto';
import { Public } from '../decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() signInDto: { email: string; password: string }, @Res() res: Response) {
    const token = await this.authService.signIn(signInDto.email, signInDto.password);

    // Usa res.cookie() correctamente
    res.cookie('auth_token', token, {
      httpOnly: true, // Protege contra XSS
      secure: false, // Solo en HTTPS (desactivar en desarrollo si es necesario)
      sameSite: 'strict', // Protege contra CSRF
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 semana
    });

    return res.send({ message: 'Login exitoso' });
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
