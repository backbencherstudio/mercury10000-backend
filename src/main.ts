// external imports
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { join } from 'path';
// internal imports
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppModule } from './app.module';
import { CustomExceptionFilter } from './common/exception/custom-exception.filter';
import { PrismaExceptionFilter } from './common/exception/prisma-exception.filter';
import { TajulStorage } from './common/lib/Disk/TajulStorage';
import appConfig from './config/app.config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  app.useWebSocketAdapter(new IoAdapter(app));
  app.setGlobalPrefix('api');
  app.enableCors();
  app.use(
    helmet({
      contentSecurityPolicy: false,
    }),
  );

  app.useStaticAssets(join(process.cwd(), 'public'), {
    index: false,
    prefix: '/public',
  });
  app.useStaticAssets(join(process.cwd(), 'public/storage'), {
    index: false,
    prefix: '/storage',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalFilters(
    new CustomExceptionFilter(),
    new PrismaExceptionFilter(),
  );

  // storage setup
  TajulStorage.config({
    driver: 'local',
    connection: {
      rootUrl: appConfig().storageUrl.rootUrl,
      publicUrl: appConfig().storageUrl.rootUrlPublic,
      awsBucket: appConfig().fileSystems.s3.bucket,
      awsAccessKeyId: appConfig().fileSystems.s3.key,
      awsSecretAccessKey: appConfig().fileSystems.s3.secret,
      awsDefaultRegion: appConfig().fileSystems.s3.region,
      awsEndpoint: appConfig().fileSystems.s3.endpoint,
      minio: true,
    },
  });

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle(`${process.env.APP_NAME} API`)
    .setDescription(`${process.env.APP_NAME} API Docs`)
    .setVersion('1.0')
    .addTag(`${process.env.APP_NAME}`)
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
      'user_token',
    )
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
      'admin_token',
    )
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
      'secretery_token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // ✅ এটা টোকেনকে localStorage এ সেভ রাখে
      defaultModelsExpandDepth: -1,
      displayRequestDuration: true,

      // Auto authorization logic update
      responseInterceptor: (response) => {
        try {
          if (
            response.url.includes('/auth/login') &&
            (response.status === 200 || response.status === 201)
          ) {
            const data = response.obj || JSON.parse(response.data);
            const token = data?.authorization?.access_token;
            const role = data?.type?.toLowerCase(); // Standardize role case

            if (token) {
              const authKey =
                role === 'admin'
                  ? 'admin_token'
                  : role === 'secretery'
                    ? 'secretery_token'
                    : 'user_token';

              const ui = window['ui'];
              if (ui) {
                const authObj = {};
                authObj[authKey] = {
                  name: authKey,
                  schema: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                  },
                  value: token,
                };

                // Swagger UI এর ইন্টারনাল মেথড কল করে অথোরাইজ করা
                ui.authActions.authorize(authObj);

                // ✅ localStorage এ ম্যানুয়ালি সেভ করো যাতে reload এ টোকেন থাকে
                try {
                  const existing = JSON.parse(localStorage.getItem('authorized') || '{}');
                  existing[authKey] = authObj[authKey];
                  localStorage.setItem('authorized', JSON.stringify(existing));
                } catch (e) {
                  console.error('Failed to persist token:', e);
                }

                console.log(`✅ Authorized as ${authKey}`);
              }
            }
          }
        } catch (err) {
          console.error('Interceptor error:', err);
        }
        return response;
      },
    },
  });

  const port = process.env.PORT ?? 4000;
  await app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Server: http://localhost:${port}/api/docs`);
  });
}
bootstrap();
