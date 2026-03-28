import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { PaginationDto } from 'src/common/pagination';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageGateway } from './message.gateway';
import { MessageService } from './message.service';

@ApiBearerAuth()
@ApiTags('Message')
@UseGuards(JwtAuthGuard)
@Controller('chat/message')
export class MessageController {
  constructor(
    private readonly messageService: MessageService,
    private readonly messageGateway: MessageGateway,
  ) {}

  //*send message
  @Post('send-message')
  @ApiOperation({
    summary: 'Send a message',
    description:
      'Hits the REST endpoint and emits a `message` event to the `conversationId` room via Socket.io.',
  })
  @UseInterceptors(
    FilesInterceptor('attachments', 10, {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  async create(
    @Body() createMessageDto: CreateMessageDto,
    @Req() req: any,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const user = req.user.userId;
    console.log(`User ID: ${user}`);
    return this.messageService.create(createMessageDto, user, files);
  }

  //*get all message for a conversation
  @Get('all-message/:conversationId')
  @ApiOperation({
    summary: 'Get all messages for a conversation',
    description:
      'Retrieves paginated messages and receiver info. Ensure you join the socket room after calling this.',
  })
  @ApiParam({
    name: 'conversationId',
    description: 'The unique ID of the conversation',
  })
  @ApiQuery({ type: PaginationDto }) // PaginationDto er fields (page, perPage) Swagger e dekhabe
  @ApiResponse({ status: 200, description: 'Messages retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @Param('conversationId') conversationId: string,
    @Query() paginationdto: PaginationDto,
    @Req() req: any,
  ) {
    const user = req.user.userId;
    return this.messageService.findAll(conversationId, user, paginationdto);
  }

  // delete message
  @Delete('delete-message/:messageId')
  async deleteMessage(@Param('messageId') messageId: string, @Req() req: any) {
    const user = req.user.userId;
    return this.messageService.deleteMessage(user, messageId);
  }

  // unread message count
  @Get('unread-message/:conversationId')
  async getUnreadMessageCount(
    @Param('conversationId') conversationId: string,
    @Req() req: any,
  ) {
    const user = req.user.userId;
    return this.messageService.getUnreadMessage(user, conversationId);
  }

  // read messages
  @Get('read-message/:conversationId')
  async readMessages(
    @Param('conversationId') conversationId: string,
    @Req() req: any,
  ) {
    const user = req.user.userId;
    return this.messageService.readMessages(user, conversationId);
  }
}
