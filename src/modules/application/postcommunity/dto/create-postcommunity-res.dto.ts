import { ApiProperty } from '@nestjs/swagger';

export class CommentUserDto {
  @ApiProperty({ nullable: true })
  first_name: string | null;

  @ApiProperty({ nullable: true })
  avatar: string | null;
}

export class PostCommentDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  post_id: string;

  @ApiProperty()
  author_id: string;

  @ApiProperty({ nullable: true })
  parent_id: string | null;

  @ApiProperty()
  content: string;

  @ApiProperty()
  created_at: Date;

  @ApiProperty({ type: CommentUserDto })
  user: CommentUserDto;

  @ApiProperty({ type: [PostCommentDto] })
  replies: PostCommentDto[];

  @ApiProperty()
  time_ago: string;
}

export class PostUserDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  first_name: string;

  @ApiProperty()
  last_name: string;

  @ApiProperty({ nullable: true })
  avatar: string | null;
}

export class PostCountDto {
  @ApiProperty()
  likes: number;

  @ApiProperty()
  comments: number;
}

export class PostCommunityDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  author_id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  image_url: string;

  @ApiProperty()
  location_tag: string;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;

  @ApiProperty({ type: PostUserDto })
  user: PostUserDto;

  @ApiProperty({ type: PostCountDto })
  _count: PostCountDto;

  @ApiProperty({ type: [PostCommentDto] })
  comments: PostCommentDto[];

  @ApiProperty()
  time_ago: string;
}


export class GetAllPostCommunityResponseDto {
  @ApiProperty({ type: [PostCommunityDto] })
  data: PostCommunityDto[];
}