import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AuthGuard } from './auth/guards/auth.guard';
import { ValidationPipe } from '@nestjs/common';

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
  await app.listen(3000);
}
bootstrap();
