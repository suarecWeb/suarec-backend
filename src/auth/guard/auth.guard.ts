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
import { Reflector } from '@nestjs/core';
  
  @Injectable()
  export class AuthGuard implements CanActivate {
    constructor(private jwtService: JwtService, private configService: ConfigService, private reflector: Reflector,) {}
    
    async canActivate(context: ExecutionContext): Promise<boolean> {
      const isPublic = this.reflector.get<boolean>('isPublic', context.getHandler());
      if (isPublic) {
        return true;
      }
    
      const request = context.switchToHttp().getRequest();
      const token = this.extractTokenFromHeader(request);
    
      if (!token) {
        throw new UnauthorizedException('Token not provided');
      }
    
      try {
        const payload = await this.jwtService.verifyAsync(token, {
          secret: this.configService.get<string>('JWT_SECRET'),
        });
    
        // Verifica si el payload contiene los roles
        if (!payload.roles) {
          throw new UnauthorizedException('Roles not found in token');
        }
    
        // Asigna el payload completo al request para usarlo en los handlers
        request['user'] = payload;
      } catch (error) {
        console.error('JWT Verification Error:', error.message);
        throw new UnauthorizedException('Invalid or expired token');
      }
    
      return true;
    }    

    /* istanbul ignore next */
    private extractTokenFromHeader(request: Request): string | undefined {
      const [type, token] = request.headers.authorization?.split(' ') ?? [];
      return type === 'Bearer' ? token : undefined;
    }
  }