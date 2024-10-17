import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Activar CORS para permitir todo
  app.enableCors({
    origin: '*',  // Permitir cualquier origen
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',  // Permitir todos los métodos HTTP
    allowedHeaders: '*',  // Permitir cualquier encabezado
  });

  const config = new DocumentBuilder()
    .setTitle('Media Thomode')
    .setDescription('Media Thomode: Anime and Donghua')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(8000);
}

bootstrap();
