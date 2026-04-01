import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createNotification(payload: {
    sender_id: string;
    receiver_id: string;
    text: string;
    type: string;
    entity_id: string;
  }) {
    const { sender_id, receiver_id, text, type, entity_id } = payload;

    try {
      let notificationEvent = await this.prisma.notificationEvent.findFirst({
        where: { type, text },
      });

      if (!notificationEvent) {
        notificationEvent = await this.prisma.notificationEvent.create({
          data: { type, text },
        });
      }
      const notification = await this.prisma.notification.create({
        data: {
          sender_id,
          receiver_id,
          entity_id,
          notification_event_id: notificationEvent.id,
          latest_news: true,
          sign_of_disaster: true,
          message_news: true,
        },
        include: {
          notification_event: true,
        },
      });

      this.sendFCM(receiver_id, type, text, entity_id);

      console.log('Notification sent successfully', notification);

      return notification;
    } catch (error) {
      console.error('❌ Notification Error:', error);
      throw new InternalServerErrorException('Failed to process notification');
    }
  }

  private async sendFCM(
    receiverId: string,
    type: string,
    text: string,
    entityId: string,
  ) {
    if (!admin.apps.length) return;

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: receiverId },
        select: { fcm_token: true },
      });

      if (!user?.fcm_token) return;

      const message: admin.messaging.Message = {
        token: user.fcm_token,
        notification: {
          title: this.formatTitle(type),
          body: text,
        },
        data: {
          entity_id: String(entityId),
          type: String(type),
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
        android: {
          priority: 'high',
          notification: {
            channelId: 'high_importance_channel',
            sound: 'default',
          },
        },
        apns: {
          payload: {
            aps: { sound: 'default', badge: 1 },
          },
        },
      };

      console.log('FCM Message:', message);

      await admin.messaging().send(message);
    } catch (fcmError) {
      console.error('❌ FCM Send Error:', fcmError);
    }
  }

  private formatTitle(type: string): string {
    return type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  }
}
