import { Module } from '@nestjs/common';
import { PostCommunityController } from './postcommunity.controller';
import { PostCommunityService } from './postcommunity.service';

@Module({
  controllers: [PostCommunityController],
  providers: [PostCommunityService],
})
export class PostcommunityModule {}
