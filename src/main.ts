import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AuthGuard } from './auth/guard/auth.guard';
import * as bcrypt from 'bcrypt';
import { ValidationPipe } from '@nestjs/common';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

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
    })
    );

    const corsOptions: CorsOptions = {
      origin: '*', // Permite solicitudes desde este origen
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Métodos permitidos
      credentials: true, // Permitir el uso de cookies
      allowedHeaders: 'Content-Type, Accept, Authorization', // Encabezados permitidos
    };
  
    app.enableCors(corsOptions); // Habilitar CORS

  await app.listen(3001);
}
bootstrap();
