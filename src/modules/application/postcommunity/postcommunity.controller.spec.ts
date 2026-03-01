import { Test, TestingModule } from '@nestjs/testing';
import { PostcommunityController } from './postcommunity.controller';
import { PostcommunityService } from './postcommunity.service';

describe('PostcommunityController', () => {
  let controller: PostcommunityController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PostcommunityController],
      providers: [PostcommunityService],
    }).compile();

    controller = module.get<PostcommunityController>(PostcommunityController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
