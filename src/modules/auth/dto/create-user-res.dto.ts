import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserType } from '@prisma/client';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';

export class CreateUserResDto {
  @ApiPropertyOptional({ example: 'John Doe' })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiPropertyOptional({ example: '019948547647' })
  @IsString()
  @IsOptional()
  phone_number?: string;

  @ApiProperty({ example: 'user@mercury.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '123456789' })
  @MinLength(8, { message: 'Password should be minimum 8 characters' })
  password: string;

  @ApiPropertyOptional({ example: 'Google' })
  @IsString()
  @IsOptional()
  work_at_company?: string;

  @ApiPropertyOptional({ example: 'New York' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ example: 'USA' })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({
    enum: UserType,
    default: UserType.USER,
  })
  @IsOptional()
  @IsEnum(UserType)
  type?: UserType;

  @ApiPropertyOptional({
    type: [String],
    example: ['clx123...', 'clx456...'],
    description: 'Array of Trade IDs',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  trades?: string[];

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  qualified_leads_fee?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  conversion_fee?: number;
}

export class LoginUserResDto {
  @ApiProperty({ example: 'user@mercury.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '123456789' })
  @MinLength(8, { message: 'Password should be minimum 8 characters' })
  password: string;

  // @ApiProperty({ example: 'fcm-token' })
  // @IsString()
  // fcm_token: string;
}

export class UserSingleResDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Unique ID of the user',
  })
  @IsUUID()
  id: string;

  @ApiProperty({
    example: 'MD Tajul Islam',
    description: 'Full name of the user',
  })
  @IsString()
  name: string;

  @ApiProperty({ example: 'tajul@softvence.com', description: 'Email address' })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: '+8801302442863',
    description: 'Contact phone number',
  })
  @IsString()
  phone_number: string;

  @ApiProperty({
    example: ['Plumbing', 'Electrical'],
    description: 'List of trades or specialties',
    isArray: true,
  })
  @IsArray()
  @IsString({ each: true })
  trades: string[];

  @ApiProperty({ example: 'Dhaka', description: 'City of residence' })
  @IsString()
  city: string;

  @ApiProperty({ example: 'Bangladesh', description: 'Country of residence' })
  @IsString()
  country: string;

  @ApiProperty({ example: 15.5, description: 'Fee charged for conversion' })
  @IsNumber({ maxDecimalPlaces: 2 })
  conversion_fee: number;

  @ApiProperty({ example: 50.0, description: 'Fee for qualified leads' })
  @IsNumber({ maxDecimalPlaces: 2 })
  qualified_leads_fee: number;

  @ApiProperty({
    example: 'USER',
    enum: UserType,
    description: 'Type of user account',
  })
  @IsEnum(UserType)
  type: string;
}
export class ForgotPasswordDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;
}

export class VerifyTokenDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '156545' })
  @IsString()
  token: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123' })
  @MinLength(8, { message: 'Password should be minimum 8 characters' })
  old_password: string;

  @ApiProperty({ example: 'password123' })
  @MinLength(8, { message: 'Password should be minimum 8 characters' })
  new_password: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  token: string;

  @ApiProperty({ example: 'password123' })
  @MinLength(8, { message: 'Password should be minimum 8 characters' })
  password: string;
}

export class UpdateUserResDto {
  @ApiPropertyOptional({ example: 'John Doe' })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiPropertyOptional({ example: '019948547647' })
  @IsString()
  @IsOptional()
  phone_number?: string;

  @ApiProperty({ example: 'user@mercury.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '123456789' })
  @MinLength(8, { message: 'Password should be minimum 8 characters' })
  password: string;

  @ApiPropertyOptional({ example: 'Google' })
  @IsString()
  @IsOptional()
  work_at_company?: string;

  @ApiPropertyOptional({ example: 'New York' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ example: 'USA' })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({
    enum: UserType,
    default: UserType.USER,
  })
  @IsOptional()
  @IsEnum(UserType)
  type?: UserType;

  @ApiPropertyOptional({
    type: [String],
    example: ['clx123...', 'clx456...'],
    description: 'Array of Trade IDs',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  trades?: string[];

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  qualified_leads_fee?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  conversion_fee?: number;
}

// export class VolunteerListResDto {
//   @ApiProperty({ example: 'uuid-string' })
//   id: string;

//   @ApiProperty({ example: 'John Doe' })
//   name: string;

//   @ApiProperty({ example: 'john@example.com' })
//   email: string;

//   @ApiProperty({
//     enum: UserType,
//     example: UserType.VOLUNTEER,
//   })
//   type: UserType;

//   @ApiProperty({ example: '2023-10-27T10:00:00.000Z' })
//   created_at: Date;
// }
