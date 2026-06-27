import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, TransformFnParams } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
  IsNumber,
  Min,
} from 'class-validator';

import { UserType } from '@prisma/client';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional({ example: 'John Doe' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: '01700000000' })
  @IsString()
  @IsOptional()
  phone_number?: string;

  @ApiPropertyOptional({ example: 'mahuhuwin@mailinator.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: 'Kaffrine' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ example: 'Senegal' })
  @IsString()
  @IsOptional()
  country?: string;

  // Fix Type Casting: Numeric strings ke float primitive standard structure cast korbe
  @ApiPropertyOptional({ example: 52 })
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @IsNumber()
  @Min(0)
  conversion_fee?: number;

  @ApiPropertyOptional({ example: 21 })
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @IsNumber()
  @Min(0)
  qualified_leads_fee?: number;

  @ApiPropertyOptional({ enum: UserType, example: UserType.USER })
  @IsEnum(UserType)
  @IsOptional()
  type?: UserType;
}
