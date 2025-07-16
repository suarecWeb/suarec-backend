import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { User } from '../../user/entities/user.entity';

@Injectable()
export class LocationGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user: User = request.user;

    // Si el usuario es ADMIN, siempre tiene permiso
    if (user.roles.some(role => role.name === 'ADMIN')) {
      return true;
    }

    // Si el usuario es BUSINESS, solo puede gestionar su propia ubicación
    if (user.roles.some(role => role.name === 'BUSINESS')) {
      const companyId = request.params.id;
      // Verificar si el usuario está intentando acceder a su propia empresa
      return user.company?.id === companyId;
    }

    return false;
  }
} 