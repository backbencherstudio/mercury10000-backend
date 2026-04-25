export class CreateConnectionDto {}
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

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

  @ApiProperty({
    type: 'array',
    items: { type: 'string', format: 'binary' },
    description: 'Optional file upload',
  })
  @IsOptional()
  files?: any;
}

export class CreateConnectionResponseDto {
  @ApiProperty({ example: 'John Doe', description: 'Name of the contractor' })
  @IsString()
  @IsNotEmpty()
  contractor_name: string;

  @ApiProperty({
    example: '+1234567890',
    description: 'Phone number of the contractor',
  })
  @IsString()
  @IsNotEmpty()
  contractor_phone: string;

  @ApiPropertyOptional({
    example: 'He is very reliable.',
    description: 'Extra note',
  })
  @IsString()
  @IsOptional()
  note?: string;
}


export class AssignUsersToConnectionDto {
  @ApiProperty({ example: ['user_id_1', 'user_id_2'], description: 'Array of User IDs' })
  @IsArray()
  @IsNotEmpty()
  user_ids: string[];
}


class ConnectionStatusDataDto {
  @ApiProperty({ example: '5678' })
  user_id: string;

  @ApiProperty({ example: '3000' })
  lead_id: string;

  @ApiProperty({ example: 'Ava Green' })
  user_name: string;

  @ApiProperty({ example: 'Electrical' })
  trade: string;

  @ApiProperty({ example: 15, description: 'Connections sent to this user by admin' })
  num_connection_sent_by_us: number;

  @ApiProperty({ example: 742, description: 'Total requests assigned to this user' })
  total_assigned_connection: number;

  @ApiProperty({ example: '2026-03-22T09:00:00Z' })
  last_lead_he_sent: Date | string;

  @ApiProperty({ example: 25 })
  total_leads_he_sent: number;

  @ApiProperty({ example: 'NO', enum: ['YES', 'NO'] })
  response_from_user: string;

  @ApiProperty({ example: 'cuid_of_request' })
  action: string;
}

export class ConnectionStatusResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: [ConnectionStatusDataDto] })
  data: ConnectionStatusDataDto[];



  @ApiProperty()
  meta: {
    
    total_items: number;
    current_page: number;
    limit: number;
    total_pages: number;
  };
}

export class GetConnectionStatusQueryDto {
  @ApiPropertyOptional({ 
    example: 1, 
    description: 'Current page number' 
  })
  @IsOptional()
  @Type(() => Number) 
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ 
    example: 10, 
    description: 'Number of items per page' 
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ 
    description: 'Search by Lead ID or User Name',
    example: 'Ava Green' 
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by Trade ID',
    example: 'clm1234567890' 
  })
  @IsOptional()
  @IsString()
  trade_id?: string;
}
