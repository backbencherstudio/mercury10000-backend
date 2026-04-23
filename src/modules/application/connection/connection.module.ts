import { Module } from '@nestjs/common';
import { ConnectionRequestAdminController } from 'src/modules/application/connection/connection.controller';
import { ConnectionRequestService } from './connection.service';

@Module({
  controllers: [ConnectionRequestAdminController],
  providers: [ConnectionRequestService],
})
export class ConnectionModule {}
