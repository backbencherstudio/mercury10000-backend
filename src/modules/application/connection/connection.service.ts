import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConnectionStatus, Prisma } from '@prisma/client';
import { TajulStorage } from 'src/common/lib/Disk/TajulStorage';
import {
  CreateConnectionRequestDto,
  CreateConnectionResponseDto,
} from 'src/modules/application/connection/dto/create-connection.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ConnectionRequestService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create Request (Only for SUP_ADMIN)
   */
  async createRequest(
    dto: CreateConnectionRequestDto,
    userId: string,
    files?: Express.Multer.File[],
  ) {
    // 1. Auth Check
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { type: true },
    });

    if (!user || user.type !== 'SUP_ADMIN') {
      throw new ForbiddenException(
        'Only Super Admin can create connection requests.',
      );
    }

    // 2. Trade Validation
    const trade = await this.prisma.trade.findUnique({
      where: { id: dto.trade_id },
    });
    if (!trade) throw new BadRequestException('Invalid Trade ID');

    let fileName = '';
    const folder = 'connection_requests';
    const file = files && files.length > 0 ? files[0] : null;

    try {
      // 3. File Upload Logic
      if (file) {
        fileName = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
        const fullPath = `${folder}/${fileName}`;
        await TajulStorage.put(fullPath, file.buffer);
      }

      // 4. Create Request with Nested Attachment
      const request = await this.prisma.connectionRequest.create({
        data: {
          trade_id: dto.trade_id,
          location: dto.location,
          city: dto.city,
          description: dto.description,
          status: 'OPEN',
          // user_id: userId, // Tracking which admin created it
          // FIX: Nested creation for Attachment model
          files: fileName
            ? {
                create: {
                  name: file.originalname,
                  type: file.mimetype,
                  path: fileName,
                },
              }
            : undefined,
        },
        include: {
          trade: true,
          files: true,
        },
      });

      return {
        success: true,
        message: 'Connection request opened successfully',
        data: request,
      };
    } catch (error) {
      // 5. Cleanup on failure
      if (fileName) {
        const fullPath = `${folder}/${fileName}`;
        await TajulStorage.delete(fullPath).catch(() => null);
      }

      if (error.code === 'P2002') {
        throw new BadRequestException(
          'Lead number conflict or trade already assigned.',
        );
      }

      if (error instanceof HttpException) {
        throw error;
      }
      throw new BadRequestException(
        error.message || 'Request creation failed.',
      );
    }
  }

  /**
   * Admin Listing (Shows everything)
   */
  async getAllRequestsForAdmin(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { type: true },
    });

    if (!user || user.type !== 'SUP_ADMIN') {
      throw new ForbiddenException(
        'Only Super Admin can create connection requests.',
      );
    }
    const data = await this.prisma.connectionRequest.findMany({
      include: {
        trade: true,
        _count: { select: { responses: true } }, // how many users have responded to the request
      },
      orderBy: { created_at: 'desc' },
    });

    return {
      success: true,
      message: 'Connection requests fetched successfully',
      data: {
        ...data,
      },
    };
  }

  async getConnectionStatusList(query: any) {
    const { page = 1, limit = 10, search, trade_id } = query;
    const skip = (page - 1) * limit;

    // ১. Dynamic Filter Condition
    const where: Prisma.ConnectionRequestWhereInput = {
      targeted_users: { some: {} }, // Shudhu shei request jekhane user assign kora ache
      ...(trade_id && { trade_id }),
      ...(search && {
        OR: [
          { id: { contains: search, mode: 'insensitive' } },
          {
            targeted_users: {
              some: {
                name: { contains: search, mode: 'insensitive' },
              },
            },
          },
        ],
      }),
    };

    // ২. Optimized Query with Promise.all
    const [total, requests] = await Promise.all([
      this.prisma.connectionRequest.count({ where }),
      this.prisma.connectionRequest.findMany({
        where,
        skip,
        take: limit,
        include: {
          trade: true,
          targeted_users: {
            include: {
              _count: {
                select: {
                  targeted_requests: true, // Total Assigned by Admin
                  connectionResponses: true, // Total Lead Sent by User
                },
              },
              connectionResponses: {
                orderBy: { created_at: 'desc' },
                take: 1,
                select: { created_at: true },
              },
            },
          },
          responses: {
            select: { user_id: true }, // Kon user response koreche sheta check korte
          },
        },
        orderBy: { created_at: 'desc' },
      }),
    ]);

    // ৩. UI Column Format onujayi Data Mapping
    const formattedData = requests.flatMap((req) =>
      req.targeted_users.map((user) => {
        // Logic: Check if this user submitted contractor details for this specific request
        const hasResponded = req.responses.some(
          (res) => res.user_id === user.id,
        );

        return {
          user_id: user.id.slice(-4), // UI-te choto ID dekhate
          lead_id: req.id.slice(-4),
          user_name: user.name,
          trade: req.trade.name,
          num_connection_sent_by_us: 1,
          total_assigned_connection: user._count.targeted_requests,
          last_lead_he_sent: user.connectionResponses[0]?.created_at || 'N/A',
          total_leads_he_sent: user._count.connectionResponses,
          response_from_user: hasResponded ? 'YES' : 'NO',
          action: req.id, // For 'View' or 'Edit' button
        };
      }),
    );

    return {
      success: true,
      message: 'Status list fetched successfully',
      data: formattedData,
      meta: {
        total_items: total,
        current_page: page,
        limit: limit,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * User Listing: Shows requests with a flag if the user already responded
   */
  async getAllRequestsForUser(userId: string) {
    const requests = await this.prisma.connectionRequest.findMany({
      include: {
        trade: true,
        responses: {
          where: { user_id: userId },
          select: { id: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    // Formatting for UI (Status: Open/Fulfilled and already_responded flag)
    const data = requests.map((req) => ({
      id: req.id,
      trade: req.trade.name,
      location: req.location,
      status: req.status, // OPEN or FULFILLED
      time_ago: req.created_at, // Frontend will format as "2 hours ago"
      already_responded: req.responses.length > 0,
    }));

    return { success: true, data };
  }

  async assignUsersToRequest(requestId: string, userIds: string[]) {
    const request = await this.prisma.connectionRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException(
        `Connection request with ID ${requestId} not found`,
      );
    }

    try {
      const updatedRequest = await this.prisma.connectionRequest.update({
        where: { id: requestId },
        data: {
          targeted_users: {
            set: userIds.map((id) => ({ id })),
          },
        },
        include: {
          trade: true,
          targeted_users: {
            select: {
              id: true,
              name: true,
              phone_number: true,
              email: true,
            },
          },
        },
      });

      //  (Optional) Notification Logic

      return {
        success: true,
        message: `${userIds.length} users have been successfully assigned to this connection request.`,
        data: updatedRequest,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to assign users: ${error.message}`);
    }
  }

  /**
   * Get Single Request
   */
  async getSingleRequest(id: string) {
    const request = await this.prisma.connectionRequest.findUnique({
      where: { id },
      include: { trade: true },
    });

    if (!request) throw new NotFoundException('Connection request not found');

    return { success: true, data: request };
  }

  /**
   * Submit Response: The core business logic
   */
  async submitUserResponse(
    requestId: string,
    dto: CreateConnectionResponseDto,
    userId: string,
  ) {
    // check request exists and status
    const request = await this.prisma.connectionRequest.findUnique({
      where: { id: requestId },
      include: { responses: { where: { user_id: userId } } },
    });

    if (!request) throw new NotFoundException('Request not found');

    //  request status check
    if (request.status === 'FULFILLED') {
      throw new BadRequestException('This request has already been fulfilled.');
    }

    //  user already submitted check
    if (request.responses.length > 0) {
      throw new BadRequestException(
        'You have already submitted a referral for this request.',
      );
    }

    //  response save
    const response = await this.prisma.connectionResponse.create({
      data: {
        connection_request_id: requestId,
        user_id: userId,
        contractor_name: dto.contractor_name,
        contractor_phone: dto.contractor_phone,
        note: dto.note,
      },
    });

    return {
      success: true,
      message: 'Your referral has been submitted successfully.',
      data: response,
    };
  }

  /**
   * Admin: Get all responses for a request to review contractors
   */
  async getResponsesByRequestId(requestId: string) {
    const request = await this.prisma.connectionRequest.findUnique({
      where: { id: requestId },
      include: {
        trade: true,
        responses: {
          include: {
            user: { select: { name: true, phone_number: true, email: true } },
          },
          orderBy: { created_at: 'asc' },
        },
      },
    });

    if (!request) throw new NotFoundException('Connection request not found');

    return {
      success: true,
      data: request,
    };
  }

  /**
   * Admin: Mark a request as FULFILLED
   */
  async updateRequestStatus(id: string, status: ConnectionStatus) {
    // check request exists
    const request = await this.prisma.connectionRequest.findUnique({
      where: { id },
    });
    if (!request) throw new NotFoundException('Request not found');

    // update request status
    const updatedRequest = await this.prisma.connectionRequest.update({
      where: { id },
      data: {
        status: status,
        updated_at: new Date(),
      },
    });

    return {
      success: true,
      message: `Request status updated to ${status} successfully.`,
      data: updatedRequest,
    };
  }

  /**
   * Delete Request
   */
  async deleteRequest(id: string) {
    const exists = await this.prisma.connectionRequest.findUnique({
      where: { id },
    });
    if (!exists) throw new NotFoundException('Request not found');

    await this.prisma.connectionRequest.delete({ where: { id } });

    return {
      success: true,
      message: 'Connection request deleted successfully',
      id: id,
      data: null,
    };
  }
}
