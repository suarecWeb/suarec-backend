import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UserService,
    private jwtService: JwtService
  ) {}

  async signIn(
    email: string,
    pass: string,
  ): Promise<{ access_token: string }> {

    const user = await this.usersService.findByEmail(email);
    console.log(user)
    

    if (!user || !(await bcrypt.compare(pass, user.password))) {
      console.log('Password does not match');
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email, role: user.role};
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}