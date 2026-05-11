import { Injectable, NotFoundException } from '@nestjs/common';
import { UpdateNotificationDto } from 'src/modules/application/notification/dto/update-notification.dto';
import { TajulStorage } from '../../../common/lib/Disk/TajulStorage';
import appConfig from '../../../config/app.config';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  async findAll(user_id: string) {
    try {
      const notifications = await this.prisma.notification.findMany({
        where: {
          receiver_id: user_id,
        },
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          sender_id: true,
          receiver_id: true,
          entity_id: true,
          created_at: true,
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
          receiver: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
          notification_event: {
            select: {
              id: true,
              type: true,
              text: true,
            },
          },
        },
      });

      // add url to avatar
      if (notifications.length > 0) {
        for (const notification of notifications) {
          if (notification.sender && notification.sender.avatar) {
            notification.sender['avatar_url'] = TajulStorage.url(
              appConfig().storageUrl.avatar + '/' + notification.sender.avatar,
            );
          }

          if (notification.receiver && notification.receiver.avatar) {
            notification.receiver['avatar_url'] = TajulStorage.url(
              appConfig().storageUrl.avatar +
                '/' +
                notification.receiver.avatar,
            );
          }
        }
      }

      return {
        success: true,
        message: 'Notifications fetched successfully',
        data: notifications,
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        message: error.message,
      };
    }
  }

  async getNotificationSettings(userId: string) {
    const settings = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        new_leads: true,
        conection_req: true,
        reward_system: true,
        support_ticket: true,
      },
    });

    if (!settings) {
      throw new NotFoundException('User settings not found');
    }

    return {
      success: true,
      data: settings,
    };
  }

  async updateSettings(userId: string, data: UpdateNotificationDto) {
    console.log('udpadte settings', data);
    const settings = await this.prisma.user.update({
      where: { id: userId },
      data: {
        new_leads: data.new_leads,
        conection_req: data.conection_req,
        reward_system: data.reward_system,
        support_ticket: data.support_ticket,
      },
    });

    // Formatting the success message dynamically
    const updatedFields = Object.keys(data)
      .map((key) => key.replace(/_/g, ' '))
      .join(', ');

    const successMessage = updatedFields
      ? `${updatedFields.charAt(0).toUpperCase() + updatedFields.slice(1)} updated successfully`
      : 'Notification settings updated successfully';

    return {
      success: true,
      message: successMessage,
      data: settings,
    };
  }

  private generateSuccessMessage(data: UpdateNotificationDto): string {
    const keys = Object.keys(data);
    if (keys.length === 0) return 'Settings updated successfully';

    if (keys.length === 1) {
      const field = keys[0].replace(/_/g, ' ');
      return `${field.charAt(0).toUpperCase() + field.slice(1)} updated successfully`;
    }

    return 'Notification preferences updated successfully';
  }

  async remove(id: string, user_id: string) {
    try {
      const notification = await this.prisma.notification.findUnique({
        where: {
          id: id,
        },
      });

      if (!notification) {
        return {
          success: false,
          message: 'Notification not found',
        };
      }

      await this.prisma.notification.delete({
        where: {
          id: id,
        },
      });

      return {
        success: true,
        message: 'Notification deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async removeAll(user_id: string) {
    try {
      // check if notification exists
      const notifications = await this.prisma.notification.findMany({
        where: {
          OR: [{ receiver_id: user_id }, { receiver_id: null }],
        },
      });

      if (notifications.length == 0) {
        return {
          success: false,
          message: 'Notification not found',
        };
      }

      await this.prisma.notification.deleteMany({
        where: {
          OR: [{ receiver_id: user_id }, { receiver_id: null }],
        },
      });

      return {
        success: true,
        message: 'All notifications deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
