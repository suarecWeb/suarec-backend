import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { VERIFIED_KEY } from "../decorators/verified.decorator";

type VerifiedRequirement = {
  message?: string;
};

@Injectable()
export class VerifiedGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requirement = this.reflector.getAllAndOverride<VerifiedRequirement>(
      VERIFIED_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requirement) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request?.user;

    if (!user) {
      return true;
    }

    if (!user.isVerify) {
      throw new ForbiddenException(
        requirement.message ||
          "Debes estar verificado para realizar esta accion.",
      );
    }

    return true;
  }
}
