import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ApiAllAuth } from 'src/modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import {
  CreateGiftcardDto,
  SendBulkRewardDto,
} from './dto/create-giftcard.dto';
import { GiftcardService } from './giftcard.service';

@ApiTags('Giftcard') // Swagger Documentation categorization
@ApiAllAuth()
@UseGuards(JwtAuthGuard)
@Controller('giftcard')
export class GiftcardController {
  constructor(private readonly giftcardService: GiftcardService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new giftcard' })
  @ApiBody({ type: CreateGiftcardDto })
  @ApiResponse({ status: 201, description: 'Giftcard created successfully.' })
  async create(@Body() createGiftcardDto: CreateGiftcardDto, @Req() req: any) {
    const userId = req.user.userId;
    return await this.giftcardService.create(createGiftcardDto, userId);
  }

  @Post('send-reward')
  @ApiOperation({ summary: 'Send selected gift to multiple users' })
  @ApiBody({ type: SendBulkRewardDto })
  @ApiResponse({ status: 200, description: 'Users rewarded successfully.' })
  async sendReward(@Body() dto: SendBulkRewardDto) {
    return await this.giftcardService.sendBulkReward(dto);
  }

  @Get('all-gift-status')
  @ApiOperation({ summary: 'Get all giftcards' })
  @ApiResponse({ status: 200, description: 'Return all giftcards.' })
  async getAllGiftStatus() {
    return await this.giftcardService.getAllGiftStatus();
  }

  @Get()
  @ApiOperation({ summary: 'Get all giftcards' })
  @ApiResponse({ status: 200, description: 'Return all giftcards.' })
  async findAll() {
    return await this.giftcardService.findAll();
  }



  @Get(':id')
  @ApiOperation({ summary: 'Get a specific giftcard by ID' })
  async findOne(@Param('id') id: string) {
    return await this.giftcardService.findOne(id);
  }
}
