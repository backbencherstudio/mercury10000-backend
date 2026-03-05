import { Test, TestingModule } from '@nestjs/testing';
import { PostCommunityService } from './postcommunity.service';

describe('PostCommunityService', () => {
  let service: PostCommunityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PostCommunityService],
    }).compile();

    service = module.get<PostCommunityService>(PostCommunityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
