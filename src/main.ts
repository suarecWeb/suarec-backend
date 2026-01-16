import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import * as cookieParser from "cookie-parser";
import { ValidationPipe } from "@nestjs/common";
import { CorsOptions } from "@nestjs/common/interfaces/external/cors-options.interface";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // guarda el objeto SOLO con lo necesario
      // asi en el JSON yo envie mas datos de los encesarios,
      // solo obtiene los que yo tengo definidos en la clase de ese
      // tipo de objeto
      forbidNonWhitelisted: true, // me informa del error del envio
      // de un dato o atributo no necesario y que no tengo definido
      transform: true, // habilita la transformación automática de tipos
    }),
  );

  app.use(cookieParser()); // Permitir leer cookies

  const allowedOrigins = [
      "http://localhost:3000",
      "http://localhost:8081", // Expo web
      "http://localhost:8080", // Expo web
      "http://localhost:19006", // Expo web alternativo
      "http://192.168.1.17:8081", // App móvil desde IP local
      "http://192.168.1.17:19006", // App móvil desde IP local alternativo
      "http://192.168.1.17:3000", // App móvil desde IP local
      "http://192.168.1.17:3001", // App móvil desde IP local
      "http://localhost:3001", // App móvil desde IP local
      process.env.FRONTEND_URL,
      process.env.PUBLIC_FRONT_URL,
      "https://suarec-frontend-production.up.railway.app",
      "https://suarec.com",
      "https://www.suarec.com",
    ].filter(Boolean);

  const corsOptions: CorsOptions = {
    origin: allowedOrigins, // ✅ Especifica el origen permitido
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
    allowedHeaders: "Content-Type, Accept, Authorization",
  };

  app.setGlobalPrefix("suarec");
  app.enableCors(corsOptions); // Habilitar CORS

  await app.listen(3001);
}
bootstrap();
