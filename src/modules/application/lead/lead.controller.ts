import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { CreateLeadResDto } from 'src/modules/application/lead/dto/res-lead.dto';
import { ApiAllAuth } from 'src/modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { LeadService } from './lead.service';

@ApiTags('Leads')
@ApiAllAuth()
@UseGuards(JwtAuthGuard)
@Controller('leads')
export class LeadController {
  constructor(private readonly leadService: LeadService) {}

  @Post()
  @ApiOperation({ summary: 'Create Lead' })
  @ApiResponse({
    status: 201,
    description: 'Lead created successfully',
    type: CreateLeadResDto,
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('files'))
  @ApiBody({
    type: CreateLeadResDto,
  })
  async create(
    @Body() dto: CreateLeadResDto,
    @Req() req: Request,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const userId = req.user.userId;
    console.log(userId);
    return this.leadService.createLead(dto, files, userId);
  }

  @Get('all')
  @ApiOperation({ summary: 'Get all leads' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiResponse({
    status: 201,
    description: 'Lead created successfully',
    type: CreateLeadResDto,
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  async getLeads(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
    @Req() req: Request,
  ) {
    return await this.leadService.getAllLeads({ page, limit }, req.user.userId);
  }
}
