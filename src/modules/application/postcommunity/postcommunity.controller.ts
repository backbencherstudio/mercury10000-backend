import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import {
  CreateCommentDto,
  CreatePostDto,
} from './dto/create-postcommunity.dto'; // Assume you have JWT guard
import { PostCommunityService } from './postcommunity.service';

@ApiTags('Post Community')
@ApiBearerAuth() // For Swagger Auth
@UseGuards(JwtAuthGuard)
@Controller('post-community')
export class PostCommunityController {
  constructor(private readonly postService: PostCommunityService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new community post' })
  @ApiBody({ type: CreatePostDto })
  @ApiConsumes('multipart/form-data')
  createPost(@Req() req, @Body() dto: CreatePostDto) {
    return this.postService.createPost(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all community posts' })
  getAllPosts() {
    return this.postService.getAllPosts();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get post details with comments and counts' })
  getPost(@Param('id') id: string) {
    return this.postService.getPostDetail(id);
  }

  @Post(':id/like')
  @ApiOperation({ summary: 'Like or unlike a post' })
  toggleLike(@Req() req, @Param('id') id: string) {
    return this.postService.toggleLike(req.user.id, id);
  }

  @Post(':id/comment')
  @ApiOperation({ summary: 'Add a comment or reply to a post' })
  addComment(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.postService.createComment(req.user.id, id, dto);
  }
}
