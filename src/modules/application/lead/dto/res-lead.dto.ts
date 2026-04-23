import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LeadStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

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
  @ApiPropertyOptional({
    description: 'The ID of the last item from the previous page',
  })
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

export class UpdateLeadScheduleDto {
  @ApiProperty({ example: '2022-01-01T12:00:00.000Z' })
  @IsNotEmpty()
  @IsDateString()
  scheduled_time: string;
}

export class GetLeadsQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Search by name, lead_no, or address' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by Trade ID' })
  @IsOptional()
  @IsString()
  trade_id?: string;

  @ApiPropertyOptional({
    description: 'Filter by Lead Status (e.g. SUBMITTED, IN_PROGRESS)',
  })
  @IsOptional()
  @IsString()
  status?: string;
}

class TradeResponseDto {
  @ApiProperty({ example: 'cmo8gpe1p0000m4tztacc664d' })
  id: string;
  @ApiProperty({ example: 'Plumbing' })
  name: string;
  @ApiProperty({ example: 'ACTIVE' })
  status: string;
  @ApiProperty({ example: '2026-04-21T10:09:34.045Z' })
  created_at: Date;
  @ApiProperty({ example: '2026-04-21T10:09:34.045Z' })
  updated_at: Date;
}

class UserMinimalResponseDto {
  @ApiProperty({ example: 'John Doe', nullable: true })
  name: string | null;
}

class LeadDataDto {
  @ApiProperty({ example: 'cmo8gpo3d0001m4tzrfhi5tqq' })
  id: string;
  @ApiProperty({ example: '1' })
  lead_no: string;
  @ApiProperty({ example: '123 Main St, Los Angeles' })
  address: string;
  @ApiProperty({ example: 'John Smith' })
  name: string;
  @ApiProperty({ example: '+33 01238324' })
  phone: string;
  @ApiProperty({ example: 'Roof leaking issue' })
  notes: string;
  @ApiProperty({ example: 'SCHEDULED' })
  status: string;
  @ApiProperty({ example: '2022-01-01T12:00:00.000Z' })
  scheduled_time: Date;
  @ApiProperty({ example: '2026-04-21T10:09:47.065Z' })
  created_at: Date;
  @ApiProperty({ example: '2026-04-22T05:31:58.956Z' })
  updated_at: Date;
  @ApiProperty()
  trade: TradeResponseDto;
  @ApiProperty({ type: [Object], example: [] })
  files: any[];
  @ApiProperty()
  user: UserMinimalResponseDto;
}

export class GetLeadsResponseDto {
  @ApiProperty({ example: true })
  success: boolean;
  @ApiProperty({ example: 'In-process leads fetched successfully' })
  message: string;
  @ApiProperty({ type: [LeadDataDto] })
  data: LeadDataDto[];
  @ApiProperty({
    type: 'object',
    properties: {
      total_items: { type: 'number', example: 10 },
      current_page: { type: 'number', example: 1 },
      limit: { type: 'number', example: 10 },
      total_pages: { type: 'number', example: 1 },
    },
  })
  meta: {
    total_items: number;
    current_page: number;
    limit: number;
    total_pages: number;
  };
}

export class UpdateLeadStatusDto {
  @ApiProperty({
    enum: LeadStatus,
    example: LeadStatus.ACTIVE,
  })
  @IsEnum(LeadStatus)
  status: LeadStatus;
}

export class GetLeadMeetingDetailsDto {
  @ApiProperty({ example: 'cmo8gpo3d0001m4tzrfhi5tqq' })
  id: string;
  @ApiProperty({ example: 'John Smith' })
  customer_name: string;
  @ApiProperty({ example: '123 Main St, Los Angeles' })
  address: string;
  @ApiProperty({ example: '2022-01-01T12:00:00.000Z' })
  scheduled_time: Date;
  @ApiProperty({ example: 'SCHEDULED' })
  status: string;
}

export class GetLeadCountDto {
  @ApiProperty({ example: 'cmo8gpo3d0001m4tzrfhi5tqq' })
  user_id: string;
}

export class GetLeadCountResponseDto {
  @ApiProperty({ example: true })
  success: boolean;
  @ApiProperty({ example: 'Lead statistics fetched successfully' })
  message: string;
  @ApiProperty({
    type: 'object',
    properties: {
      submitted: { type: 'number', example: 10 },
      quality_leads: { type: 'number', example: 10 },
      conversions: { type: 'number', example: 10 },
    },
  })
  data: {
    submitted: number;
    quality_leads: number;
    conversions: number;
  };
}




class ActivityItemDto {
  @ApiProperty({ example: 'cmo8gpo3d0001m4tzrfhi5tqq' })
  id: string;

  @ApiProperty({ example: '123 Main St, Los Angeles' })
  address: string;

  @ApiProperty({ example: '2026-04-22T09:36:36.716Z' })
  created_at: Date;
}

class ActivityCategoryDto {
  @ApiProperty({ example: 6 })
  count: number;

  @ApiProperty({ type: [ActivityItemDto] })
  items: ActivityItemDto[];
}

class ActivityDataDto {
  @ApiProperty({ type: ActivityCategoryDto })
  submitted: ActivityCategoryDto;

  @ApiProperty({ type: ActivityCategoryDto })
  qualified: ActivityCategoryDto;

  @ApiProperty({ type: ActivityCategoryDto })
  conversions: ActivityCategoryDto;
}

export class GetLeadActivityResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Lead activity fetched successfully' })
  message: string;

  @ApiProperty({ type: ActivityDataDto })
  data: ActivityDataDto;
}
