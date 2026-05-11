import {
  Injectable,
  InternalServerErrorException,
  OnModuleInit,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class NotificationRepository implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    if (!admin.apps.length) {
      try {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          }),
        });
        console.log('🚀 Firebase Admin Initialized Successfully');
      } catch (error) {
        console.error('❌ Firebase Initialization Error:', error.message);
      }
    }
  }

  async createNotification(data: {
    sender_id: string;
    receiver_id: string;
    text: string;
    type: string;
    entity_id: string;
    payload?: Record<string, any>;
  }) {
    const { sender_id, receiver_id, text, type, entity_id, payload } = data;

    try {
      // 1. Find or create the Notification Event
      let notificationEvent = await this.prisma.notificationEvent.findFirst({
        where: { type, text },
      });

      if (!notificationEvent) {
        notificationEvent = await this.prisma.notificationEvent.create({
          data: { type, text },
        });
      }

      // 2. Save notification to database (Always saved for all user types)
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

      // 3. Fetch receiver data including type and notification preferences
      const receiver = await this.prisma.user.findUnique({
        where: { id: receiver_id },
        select: {
          id: true,
          type: true, // User role/type
          fcm_token: true,
          new_leads: true,
          conection_req: true,
          reward_system: true,
          support_ticket: true,
        },
      });

      if (receiver && receiver.fcm_token) {
        let shouldSendPush = true;

        // Apply preference filtering ONLY for SUP_ADMIN
        if (receiver.type === 'SUP_ADMIN') {
          shouldSendPush = this.checkPreference(type, receiver);
        }

        // 4. Send Push Notification if allowed
        if (shouldSendPush) {
          await this.sendFCM(
            receiver_id,
            type,
            text,
            entity_id,
            payload,
            receiver.fcm_token,
          );
        }
      }

      return notification;
    } catch (error) {
      console.error('❌ Notification Error:', error);
      throw new InternalServerErrorException('Failed to process notification');
    }
  }

  /**
   * Checks if the specific notification type is enabled in user preferences
   */
  private checkPreference(type: string, user: any): boolean {
    const typeMap: Record<string, boolean> = {
      new_leads: user.new_leads,
      conection_req: user.conection_req,
      reward_system: user.reward_system,
      support_ticket: user.support_ticket,
    };

    // Returns preference value or true by default if type is not mapped
    return typeMap[type] ?? true;
  }

  /**
   * Handles the actual FCM sending logic
   */
  private async sendFCM(
    receiverId: string,
    type: string,
    text: string,
    entityId: string,
    payload: Record<string, any> | undefined,
    token: string,
  ) {
    console.log(`🔍 Attempting to send FCM to User: ${receiverId}`);

    if (!admin.apps.length || !token) {
      console.error('⚠️ FCM skipped: Firebase not initialized or no token.');
      return;
    }

    try {
      // Stringify payload values for FCM data (FCM data requires string values)
      const stringifiedPayload: Record<string, string> = {};
      if (payload) {
        for (const [key, value] of Object.entries(payload)) {
          if (value !== undefined && value !== null) {
            stringifiedPayload[key] = String(value);
          }
        }
      }

      const message: admin.messaging.Message = {
        token: token,
        notification: {
          title: this.formatTitle(type),
          body: text,
        },
        data: {
          entity_id: String(entityId),
          type: String(type),
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
          ...stringifiedPayload,
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
            aps: { sound: 'default', badge: 1, contentAvailable: true },
          },
        },
      };

      const response = await admin.messaging().send(message);
      console.log('🎉 FCM Sent Successfully! MessageID:', response);
    } catch (fcmError: any) {
      console.error('❌ FCM Send Error:', fcmError.message);

      // Handle invalid or expired tokens by removing them from the DB
      const errorCode = fcmError.code;
      if (
        errorCode === 'messaging/registration-token-not-registered' ||
        errorCode === 'messaging/invalid-registration-token'
      ) {
        try {
          await this.prisma.user.update({
            where: { id: receiverId },
            data: { fcm_token: null },
          });
          console.log('✅ Database cleaned: Invalid token removed.');
        } catch (dbError) {
          console.error('❌ Failed to remove invalid token from DB:', dbError);
        }
      }
    }
  }

  /**
   * Formats the notification type string into a readable Title
   */
  private formatTitle(type: string): string {
    return type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  }
}
