import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {} // eslint-disable-line no-unused-vars

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>(
      "roles",
      context.getHandler(),
    );
    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.roles || !Array.isArray(user.roles)) {
      return false;
    }

    // Verificar si al menos uno de los nombres de rol del usuario está en los roles requeridos
    const hasPermission = user.roles.some((userRole) =>
      requiredRoles.includes(userRole.name),
    );
    return hasPermission;
  }
}
