import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateCommentDto,
  CreatePostDto,
} from './dto/create-postcommunity.dto';

@Injectable()
export class PostCommunityService {
  constructor(private prisma: PrismaService) {}

  // 1. Create a Post
  async createPost(userId: string, dto: CreatePostDto) {
    const post = await this.prisma.postCommunity.create({
      data: {
        ...dto,
        author_id: userId,
      },
    });

    return {
      message: 'Post created successfully',
      status: 200,
      data: post,
    };
  }

  async getAllPosts() {
    const posts = await this.prisma.postCommunity.findMany({
      include: {
        user: {
          select: { id: true, first_name: true, last_name: true, avatar: true },
        },
        _count: { select: { likes: true, comments: true } },
        comments: {
          where: { parent_id: null }, // Fetch root comments first
          include: {
            user: { select: { first_name: true, avatar: true } },
            replies: {
              // Nested replies logic
              include: { user: { select: { first_name: true, avatar: true } } },
            },
          },
          orderBy: { created_at: 'desc' },
        },
      },
    });

    return {
      message: 'Posts fetched successfully',
      status: 200,
      data: posts,
    };
  }

  // 2. Get Post Details (With like count and nested comments)
  async getPostDetail(postId: string) {
    const post = await this.prisma.postCommunity.findUnique({
      where: { id: postId },
      include: {
        user: {
          select: { id: true, first_name: true, last_name: true, avatar: true },
        },
        _count: { select: { likes: true, comments: true } },
        comments: {
          where: { parent_id: null }, // Fetch root comments first
          include: {
            user: { select: { first_name: true, avatar: true } },
            replies: {
              // Nested replies logic
              include: { user: { select: { first_name: true, avatar: true } } },
            },
          },
          orderBy: { created_at: 'desc' },
        },
      },
    });

    if (!post) throw new NotFoundException('Post not found');
    return { message: 'Post fetched successfully', status: 200, data: post };
  }

  // 3. Toggle Like Logic (Scalable way)
  async toggleLike(userId: string, postId: string) {
    const existingLike = await this.prisma.postLike.findUnique({
      where: { post_id_user_id: { post_id: postId, user_id: userId } },
    });

    if (existingLike) {
      await this.prisma.postLike.delete({ where: { id: existingLike.id } });
      return { message: 'Unliked successfully', liked: false };
    }

    await this.prisma.postLike.create({
      data: { post_id: postId, user_id: userId },
    });
    return { message: 'Liked successfully', liked: true };
  }

  // 4. Create Comment/Reply
  async createComment(userId: string, postId: string, dto: CreateCommentDto) {
    const comment = await this.prisma.comment.create({
      data: {
        content: dto.content,
        post_id: postId,
        author_id: userId,
        parent_id: dto.parent_id || null, // If parent_id exists, it's a reply
      },
    });

    return {
      message: 'Comment created successfully',
      status: 200,
      data: comment,
    };
  }
}
