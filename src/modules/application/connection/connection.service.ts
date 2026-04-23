import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateConnectionRequestDto } from 'src/modules/application/connection/dto/create-connection.dto';
import { PrismaService } from 'src/prisma/prisma.service';


@Injectable()
export class ConnectionRequestService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create Request (Only for SUP_ADMIN)
   */
  async createRequest(dto: CreateConnectionRequestDto, userId: string) {
    // ১. চেক করা ইউজার সুপার অ্যাডমিন কিনা
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { type: true },
    });

    if (!user || user.type !== 'SUP_ADMIN') {
      throw new ForbiddenException('Only Super Admin can create connection requests.');
    }

    // ২. Trade_id ভ্যালিডেশন
    const trade = await this.prisma.trade.findUnique({ where: { id: dto.trade_id } });
    if (!trade) throw new BadRequestException('Invalid Trade ID');

    // ৩. রিকোয়েস্ট তৈরি
    const request = await this.prisma.connectionRequest.create({
      data: {
        trade_id: dto.trade_id,
        location: dto.location,
        city: dto.city,
        description: dto.description,
        status: 'OPEN',
      },
      include: { trade: true }
    });

    return {
      success: true,
      message: 'Connection request opened successfully',
      data: request,
    };
  }

  /**
   * Admin Listing (Shows everything)
   */
  async getAllRequestsForAdmin() {
    const data = await this.prisma.connectionRequest.findMany({
      include: { 
        trade: true,
        _count: { select: { responses: true } } // কয়জন ইউজার রেসপন্স করেছে তা দেখা যাবে
      },
      orderBy: { created_at: 'desc' },
    });

    return {
      success: true,
      data,
    };
  }

  /**
   * Delete Request
   */
  async deleteRequest(id: string) {
    const exists = await this.prisma.connectionRequest.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Request not found');

    await this.prisma.connectionRequest.delete({ where: { id } });

    return {
      success: true,
      message: 'Connection request deleted successfully',
    };
  }
}