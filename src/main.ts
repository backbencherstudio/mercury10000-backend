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
  app.enableCors({
    origin: true, // Dynamically allows active development and production origins
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
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
      'secretary_token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
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
            const role = data?.type?.toLowerCase();

            if (token) {
              const authKey =
                role === 'sup_admin'
                  ? 'admin_token'
                  : role === 'secretary'
                    ? 'secretary_token'
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
                    in: 'header',
                  },
                  value: token,
                };

                ui.authActions.authorize(authObj);

                try {
                  const existing = JSON.parse(
                    localStorage.getItem('authorized') || '{}',
                  );
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

  // Port Conflict & Auto Recovery Mechanism
  try {
    await app.listen(port, '0.0.0.0');
    console.log(`🚀 Server running on: http://localhost:${port}/api/docs`);
  } catch (error: any) {
    if (error.code === 'EADDRINUSE') {
      console.warn(
        `⚠️ Port ${port} is currently locked by a dangling Node process.`,
      );
      console.log(
        `🔄 Waiting 1.5 seconds for the port to release and retrying...`,
      );

      // Deliberate delay to allow OS to clean up socket tables
      await new Promise((resolve) => setTimeout(resolve, 1500));

      await app.listen(port, '0.0.0.0');
      console.log(
        `🚀 Server successfully recovered and running on: http://localhost:${port}/api/docs`,
      );
    } else {
      throw error;
    }
  }
}
bootstrap();
