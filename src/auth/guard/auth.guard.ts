import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
  } from '@nestjs/common';
  import { JwtService } from '@nestjs/jwt';
  import { Request } from 'express';
  import { ConfigService } from '@nestjs/config';
  import jwt from 'jsonwebtoken';
  
  @Injectable()
  export class AuthGuard implements CanActivate {
    constructor(private jwtService: JwtService, private configService: ConfigService) {}
    
    async canActivate(context: ExecutionContext): Promise<boolean> {
      const request = context.switchToHttp().getRequest();

      console.log('Request: ' + request);

      const token = this.extractTokenFromHeader(request);

      console.log('Token from request: ' + token);

      if (!token) {
        throw new UnauthorizedException();
      }
      try {
  
        const payload = await this.jwtService.verifyAsync(
          token,
          
          {
            
            secret: this.configService.get<string>('JWT_SECRET'),
          }
        );
        // 💡 We're assigning the payload to the request object here
        // so that we can access it in our route handlers
        request['user'] = payload;
      } catch {
        
        throw new UnauthorizedException();
      }
      return true;
    }
    /* istanbul ignore next */
    private extractTokenFromHeader(request: Request): string | undefined {
      const [type, token] = request.headers.authorization?.split(' ') ?? [];
      return type === 'Bearer' ? token : undefined;
    }
  }