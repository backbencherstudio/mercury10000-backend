import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsEnum, IsOptional } from 'class-validator';
import { TradeStatus } from '@prisma/client';


export class CreateTradeDto {
  @ApiProperty({ example: 'Plumbing' })
  @IsString()
  @IsNotEmpty()
  name: string;

@ApiProperty({ enum: TradeStatus, default: TradeStatus.ACTIVE })
  @IsEnum(TradeStatus)
  @IsOptional()
  status?: TradeStatus;
}
