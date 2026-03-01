import { Test, TestingModule } from '@nestjs/testing';
import { PostcommunityService } from './postcommunity.service';

describe('PostcommunityService', () => {
  let service: PostcommunityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PostcommunityService],
    }).compile();

    service = module.get<PostcommunityService>(PostcommunityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
