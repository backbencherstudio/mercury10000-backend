import { Module } from '@nestjs/common';
import { RequestController } from 'src/modules/application/request/request.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { RequestService } from './request.service';

@Module({
  controllers: [RequestController],
  providers: [RequestService, PrismaService],
})
export class RequestModule {}
