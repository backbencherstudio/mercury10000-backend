import { MailerService } from '@nestjs-modules/mailer';
import { Injectable, NotFoundException } from '@nestjs/common';
import { SupportStatus } from '@prisma/client';
import {
  SecretaryNoteDto,
  UpdateSupportStatusDto,
} from 'src/modules/application/support/dto/create-support.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SupportService {
  constructor(
    private prisma: PrismaService,
    private mailerService: MailerService,
  ) {}

  async createTicket(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const ticket = await this.prisma.support_tickets.create({
      data: {
        user_id: userId,
        status: SupportStatus.PENDING,
      },
      // include: { user: true },
    });

    return {
      success: true,
      message: 'Ticket created successfully',
      data: ticket,
    };
  }

  async findAll() {
    const tickets = await this.prisma.support_tickets.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone_number: true,
            city: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
    return {
      success: true,
      message: 'Tickets fetched successfully',
      data: tickets,
    };
  }

  async addSecretaryNote(id: string, dto: SecretaryNoteDto) {
    const ticket = await this.prisma.support_tickets.update({
      where: { id },
      data: {
        secretary_note: dto.secretaryNote,
        status: SupportStatus.SOLVED, // Moves to Admin view
      },
      include: { user: true },
    });
    return {
      success: true,
      message: 'Ticket updated successfully',
      data: ticket,
    };
  }
  // SupportService class er bhotorer code

  async resolveTicket(id: string, dto: UpdateSupportStatusDto) {
    // 1. Database status update ebong user details fetch
    const ticket = await this.prisma.support_tickets.update({
      where: { id },
      data: {
        status: dto.status,
        updated_at: new Date(), // track resolution time
      },
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    // 2. Jodi status RESOLVED hoy tobe mail pathano hobe
    if (dto.status === SupportStatus.RESOLVED && ticket.user?.email) {
      try {
        await this.sendResolutionEmail({
          email: ticket.user.email,
          name: ticket.user.name || 'Valued User',
          ticketId: ticket.id,
        });
      } catch (error) {
        // Email fail holeo jeno process break na hoy
        console.error(`Email sending failed for ticket ${id}:`, error);
      }
    }

    return ticket;
  }

  // Private method to handle email logic
  private async sendResolutionEmail(data: {
    email: string;
    name: string;
    ticketId: string;
  }) {
    const { email, name, ticketId } = data;

    await this.mailerService.sendMail({
      to: email,
      subject: `Support Request Resolved - #${ticketId}`,
      
      context: {
        name: name,
        ticketId: ticketId,
        date: new Date().toLocaleDateString(),
      },
    });
  }
}
