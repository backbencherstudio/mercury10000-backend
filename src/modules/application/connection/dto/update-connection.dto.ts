import { ApiProperty, PartialType } from '@nestjs/swagger';
import { ConnectionStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { CreateConnectionDto } from './create-connection.dto';

export class UpdateConnectionDto extends PartialType(CreateConnectionDto) {}
export class UpdateConnectionStatusDto {
  @ApiProperty({ example: 'FULFILLED', enum: ConnectionStatus })
  @IsEnum(ConnectionStatus)
  @IsNotEmpty()
  status: ConnectionStatus;
}
