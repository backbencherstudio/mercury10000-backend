import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LeadStatus, Prisma } from '@prisma/client';
import { TajulStorage } from 'src/common/lib/Disk/TajulStorage';
import { NotificationRepository } from 'src/common/repository/notification/notification.repository';
import appConfig from 'src/config/app.config';
import {
  CreateLeadResDto,
  GetAllSeeUserQueryDto,
  GetLeadsQueryDto,
  LeadActivityMonthWiseQueryDto,
  UpdateLeadScheduleDto,
  UpdateLeadStatusDto,
} from 'src/modules/application/lead/dto/res-lead.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class LeadService {
  constructor(
    private readonly prisma: PrismaService,
    private notificationRepo: NotificationRepository,
  ) {}

  // create lead
  async createLead(
    dto: CreateLeadResDto,
    files?: Express.Multer.File[],
    userId?: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { type: true, name: true, email: true },
    });

    if (!user || user.type !== 'USER') {
      throw new ForbiddenException('Only users can create leads.');
    }

    if (dto.trade_id) {
      const tradeExists = await this.prisma.trade.findUnique({
        where: { id: dto.trade_id },
      });
      if (!tradeExists) {
        throw new BadRequestException('The provided trade_id does not exist.');
      }
    }

    let fileName = '';
    const folder = 'leads';
    const file = files && files.length > 0 ? files[0] : null;

    try {
      if (file) {
        fileName = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
        const fullPath = `${folder}/${fileName}`;
        await TajulStorage.put(fullPath, file.buffer);
      }

      return await this.prisma.$transaction(async (tx) => {
        const count = await tx.lead.count();
        const next_lead_no = (count + 100).toString();

        const lead = await tx.lead.create({
          data: {
            lead_no: next_lead_no,
            name: dto.name,
            phone: dto.phone,
            address: dto.address,
            notes: dto.notes,
            status: 'SUBMITTED',
            trade: dto.trade_id ? { connect: { id: dto.trade_id } } : undefined,
            user: { connect: { id: userId } },
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
        // 2. Fetch all Super Admins dynamically
        const superAdmins = await this.prisma.user.findMany({
          where: {
            type: 'SUP_ADMIN', // Ensure this matches your Enum or String value in DB
            status: 1, // Only active admins
          },
          select: { id: true },
        });

        // 3. Send notifications to each Super Admin
        if (superAdmins.length > 0) {
          const notificationPromises = superAdmins.map((admin) =>
            this.notificationRepo
              .createNotification({
                sender_id: userId,
                receiver_id: admin.id,
                text: `${user.name || 'A user'} submitted a new lead: #${lead.lead_no}`,
                type: 'new_lead_submitted',
                entity_id: lead.id,
                payload: {
                  lead_no: lead.lead_no,
                },
              })
              .catch((err) =>
                console.error(
                  `Failed to notify Admin ${admin.id}:`,
                  err.message,
                ),
              ),
          );

          Promise.all(notificationPromises);
        }
        return {
          success: true,
          message: 'Lead created successfully',
          data: lead,
        };
      });
    } catch (error) {
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
      throw new BadRequestException(error.message || 'Lead creation failed.');
    }
  }

  // get all leads
  async getAllLeads(query: GetLeadsQueryDto, userId: string) {
    const { page, limit, search, trade_id, status } = query;
    const skip = (page - 1) * limit;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { type: true },
    });

    if (!user) throw new NotFoundException('User not found');

    const where: Prisma.LeadWhereInput = {
      ...(user.type !== 'SUP_ADMIN' ? { user_id: userId } : {}),
      ...(trade_id ? { trade_id } : {}),
      ...(status !== 'SUBMITTED' ? { status: status as any } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { lead_no: { contains: search, mode: 'insensitive' } },
              { address: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, leads] = await Promise.all([
      this.prisma.lead.count({ where }),
      this.prisma.lead.findMany({
        where,
        skip,
        take: limit,
        include: {
          trade: true,
          files: true,
          user: { select: { name: true, email: true } },
        },
        orderBy: { created_at: 'desc' },
      }),
    ]);

    // Mapping through each lead to transform file paths
    const formattedLeads = leads.map((lead) => ({
      ...lead,
      files: lead.files.map((file) => ({
        ...file,
        // Generating full URL for each attachment
        path: TajulStorage.url(`${appConfig().storageUrl.leads}${file.path}`),
      })),
    }));

    return {
      success: true,
      message: 'Leads fetched successfully',
      data: formattedLeads,
      meta: {
        total_items: total,
        current_page: page,
        limit: limit,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async getDashboardStats() {
    const [
      totalUsers,
      newLeads,
      userRequests,
      giftsOverview,
      connectionRequests,
    ] = await Promise.all([
      // 1. Total Users
      this.prisma.user.count({
        where: { deleted_at: null, type: 'USER' },
      }),

      // 2. New Lead Received (Total Leads)
      this.prisma.lead.count(),

      // 3. User Requests (Assuming this maps to ConnectionRequest or similar logic)
      this.prisma.connectionRequest.count(),

      // 4. Gifts Overview (Total Rewards issued or GiftCards)
      this.prisma.userReward.count(),

      // 5. Connection Requests
      this.prisma.connectionRequest.count({
        where: { status: 'OPEN' }, // Specific filter if needed
      }),
    ]);

    return {
      total_users: totalUsers,
      new_lead_received: newLeads,
      user_requests: userRequests,
      gifts_overview: giftsOverview,
      connection_request: connectionRequests,
    };
  }

  // dashboard lead statistics
  async getLeadStatistics(year: number, userId: string) {
    // 1. User role check
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { type: true },
    });

    if (!user) throw new NotFoundException('User not found');

    // 2. Date Range Setup
    const startDate = new Date(year, 0, 1); // Jan 1st
    const endDate = new Date(year, 11, 31, 23, 59, 59); // Dec 31st

    // 3. Fetch Leads
    const leads = await this.prisma.lead.findMany({
      where: {
        created_at: {
          gte: startDate,
          lte: endDate,
        },
        status: 'SUBMITTED', // Status filter
        ...(user.type !== 'SUP_ADMIN' ? { user_id: userId } : {}),
      },
      select: {
        created_at: true,
      },
    });

    // 4. Initialize result array with 0
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    const stats = monthNames.map((name) => ({
      month: name,
      count: 0,
    }));

    // 5. Aggregate data
    leads.forEach((lead) => {
      const monthIndex = lead.created_at.getMonth(); // getMonth returns 0-11
      stats[monthIndex].count += 1;
    });

    return {
      success: true,
      data: stats,
    };
  }

  async getMonthlyLeadDetails(userId: string, year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999); // মাসের শেষ দিন

    //
    const leads = await this.prisma.lead.findMany({
      where: {
        user_id: userId,
        created_at: {
          gte: startDate,
          lte: endDate,
        },
        status: 'SUBMITTED',
      },
      include: {
        trade: {
          select: {
            id: true,
          },
        },
        files: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return {
      success: true,
      message: `Total ${leads.length} leads found for month ${month}`,
      data: leads,
    };
  }

  async getAllLeadsInProcess(query: GetLeadsQueryDto, userId: string) {
    const { page, limit, search, trade_id, status } = query;
    const skip = (page - 1) * limit;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { type: true },
    });

    if (!user) throw new NotFoundException('User not found');
    if (user.type !== 'SUP_ADMIN' && user.type !== 'SECRETARY') {
      throw new ForbiddenException(
        'Access denied. Only Super Admin and secretary can view in-process leads.',
      );
    }

    // Build Filter
    const where: Prisma.LeadWhereInput = {
      status: {
        not: 'SUBMITTED' as LeadStatus,
      },

      ...(status ? { status: status as LeadStatus } : {}),
      ...(trade_id ? { trade_id } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { lead_no: { contains: search, mode: 'insensitive' } },
              { address: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, leads] = await Promise.all([
      this.prisma.lead.count({ where }),
      this.prisma.lead.findMany({
        where,
        skip,
        take: limit,
        include: {
          trade: true,
          files: true,
          user: { select: { name: true } },
        },
        orderBy: { scheduled_time: 'asc' },
      }),
    ]);

    // Mapping through each lead to transform file paths
    const formattedLeads = leads.map((lead) => ({
      ...lead,
      files: lead.files.map((file) => ({
        ...file,
        // Generating full URL for each attachment
        path: TajulStorage.url(`${appConfig().storageUrl.leads}${file.path}`),
      })),
    }));

    return {
      success: true,
      message: 'In-process leads fetched successfully',
      data: formattedLeads,
      meta: {
        total_items: total,
        current_page: page,
        limit: limit,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  // get all submitted leads
  async getAllSubmitedLeads(query: GetLeadsQueryDto, userId: string) {
    const { page, limit, search, trade_id, status } = query;
    const skip = (page - 1) * limit;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { type: true },
    });

    if (!user) throw new NotFoundException('User not found');
    if (user.type !== 'SUP_ADMIN' && user.type !== 'SECRETARY') {
      throw new ForbiddenException(
        'Access denied. Only Super Admin and secretary can view in-process leads.',
      );
    }

    // Build Filter
    const where: Prisma.LeadWhereInput = {
      status: 'SUBMITTED' as LeadStatus,

      ...(trade_id ? { trade_id } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { lead_no: { contains: search, mode: 'insensitive' } },
              { address: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, leads] = await Promise.all([
      this.prisma.lead.count({ where }),
      this.prisma.lead.findMany({
        where,
        skip,
        take: limit,
        include: {
          trade: true,
          files: true,
          user: { select: { name: true } },
        },
        orderBy: { scheduled_time: 'asc' },
      }),
    ]);

    // Mapping through each lead to transform file paths
    const formattedLeads = leads.map((lead) => ({
      ...lead,
      files: lead.files.map((file) => ({
        ...file,
        // Generating full URL for each attachment
        path: TajulStorage.url(`${appConfig().storageUrl.leads}${file.path}`),
      })),
    }));

    return {
      success: true,
      message: 'In-process leads fetched successfully',
      data: formattedLeads,
      meta: {
        total_items: total,
        current_page: page,
        limit: limit,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  // get all shedoul, active, invalid,closed leads
  async getAllshedoulactiveinvalidleads(
    query: GetLeadsQueryDto,
    userId: string,
  ) {
    const { page, limit, search, trade_id, status } = query;
    const skip = (page - 1) * limit;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { type: true },
    });

    if (!user) throw new NotFoundException('User not found');
    if (user.type !== 'SUP_ADMIN' && user.type !== 'SECRETARY') {
      throw new ForbiddenException(
        'Access denied. Only Super Admin and secretary can view in-process leads.',
      );
    }

    // Build Filter
    const where: Prisma.LeadWhereInput = {
      status: {
        in: ['SCHEDULED', 'ACTIVE', 'INVALID', 'CLOSED'] as LeadStatus[],
      },

      ...(trade_id ? { trade_id } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { lead_no: { contains: search, mode: 'insensitive' } },
              { address: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, leads] = await Promise.all([
      this.prisma.lead.count({ where }),
      this.prisma.lead.findMany({
        where,
        skip,
        take: limit,
        include: {
          trade: true,
          files: true,
          user: { select: { name: true } },
        },
        orderBy: { scheduled_time: 'asc' },
      }),
    ]);

    // Mapping through each lead to transform file paths
    const formattedLeads = leads.map((lead) => ({
      ...lead,
      files: lead.files.map((file) => ({
        ...file,
        // Generating full URL for each attachment
        path: TajulStorage.url(`${appConfig().storageUrl.leads}${file.path}`),
      })),
    }));

    return {
      success: true,
      message: 'In-process leads fetched successfully',
      data: formattedLeads,
      meta: {
        total_items: total,
        current_page: page,
        limit: limit,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async getSeeAllUserLeads(query: GetAllSeeUserQueryDto, userId: string) {
    const { search, startDate, endDate, page = 1, limit = 10 } = query;

    const skip = (page - 1) * limit;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { type: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.type !== 'SUP_ADMIN' && user.type !== 'SECRETARY') {
      throw new ForbiddenException(
        'Access denied. Only Super Admin and secretary can view leads.',
      );
    }

    const whereCondition: any = {
      ...(search && {
        OR: [
          {
            lead_no: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            address: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
        ],
      }),

      ...(startDate &&
        endDate && {
          created_at: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        }),
    };

    const [leads, total] = await Promise.all([
      this.prisma.lead.findMany({
        where: whereCondition,
        include: {
          trade: true,
        },
        orderBy: {
          created_at: 'desc',
        },
        skip,
        take: Number(limit),
      }),

      this.prisma.lead.count({
        where: whereCondition,
      }),
    ]);

    const formattedLeads = leads.map((lead: any) => {
      const isSubmitted = lead.status === LeadStatus.SUBMITTED;
      const isActive = lead.status === LeadStatus.ACTIVE;
      const isScheduled = lead.status === LeadStatus.SCHEDULED;

      return {
        id: lead.id,
        lead_no: lead.lead_no,
        name: lead.name,
        phone: lead.phone,
        collected: lead.collected,

        lead_submitted_addr: isSubmitted ? lead.address : null,

        qualified_leads_addr:
          isSubmitted || isActive || isScheduled ? lead.address : null,

        conversation_addr: isActive || isScheduled ? lead.address : null,

        to_company: isActive || isScheduled ? lead.trade?.name || 'LMS' : null,

        starting_date: lead.scheduled_time
          ? lead.scheduled_time.toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })
          : 'N/A',

        status: lead.status,
        created_at: lead.created_at,
      };
    });

    return {
      data: formattedLeads,

      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // dashboard lead statistics
  async getUserStatistics(year: number, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { type: true },
    });

    if (!user) throw new NotFoundException('User not found');

    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    const leads = await this.prisma.lead.findMany({
      where: {
        created_at: {
          gte: startDate,
          lte: endDate,
        },
        status: 'SUBMITTED',
        ...(user.type !== 'SUP_ADMIN' ? { user_id: userId } : {}),
      },
      select: {
        created_at: true,
      },
    });

    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    // ekhane amra 'month' index add korchi (1-12)
    const stats = monthNames.map((name, index) => ({
      month_name: name,
      month: index + 1, // 1 for Jan, 2 for Feb...
      year: year, // Future reference er jonno year o pathiye dilam
      count: 0,
    }));

    leads.forEach((lead) => {
      const monthIndex = lead.created_at.getMonth();
      stats[monthIndex].count += 1;
    });

    return {
      success: true,
      data: stats,
    };
  }

  async updateCollectedStatus(id: string, collected: boolean) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
    });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }

    return await this.prisma.lead.update({
      where: { id },
      data: { collected },
      select: {
        id: true,
        lead_no: true,
        collected: true,
        updated_at: true,
      },
    });
  }

  // find one lead
  async findOne(id: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        trade: true,
        files: true,
      },
    });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }

    // Mapping through each lead to transform file paths
    const formattedLeads = lead.files.map((file) => ({
      ...file,
      // Generating full URL for each attachment
      path: TajulStorage.url(`${appConfig().storageUrl.leads}${file.path}`),
    }));

    return {
      success: true,
      message: 'Lead fetched successfully',
      data: {
        ...lead,
        files: formattedLeads,
      },
    };
  }

  // set schedule time update
  async setScheduleTime(
    id: string,
    userId: string,
    dto: UpdateLeadScheduleDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { type: true },
    });

    if (!user) throw new NotFoundException('User not found');
    if (user.type !== 'SUP_ADMIN') {
      throw new ForbiddenException('Only users can update lead schedule time.');
    }
    // First check if lead exists
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }

    // Update scheduled_time and change status to IN_PROGRESS (Lead in Process)
    const updatedLead = await this.prisma.lead.update({
      where: { id },
      data: {
        scheduled_time: new Date(dto.scheduled_time),
        status: 'SCHEDULED' as LeadStatus,
        updated_at: new Date(),
      },
    });

    return {
      success: true,
      message: 'Lead scheduled successfully',
      data: updatedLead,
    };
  }

  // lead status update
  async updateLeadStatus(id: string, userId: string, dto: UpdateLeadStatusDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { type: true },
    });

    if (!user) throw new NotFoundException('User not found');
    if (user.type !== 'SUP_ADMIN') {
      throw new ForbiddenException('Only users can update lead status.');
    }
    // First check if lead exists
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }

    // Update lead status
    const updatedLead = await this.prisma.lead.update({
      where: { id },
      data: {
        status: dto.status as LeadStatus,
        updated_at: new Date(),
      },
    });

    return {
      success: true,
      message: 'Lead status updated successfully',
      data: updatedLead,
    };
  }

  async getLeadMeetingDetails(id: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        address: true,
        scheduled_time: true,
        status: true,
      },
    });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }

    if (!lead.scheduled_time) {
      throw new BadRequestException('No meeting scheduled for this lead.');
    }

    return {
      success: true,
      message: 'Meeting details fetched successfully',
      data: {
        id: lead.id,
        customer_name: lead.name,
        address: lead.address,
        scheduled_time: lead.scheduled_time,
        status: lead.status,
      },
    };
  }

  async getLeadStatusStats(userId: string, user_id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { type: true },
    });

    if (!user) throw new NotFoundException('User not found');

    const [submittedCount, activeCount, scheduledCount] = await Promise.all([
      this.prisma.lead.count({
        where: {
          ...(user_id ? { user_id: user_id } : {}),
          status: 'SUBMITTED',
        },
      }),
      this.prisma.lead.count({
        where: {
          ...(user_id ? { user_id: user_id } : {}),
          status: 'ACTIVE',
        },
      }),
      this.prisma.lead.count({
        where: {
          ...(user_id ? { user_id: user_id } : {}),
          status: 'SCHEDULED',
        },
      }),
    ]);

    return {
      success: true,
      message: 'Lead statistics fetched successfully',
      data: {
        submitted: submittedCount,
        quality_leads: activeCount,
        conversions: scheduledCount,
      },
    };
  }

  async getUserLeadActivity(
    userId: string,
    query: LeadActivityMonthWiseQueryDto,
  ) {
    const { startDate, endDate } = query;

    // 1. Verify User
    const userExists = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!userExists) throw new NotFoundException('User not found');

    // 2. Build Date Filter
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    // Define base criteria to avoid repetition
    const baseWhere = {
      user_id: userId,
      ...(startDate || endDate ? { created_at: dateFilter } : {}),
    };

    // 3. Execute Parallel Queries
    const [submittedLeads, qualifiedLeads, convertedLeads] = await Promise.all([
      this.prisma.lead.findMany({
        where: { ...baseWhere, status: 'SUBMITTED' },
        select: { id: true, address: true, created_at: true },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.lead.findMany({
        where: { ...baseWhere, status: 'ACTIVE' },
        select: { id: true, address: true, created_at: true },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.lead.findMany({
        where: { ...baseWhere, status: 'SCHEDULED' },
        select: { id: true, address: true, created_at: true },
        orderBy: { created_at: 'desc' },
      }),
    ]);

    return {
      success: true,
      message: 'Lead activity fetched successfully',
      data: {
        submitted: {
          count: submittedLeads.length,
          items: submittedLeads,
        },
        qualified: {
          count: qualifiedLeads.length,
          items: qualifiedLeads,
        },
        conversions: {
          count: convertedLeads.length,
          items: convertedLeads,
        },
      },
    };
  }

  async getSubmissionActivity(year: string) {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    const activityData = await Promise.all(
      months.map(async (month, index) => {
        //
        const startDate = new Date(parseInt(year), index, 1);
        const endDate = new Date(parseInt(year), index + 1, 0, 23, 59, 59);

        //
        const submittedCount = await this.prisma.lead.count({
          where: {
            created_at: { gte: startDate, lte: endDate },
          },
        });

        //
        const activeCount = await this.prisma.lead.count({
          where: {
            created_at: { gte: startDate, lte: endDate },
            status: { in: ['ACTIVE', 'SCHEDULED'] },
          },
        });

        //
        const scheduledCount = await this.prisma.lead.count({
          where: {
            created_at: { gte: startDate, lte: endDate },
            status: { in: ['SCHEDULED'] },
          },
        });

        return {
          month,
          submitted: submittedCount,
          active: activeCount,
          scheduled: scheduledCount,
        };
      }),
    );

    return {
      success: true,
      data: activityData,
    };
  }
}
