import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { OnModuleInit, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { NotificationService } from './notification.service';
import appConfig from '../../../config/app.config';

@WebSocketGateway(6009, {
  cors: {
    origin: '*',
  },
})
@Injectable()
export class NotificationGateway
  implements
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnModuleInit
{
  @WebSocketServer()
  server: Server;

  private redisPubClient: Redis;
  private redisSubClient: Redis;

  constructor(private readonly notificationService: NotificationService) {}

  onModuleInit() {
    const redisOptions = {
      host: appConfig().redis.host,
      port: Number(appConfig().redis.port),
      password: appConfig().redis.password,
    };

    this.redisPubClient = new Redis(redisOptions);
    this.redisSubClient = new Redis(redisOptions);

    // Redis theke notification channel-e subscribe kora
    this.redisSubClient.subscribe('notification_channel', (err) => {
      if (err) {
        console.error('❌ Redis Subscription Error:', err.message);
      }
    });

    // Redis theke message receive hole targeted user-ke emit kora
    this.redisSubClient.on('message', (channel, message) => {
      if (channel === 'notification_channel') {
        const data = JSON.parse(message);
        const { receiver_id, event_name, ...rest } = data;
        
        // targeted user-er unique room-e message emit kora
        this.server.to(`user_${receiver_id}`).emit(event_name || 'new_notification', rest);
      }
    });
  }

  afterInit(server: Server) {
    console.log('🚀 WebSocket server started on port 6009');
  }

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (userId) {
      // User-ke tar unique room-e join korano holo
      client.join(`user_${userId}`);
      console.log(`🔌 User ${userId} connected and joined room: user_${userId}`);
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`❌ Client disconnected: ${client.id}`);
  }

  /**
   * Repository theke notification pathanor method
   * @param receiverId Target user id
   * @param eventName Event name (e.g., 'new_notification')
   * @param data Payload data
   */
  async sendToUser(receiverId: string, eventName: string, data: any) {
    const payload = {
      receiver_id: receiverId,
      event_name: eventName,
      ...data,
    };

    // Redis-e publish kora hocche jate shob instance-e pawa jay
    await this.redisPubClient.publish(
      'notification_channel',
      JSON.stringify(payload),
    );
  }
}