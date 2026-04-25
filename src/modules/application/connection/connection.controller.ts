import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
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
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ConnectionRequestService } from 'src/modules/application/connection/connection.service';
import {
  AssignUsersToConnectionDto,
  ConnectionStatusResponseDto,
  CreateConnectionRequestDto,
  CreateConnectionResponseDto,
  GetConnectionStatusQueryDto,
} from 'src/modules/application/connection/dto/create-connection.dto';
import { UpdateConnectionStatusDto } from 'src/modules/application/connection/dto/update-connection.dto';
import { ApiAllAuth } from 'src/modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';

@ApiTags('Connection Request (Admin)')
@ApiAllAuth()
@UseGuards(JwtAuthGuard)
@Controller('connection-requests')
export class ConnectionRequestAdminController {
  constructor(private readonly connectionService: ConnectionRequestService) {}

  @Post('admin/create')
  @ApiOperation({ summary: 'Create a new connection request' })
  @ApiResponse({ status: 201, description: 'Request created successfully' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('files'))
  @ApiBody({
    type: CreateConnectionRequestDto,
  })
  async create(
    @Body() dto: CreateConnectionRequestDto,
    @Req() req: any,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const userId = req.user.userId;
    return await this.connectionService.createRequest(dto, userId, files);
  }

  @Get('admin/all')
  @ApiOperation({ summary: 'Get all connection requests for admin' })
  async findAll(@Req() req: any) {
    const userId = req.user.userId;
    return await this.connectionService.getAllRequestsForAdmin(userId);
  }

@Get('status-list')
  @ApiOperation({ 
    summary: 'Get paginated list of assigned users with response status',
    description: 'Supports pagination, search (User Name/Lead ID), and Trade filter.' 
  })
  @ApiResponse({ 
    status: 200, 
    type: ConnectionStatusResponseDto 
  })
  async getConnectionStatus(@Query() query: GetConnectionStatusQueryDto) {
    return await this.connectionService.getConnectionStatusList(query);
  }

  @Get('user/list')
  @ApiOperation({
    summary: 'Get all open/fulfilled connection requests for users',
  })
  async findAllUser(@Req() req: any) {
    return await this.connectionService.getAllRequestsForUser(req.user.userId);
  }

  @Patch(':id/assign-users')
  @ApiOperation({ summary: 'Assign specific users to a connection request' })
  @ApiBody({
    type: AssignUsersToConnectionDto,
  })
  async assignUsers(
    @Param('id') id: string,
    @Body() dto: AssignUsersToConnectionDto,
  ) {
    return await this.connectionService.assignUsersToRequest(id, dto.user_ids);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a single connection request' })
  async findOne(@Param('id') id: string) {
    return await this.connectionService.getSingleRequest(id);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit a contractor referral' })
  async submitResponse(
    @Param('id') id: string,
    @Body() dto: CreateConnectionResponseDto,
    @Req() req: any,
  ) {
    return await this.connectionService.submitUserResponse(
      id,
      dto,
      req.user.userId,
    );
  }

  // request see all user
  @Get(':id/responses')
  @ApiOperation({ summary: 'Get all user responses for a specific request' })
  async getResponses(@Param('id') id: string) {
    return await this.connectionService.getResponsesByRequestId(id);
  }

  // request Fulfilled mark
  @Patch(':id/status')
  @ApiOperation({ summary: 'Update request status to FULFILLED' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateConnectionStatusDto,
  ) {
    return await this.connectionService.updateRequestStatus(id, dto.status);
  }

  @Delete('admin/:id')
  @ApiOperation({ summary: 'Delete a connection request' })
  async remove(@Param('id') id: string) {
    return await this.connectionService.deleteRequest(id);
  }
}
