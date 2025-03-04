import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!requiredRoles) {
      return true;
    }
  
    const request = context.switchToHttp().getRequest();
    const user = request.user;
  
    if (!user || !user.roles || !Array.isArray(user.roles)) {
      console.error('User roles not defined or invalid.');
      return false;
    }

    console.log('roles de user: ' + user.roles);
  
    // Verifica si al menos uno de los roles del usuario está en los roles requeridos
    return user.roles.some((userRole) => requiredRoles.includes(userRole.name));
  }  
}
