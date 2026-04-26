import { ApiProperty } from '@nestjs/swagger';
import { SupportStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class CreateSupportDto {}

// export class CreateSupportTicketDto {
//   @ApiProperty({ description: 'The ID of the user requesting support' })
//   @IsNotEmpty()
//   @IsString()
//   userId: string;
// }

export class SecretaryNoteDto {
  @ApiProperty({ description: 'Summary/Note written by the secretary' })
  @IsNotEmpty()
  @IsString()
  secretaryNote: string;
}

export class UpdateSupportStatusDto {
  @ApiProperty({ enum: SupportStatus, example: SupportStatus.RESOLVED })
  @IsEnum(SupportStatus)
  status: SupportStatus;
}
