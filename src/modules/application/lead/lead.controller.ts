import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Patch,
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
import {
  CreateLeadResDto,
  GetLeadActivityResponseDto,
  GetLeadMeetingDetailsDto,
  GetLeadsQueryDto,
  GetLeadsResponseDto,
  LeadActivityQueryDto,
  LeadActivityResponseDto,
  UpdateLeadScheduleDto,
  UpdateLeadStatusDto,
} from 'src/modules/application/lead/dto/res-lead.dto';
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
    @UploadedFiles() files?: Express.Multer.File[],
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
    @Query() query: GetLeadsQueryDto,
    @Req() req: Request,
  ) {
    return await this.leadService.getAllLeads(query, req.user.userId);
  }

  @Get('in-process')
  @ApiOperation({
    summary: 'Get all leads in process - Sup Admin',
    description:
      'Fetches leads that are currently in process (SCHEDULED, ACTIVE, etc.). Filters out "SUBMITTED" status by default.',
  })
  @ApiResponse({
    status: 200,
    description: 'Leads fetched successfully',
    type: GetLeadsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getInProcessLeads(@Query() query: GetLeadsQueryDto, @Req() req: any) {
    const userId = req.user.userId;
    return await this.leadService.getAllLeadsInProcess(query, userId);
  }

  @Get('lead-activity')
  @ApiOperation({
    summary: 'Get lead activity overview',
    description:
      'Returns counts and lists for Submitted, Qualified, and Converted leads for the logged-in user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Success',
    type: GetLeadActivityResponseDto,
  })
  async getLeadActivity(@Req() req: any) {
    const userId = req.user.userId;
    return await this.leadService.getUserLeadActivity(userId);
  }

  @Get('dashboard/submission-activity')
  @ApiOperation({ summary: 'Get lead submission activity for chart' })
  @ApiResponse({ status: 200, type: LeadActivityResponseDto })
  async getSubmissionActivity(@Query() query: LeadActivityQueryDto) {
    const year = query.year || new Date().getFullYear().toString();
    return await this.leadService.getSubmissionActivity(year);
  }

  // Single Lead Get API
  @Get(':id')
  @ApiOperation({ summary: 'Get Lead by ID' })
  @ApiResponse({
    status: 200,
    description: 'Lead fetched successfully',
    type: CreateLeadResDto,
  })
  async getLeadById(@Param('id') id: string) {
    return await this.leadService.findOne(id);
  }

  // Lead Schedule Time Update API
  @Patch(':id/schedule')
  @ApiOperation({ summary: 'Update Lead Schedule Time by Sup Admin' })
  @ApiResponse({
    status: 200,
    description: 'Lead schedule time updated successfully',
    type: UpdateLeadScheduleDto,
  })
  @ApiBody({
    type: UpdateLeadScheduleDto,
  })
  async updateSchedule(
    @Param('id') id: string,
    @Req() req: Request,
    @Body() updateLeadScheduleDto: UpdateLeadScheduleDto,
  ) {
    const userId = req.user.userId;
    return await this.leadService.setScheduleTime(
      id,
      userId,
      updateLeadScheduleDto,
    );
  }

  // Lead Status Update API
  @Patch(':id/status')
  @ApiOperation({ summary: 'Update Lead Status by Sup Admin' })
  @ApiResponse({
    status: 200,
    description: 'Lead status updated successfully',
    type: UpdateLeadStatusDto,
  })
  @ApiBody({
    type: UpdateLeadStatusDto,
  })
  async updateLeadStatus(
    @Param('id') id: string,
    @Req() req: Request,
    @Body() updateLeadStatusDto: UpdateLeadStatusDto,
  ) {
    const userId = req.user.userId;
    return await this.leadService.updateLeadStatus(
      id,
      userId,
      updateLeadStatusDto,
    );
  }

  @Get(':id/meeting-details')
  @ApiOperation({ summary: 'Get Lead Meeting Details' })
  @ApiResponse({
    status: 200,
    description: 'Lead meeting details fetched successfully',
    type: GetLeadMeetingDetailsDto,
  })
  async getLeadMeetingDetails(@Param('id') id: string) {
    return await this.leadService.getLeadMeetingDetails(id);
  }

  @Get('lead-count/:user_id')
  @ApiOperation({
    summary: 'Get Lead Status Statistics',
    description:
      'Returns count of leads in each status (SUBMITTED, ACTIVE, etc.)',
  })
  async getLeadStatusStats(@Req() req: any, @Param('user_id') user_id: string) {
    const userId = req.user.userId;
    return await this.leadService.getLeadStatusStats(userId, user_id);
  }
}
