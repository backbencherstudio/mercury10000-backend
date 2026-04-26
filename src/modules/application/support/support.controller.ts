import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  // CreateSupportTicketDto,
  SecretaryNoteDto,
  UpdateSupportStatusDto,
} from 'src/modules/application/support/dto/create-support.dto';
import { ApiAllAuth } from 'src/modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { SupportService } from './support.service';

@ApiTags('Support Management')
@ApiAllAuth()
@UseGuards(JwtAuthGuard)
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('request')
  @ApiOperation({ summary: 'User creates a support request' })
  async createTicket(@Req() req: any) {
    return this.supportService.createTicket(req.user.userId);
  }

  @Patch(':id/secretary-note')
  @ApiOperation({ summary: 'Secretary adds a note and marks as SOLVED' })
  async addSecretaryNote(
    @Param('id') id: string,
    @Body() dto: SecretaryNoteDto,
  ) {
    return this.supportService.addSecretaryNote(id, dto);
  }

  @Patch(':id/resolve')
  @ApiOperation({ summary: 'Admin resolves the ticket and notifies user' })
  async resolveTicket(
    @Param('id') id: string,
    @Body() dto: UpdateSupportStatusDto,
  ) {
    return this.supportService.resolveTicket(id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all support tickets for Admin/Secretary' })
  async findAll() {
    return this.supportService.findAll();
  }
}
