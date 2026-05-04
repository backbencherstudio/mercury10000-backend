import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdateOnboardingDto {
  @ApiPropertyOptional({
    example: 30,
    description: 'Tutorial unskippable duration',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  tutorial_unskippable_duration?: number;

  @ApiPropertyOptional({
    example: 30,
    description: 'Meeting unskippable duration',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  meeting_unskippable_duration?: number;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    required: false,
    description: 'Tutorial Video',
  })
  tutorial_file?: any;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    required: false,
    description: 'Meeting Video',
  })
  meeting_file?: any;
}
