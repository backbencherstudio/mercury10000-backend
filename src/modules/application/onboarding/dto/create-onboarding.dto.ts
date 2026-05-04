import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class UploadVideoDto {
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
    description: 'Chunk file',
  })
  meeting_video_file: any;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Chunk file',
  })
  tutorial_video_file: any;


}
