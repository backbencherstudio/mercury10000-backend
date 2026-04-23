import { Test, TestingModule } from '@nestjs/testing';
import { ConnectionRequestService } from './connection.service';

describe('ConnectionService', () => {
  let service: ConnectionRequestService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConnectionRequestService],
    }).compile();

    service = module.get<ConnectionRequestService>(ConnectionRequestService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
