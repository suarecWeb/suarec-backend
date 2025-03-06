import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AuthGuard } from './auth/guard/auth.guard';
import * as bcrypt from 'bcrypt';
import * as cookieParser from 'cookie-parser';
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

    app.use(cookieParser()); // Permitir leer cookies

    const corsOptions: CorsOptions = {
      origin: 'http://localhost:3000', // ✅ Especifica el origen permitido
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      credentials: true,
      allowedHeaders: 'Content-Type, Accept, Authorization',
    };
    
    app.setGlobalPrefix('suarec');
    app.enableCors(corsOptions); // Habilitar CORS

  await app.listen(3001);
}
bootstrap();
