import { BadRequestException, Injectable } from '@nestjs/common';
import { TajulStorage } from 'src/common/lib/Disk/TajulStorage';
import { CreateLeadResDto } from 'src/modules/application/lead/dto/res-lead.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class LeadService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new Lead with Trade connection and Multiple File Uploads
   */
  async createLead(dto: CreateLeadResDto, files: Express.Multer.File[]) {
    // 2. Generate Lead Number (Atomic)
    const count = await this.prisma.lead.count();
    const nextLeadNo = (2113 + count).toString();

    // 3. Handle File Uploads
    const attachments = [];
    if (files && files.length > 0) {
      for (const file of files) {
        const fileName = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
        const relativePath = `leads/${fileName}`;
        try {
          await TajulStorage.put(relativePath, file.buffer);
          attachments.push({
            path: relativePath,
            name: file.originalname,
            type: file.mimetype,
          });
        } catch (err) {
          throw new BadRequestException(
            `Failed to upload image: ${file.originalname}`,
          );
        }
      }
    }

    // 4. Atomic Create with Fixed Relations
    try {
      const lead = await this.prisma.lead.create({
        data: {
          lead_no: nextLeadNo,
          name: dto.name,
          phone: dto.phone,
          address: dto.address,
          notes: dto.notes,
          status: 'SUBMITTED',
          trade_id: dto.trade_id,
          files:
            attachments.length > 0
              ? {
                  create: attachments,
                }
              : undefined,
        },
        include: { trade: true, files: true },
      });

      return {
        success: true,
        message: 'Lead created successfully',
        data: lead,
      };
    } catch (dbError) {
      console.error('Prisma Error:', dbError);

      // Unique constraint error (P2002) handle kora for trade_id
      if (dbError.code === 'P2002') {
        throw new BadRequestException(
          'This trade is already assigned to another lead.',
        );
      }

      throw new BadRequestException(`Database Error: ${dbError.message}`);
    }
  }

  /**
   * Fetch all Leads for the dashboard table
   */
  async getAllLeads(query: { page: number; limit: number }) {
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    // 1. Parallel execution for high performance
    const [total, leads] = await Promise.all([
      this.prisma.lead.count(),
      this.prisma.lead.findMany({
        skip: skip,
        take: limit,
        include: {
          trade: true,
          files: true,
        },
        orderBy: {
          created_at: 'desc', // Latest leads first
        },
      }),
    ]);

    // 2. Structured Meta Response
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
