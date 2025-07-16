import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

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
      console.error("User roles not defined or invalid.");
      return false;
    }

    // Extraer solo los nombres de los roles para una mejor depuración
    const userRoleNames = user.roles.map((role) => role.name);
    console.log("Roles del usuario:", userRoleNames);
    console.log("Roles requeridos:", requiredRoles);

    // Verificar si al menos uno de los nombres de rol del usuario está en los roles requeridos
    const hasPermission = user.roles.some((userRole) =>
      requiredRoles.includes(userRole.name),
    );
    console.log("¿Usuario tiene permiso?", hasPermission);

    return hasPermission;
  }
}
