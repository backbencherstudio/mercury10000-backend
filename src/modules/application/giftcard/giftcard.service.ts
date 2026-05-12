import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateGiftcardDto,
  SendBulkRewardDto,
} from './dto/create-giftcard.dto';
import { NotificationRepository } from 'src/common/repository/notification/notification.repository';

@Injectable()
export class GiftcardService {
  constructor(private readonly prisma: PrismaService,private readonly notificationRepo: NotificationRepository) {}

  async create(createGiftcardDto: CreateGiftcardDto, userId: string) {
    try {
      const giftcard = await this.prisma.giftCard.create({
        data: {
          ...createGiftcardDto,
          user_id: userId,
        },
      });

      return {
        status: true,
        data: giftcard,
        message: 'Giftcard created successfully',
      };
    } catch (error) {
      // Log error for internal tracking
      console.error('Giftcard Creation Error:', error);

      throw new InternalServerErrorException({
        status: false,
        data: null,
        message: 'Failed to create giftcard due to a database error',
      });
    }
  }

async sendBulkReward(dto: SendBulkRewardDto, senderId: string) {
    const { giftCardId, userIds } = dto;

    const rewardData = userIds.map((id) => ({
      user_id: id,
      gift_card_id: giftCardId,
    }));

    await this.prisma.userReward.createMany({
      data: rewardData,
      skipDuplicates: true,
    });


    const gift = await this.prisma.giftCard.findUnique({
      where: { id: giftCardId },
      select: { id: true, name: true }
    });

    if (!gift) {
       throw new NotFoundException('Gift card not found');
    }


    if (userIds.length > 0) {
      const notificationPromises = userIds.map((id) =>
        this.notificationRepo.createNotification({
          sender_id: senderId,
          receiver_id: id,
          text: `You received a new gift card: ${gift.name}`,
          type: 'new_giftcard_received',
          entity_id: gift.id,
          payload: { giftcard_id: gift.id },
        }),
      );

      // সব নোটিফিকেশন প্যারালাল এক্সেকিউশন নিশ্চিত করা
      await Promise.all(notificationPromises);
    }

    return {
      status: true,
      message: `${userIds.length} users rewarded successfully!`,
    };
  }

  async findAll() {
    const giftcards = await this.prisma.giftCard.findMany({
      orderBy: { created_at: 'desc' },
    });

    return {
      status: true,
      data: giftcards,
      message: 'Giftcards retrieved successfully',
    };
  }

async getUserWiseGift(userId: string) {
  const giftcards = await this.prisma.userReward.findMany({
    where: {
      user_id: userId,
    },
    orderBy: { 
      sent_at: 'desc' 
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true, 
        },
      },
      giftCard: {
        select: {
          id: true,
          name: true,
          created_at: true,
        },
      },
    },
  });

  // findMany empty array return kore jodi data na thake
  if (!giftcards || giftcards.length === 0) {
    return {
      status: false,
      data: [],
      message: 'User wise giftcards not found',
    };
  }



  return {
    status: true,
    data: giftcards,
    message: 'User wise giftcards retrieved successfully',
  };
}

  async getAllGiftStatus() {
    const users = await this.prisma.user.findMany({
      where: {
        deleted_at: null,
      },
      select: {
        id: true,
        username: true,
        // Total Leads count
        _count: {
          select: {
            leads: true,
            userRewards: true,
          },
        },
        // Recent Lead date
        leads: {
          orderBy: {
            created_at: 'desc',
          },
          take: 1,
          select: {
            created_at: true,
          },
        },
        // Last Gift Received details
        userRewards: {
          orderBy: {
            sent_at: 'desc',
          },
          take: 1,
          include: {
            giftCard: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // data format for frontend
    return users.map((user) => {
      const lastReward = user.userRewards[0];
      const recentLead = user.leads[0];

      const formattedUsers = {
        user_id: user.id,
        giftcard_id: lastReward?.giftCard?.id,
        giftcard_name: lastReward?.giftCard?.name,
        user_name: user.username || 'N/A',
        recent_lead: recentLead ? recentLead.created_at : null,
        total_leads_sent: user._count.leads,
        total_gift_received: user._count.userRewards,
        last_gift_date: lastReward ? lastReward.sent_at : null,
      };

      return formattedUsers;
    });
  }

  async findOne(id: string) {
    const giftcard = await this.prisma.giftCard.findUnique({
      where: { id },
    });

    if (!giftcard) {
      return {
        status: false,
        data: null,
        message: 'Giftcard not found',
      };
    }

    return {
      status: true,
      data: giftcard,
    };
  }
}
