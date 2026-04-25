import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController, ApiTags } from '@nestjs/swagger';
import { UserService } from './user.service';

@ApiTags('User')
@ApiExcludeController()
@Controller('chat/user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async findAll() {
    try {
      const users = await this.userService.findAll();
      return users;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
