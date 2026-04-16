import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Post,
  Query,
  UploadedFiles,
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
import { CreateLeadResDto } from 'src/modules/application/lead/dto/res-lead.dto';
import { LeadService } from './lead.service';

@ApiTags('Leads')
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
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.leadService.createLead(dto, files);
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
  ) {
    return await this.leadService.getAllLeads({ page, limit });
  }
}
