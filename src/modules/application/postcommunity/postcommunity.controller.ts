import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { GetAllPostCommunityResponseDto } from 'src/modules/application/postcommunity/dto/create-postcommunity-res.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import {
  CreateCommentDto,
  CreatePostDto,
} from './dto/create-postcommunity.dto';
import { PostCommunityService } from './postcommunity.service';

@ApiTags('Post Community')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('post-community')
export class PostCommunityController {
  constructor(private readonly postService: PostCommunityService) {}

  @Post('create-post')
  @ApiOperation({ summary: 'Create a new community post' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreatePostDto })
  @UseInterceptors(
    FileInterceptor('image_url', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  createPost(
    @Req() req,
    @Body() dto: CreatePostDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const userId = req.user.userId;

    return this.postService.createPost(userId, dto, file);
  }

  @Get()
  @ApiOperation({ summary: 'Get all community posts' })
  @ApiResponse({
    status: 200,
    description: 'List of community posts',
    type: [GetAllPostCommunityResponseDto],
  })
  getAllPosts() {
    return this.postService.getAllPosts();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get post details with comments and counts' })
  @ApiResponse({
    status: 200,
    description: 'Post details',
    type: [GetAllPostCommunityResponseDto],
  })
  getPost(@Param('id') id: string) {
    return this.postService.getPostDetail(id);
  }

  @Post(':id/like')
  @ApiOperation({ summary: 'Like or unlike a post' })
  @ApiResponse({
    status: 200,
    description: 'Liked successfully',
  })
  toggleLike(@Req() req, @Param('id') id: string) {
    return this.postService.toggleLike(req.user.userId, id);
  }

  @Post(':id/comment')
  @ApiOperation({ summary: 'Add a comment or reply to a post' })
  @ApiResponse({
    status: 200,
    description: 'Comment added successfully',
    type: [CreateCommentDto],
  })
  addComment(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.postService.createComment(req.user.userId, id, dto);
  }
}
