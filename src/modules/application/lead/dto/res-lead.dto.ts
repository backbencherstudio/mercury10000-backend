import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateLeadResDto {
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


export class PaginationQueryDto {
  @ApiPropertyOptional({ description: 'The ID of the last item from the previous page' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;
}