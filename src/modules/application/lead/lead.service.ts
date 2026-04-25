import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LeadStatus, Prisma } from '@prisma/client';
import { TajulStorage } from 'src/common/lib/Disk/TajulStorage';
import appConfig from 'src/config/app.config';
import {
  CreateLeadResDto,
  GetLeadsQueryDto,
  UpdateLeadScheduleDto,
  UpdateLeadStatusDto,
} from 'src/modules/application/lead/dto/res-lead.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class LeadService {
  constructor(private readonly prisma: PrismaService) {}

  // create lead
  async createLead(
    dto: CreateLeadResDto,
    files?: Express.Multer.File[],
    userId?: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { type: true },
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
        const next_lead_no = (count + 1).toString();

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

  async getAllLeadsInProcess(query: GetLeadsQueryDto, userId: string) {
    const { page, limit, search, trade_id, status } = query;
    const skip = (page - 1) * limit;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { type: true },
    });

    if (!user) throw new NotFoundException('User not found');
    if (user.type !== 'SUP_ADMIN') {
      throw new ForbiddenException(
        'Access denied. Only Super Admin can view in-process leads.',
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

  async getUserLeadActivity(userId: string) {
    // user exists check
    const userExists = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!userExists) throw new NotFoundException('User not found');

    // get leads by status
    const [submittedLeads, qualifiedLeads, convertedLeads] = await Promise.all([
      // Total Lead Submitted (SUBMITTED status)
      this.prisma.lead.findMany({
        where: { user_id: userId, status: 'SUBMITTED' },
        select: { id: true, address: true, created_at: true },
        orderBy: { created_at: 'desc' },
      }),
      // Qualified Leads
      this.prisma.lead.findMany({
        where: { user_id: userId, status: 'ACTIVE' },
        select: { id: true, address: true, created_at: true },
        orderBy: { created_at: 'desc' },
      }),
      // Conversions
      this.prisma.lead.findMany({
        where: { user_id: userId, status: 'SCHEDULED' },
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

        return {
          month,
          submitted: submittedCount,
          active: activeCount,
        };
      }),
    );

    return {
      success: true,
      data: activityData,
    };
  }
}
