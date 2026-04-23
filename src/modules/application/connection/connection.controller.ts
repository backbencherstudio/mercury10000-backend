import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ConnectionRequestService } from 'src/modules/application/connection/connection.service';
import { CreateConnectionRequestDto } from 'src/modules/application/connection/dto/create-connection.dto';
import { ApiAllAuth } from 'src/modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';

@ApiTags('Connection Request (Admin)')
@ApiAllAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/connection-requests')
export class ConnectionRequestAdminController {
  constructor(private readonly connectionService: ConnectionRequestService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new connection request' })
  @ApiResponse({ status: 201, description: 'Request created successfully' })
  async create(@Body() dto: CreateConnectionRequestDto, @Req() req: any) {
    const userId = req.user.userId;
    return await this.connectionService.createRequest(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all connection requests for admin' })
  async findAll() {
    return await this.connectionService.getAllRequestsForAdmin();
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a connection request' })
  async remove(@Param('id') id: string) {
    return await this.connectionService.deleteRequest(id);
  }
}
