import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateLeadDto {
  @ApiProperty({ example: '123 Main St, Los Angeles' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: 'John Smith' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '+33 01238324' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'uuid-of-the-trade' })
  @IsString()
  @IsNotEmpty()
  trade_id: string;

  @ApiPropertyOptional({ example: 'Roof leaking issue' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ type: 'string', format: 'binary', isArray: true })
  @IsOptional()
  files?: any[];
}
