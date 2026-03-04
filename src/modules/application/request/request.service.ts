import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RequestStatus, UserType } from 'prisma/generated';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateFeedbackDto, CreateRequestDto } from './dto/create-request.dto';

@Injectable()
export class RequestService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Create a new request (Seeker)
  async createRequest(seeker_id: string, dto: CreateRequestDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: seeker_id },
    });

    if (!user) throw new NotFoundException('User not found');
    if (user.type !== UserType.SEEKER) {
      throw new BadRequestException('User is not a seeker');
    }
    const request = await this.prisma.request.create({
      data: {
        ...dto,
        status: RequestStatus.PENDING,
        seeker: {
          connect: { id: seeker_id },
        },
      },
    });

    console.log('request', request);

    return {
      success: true,
      message: 'Request created successfully',
      data: request,
    };
  }

  // 2. Accept a request (Volunteer)
  async acceptRequest(volunteer_id: string, request_id: string) {
    const request = await this.prisma.request.findUnique({
      where: { id: request_id },
    });

    if (!request) throw new NotFoundException('Request not found');
    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException('Request is already accepted or completed');
    }

    return this.prisma.request.update({
      where: { id: request_id },
      data: {
        volunteer_id,
        status: RequestStatus.ACCEPTED,
      },
    });
  }

  // 3. Complete & Give Feedback
  async submitFeedback(
    user_id: string,
    request_id: string,
    dto: CreateFeedbackDto,
  ) {
    const request = await this.prisma.request.findUnique({
      where: { id: request_id },
    });

    if (!request) throw new NotFoundException('Request not found');

    // Status update to COMPLETED if not already
    await this.prisma.request.update({
      where: { id: request_id },
      data: { status: RequestStatus.COMPLETED },
    });

    // Create feedback
    return this.prisma.feedback.create({
      data: {
        rating_type: dto.rating_type,
        comment: dto.comment,
        request_id,
        user_id: user_id,
      },
    });
  }

  // 4. Get all pending requests for Volunteers
  async getAvailableRequests() {
    return this.prisma.request.findMany({
      where: { status: RequestStatus.PENDING },
      include: { seeker: { select: { name: true, email: true } } },
    });
  }
}
