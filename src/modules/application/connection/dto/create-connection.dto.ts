export class CreateConnectionDto {}
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateConnectionRequestDto {
  @ApiProperty({
    example: 'cmo8gpe1p0000m4tztacc664d',
    description: 'Trade ID',
  })
  @IsString()
  @IsNotEmpty()
  trade_id: string;

  @ApiProperty({ example: 'Miami, FL', description: 'General location' })
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiPropertyOptional({ example: 'Miami', description: 'Specific City' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({
    example: 'Looking for a licensed plumber for a residential project.',
    description: 'Brief description',
  })
  @IsString()
  @IsOptional()
  description?: string;
}
