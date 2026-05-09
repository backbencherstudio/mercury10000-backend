import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateGiftcardDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(3, { message: 'Name must be at least 3 characters long' })
  @MaxLength(50, { message: 'Name must be at most 50 characters long' })
  @ApiProperty({
    example: 'Giftcard name',
    required: true,
    description: 'Name of the giftcard',
  })
  name: string;
}

export class SendBulkRewardDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: 'Giftcard id',
    required: true,
    description: 'Id of the giftcard',
  })
  giftCardId: string;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @ApiProperty({
    example: ['user1', 'user2', 'user3'],
    required: true,
    description: 'Array of user ids',
    isArray: true,
    type: String,
  })
  userIds: string[];
}
