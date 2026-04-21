import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TajulStorage } from 'src/common/lib/Disk/TajulStorage';
import { CreateLeadResDto } from 'src/modules/application/lead/dto/res-lead.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class LeadService {
  constructor(private readonly prisma: PrismaService) {}

async createLead(dto: CreateLeadResDto, files: Express.Multer.File[], userId: string) {
  // 1. Auth Check (Same as before)
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: { type: true },
  });

  if (!user || user.type !== 'USER') {
    throw new ForbiddenException('Only users can create leads.');
  }

  // 2. [FIX] Trade Validation: Check if trade exists
  if (dto.trade_id) {
    const tradeExists = await this.prisma.trade.findUnique({
      where: { id: dto.trade_id },
    });
    if (!tradeExists) {
      throw new BadRequestException('The provided trade_id does not exist.');
    }
  }

  const attachments = [];
  // ... (File upload logic same as before)

  try {
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
          // Trade handle kora: optional hole null pass koro
          trade: dto.trade_id ? { connect: { id: dto.trade_id } } : undefined,
          user: { connect: { id: userId } }, 
          files: attachments.length > 0 ? { create: attachments } : undefined,
        },
        include: { trade: true, files: true },
      });

      return {
        success: true,
        message: 'Lead created successfully',
        data: lead,
      };
    });
  } catch (dbError) {
    // Cleanup files if DB fails
    if (attachments.length > 0) {
      await Promise.all(attachments.map(f => TajulStorage.delete(f.path).catch(() => null)));
    }

    if (dbError.code === 'P2002') {
      throw new BadRequestException('This trade is already assigned or lead_no conflict.');
    }
    
    // Explicitly handle foreign key violation (P2003)
    if (dbError.code === 'P2003') {
      throw new BadRequestException('Foreign key constraint failed. Check your trade_id.');
    }

    throw new BadRequestException(`Database Error: ${dbError.message}`);
  }
}

  async getAllLeads(query: { page: number; limit: number }, userId: string) {
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { type: true },
    });

    if (!user) throw new NotFoundException('User not found');

    // 2. Filter logic: Using 'user_id' which matches your model
    const filter: any = {};
    if (user.type !== 'ADMIN') {
      filter.user_id = userId;
    }

    // 3. Performance optimized fetch
    const [total, leads] = await Promise.all([
      this.prisma.lead.count({ where: filter }),
      this.prisma.lead.findMany({
        where: filter,
        skip,
        take: limit,
        include: { trade: true, files: true },
        orderBy: { created_at: 'desc' },
      }),
    ]);

    return {
      success: true,
      message: 'Leads fetched successfully',
      data: leads,
      meta: {
        total_items: total,
        current_page: page,
        limit: limit,
        total_pages: Math.ceil(total / limit),
      },
    };
  }
}
