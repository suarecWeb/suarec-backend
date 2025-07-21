import { CanActivate, Injectable } from "@nestjs/common";
import { WsException } from "@nestjs/websockets";
import { Socket } from "socket.io";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class WsAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {} // eslint-disable-line no-unused-vars

  async canActivate(context: any): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient();
      const token = client.handshake.auth.token;

      if (!token) {
        throw new WsException("Token no proporcionado");
      }

      const payload = this.jwtService.verify(token);
      client.data.user = payload;

      return true;
    } catch (err) {
      throw new WsException("Token inválido");
    }
  }
}
