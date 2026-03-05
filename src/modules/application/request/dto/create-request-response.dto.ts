import { ApiProperty } from '@nestjs/swagger';

class UserDto {
  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiProperty({ example: null, nullable: true })
  username: string | null;

  @ApiProperty({ example: null, nullable: true })
  avatar: string | null;
}

class RequestDataDto {
  @ApiProperty({ example: '1dcc2f43-528a-4eef-bcae-1aec9030fb1b' })
  id: string;

  @ApiProperty({ example: 'teste title' })
  title: string;

  @ApiProperty({ example: 'I need a full-stack developer to build an e-commerce website using Next.js and NestJS.' })
  description: string;

  @ApiProperty({ example: 'HIGH' })
  priority: string;

  @ApiProperty({ example: 'DURING_STORM' })
  category: string;

  @ApiProperty({ example: 'Dhaka, Bangladesh' })
  location: string;

  @ApiProperty({ example: '2 weeks' })
  duration: string;

  @ApiProperty({ example: 'Next.js, NestJS, PostgreSQL' })
  skills: string;

  @ApiProperty({ example: 'about 1 hour ago' })
  time_ago: string;

  @ApiProperty({ type: UserDto })
  user: UserDto;
}

export class CreateRequestResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Latest available requests fetched successfully' })
  message: string;

  @ApiProperty({ type: [RequestDataDto] })
  data: RequestDataDto[];
}