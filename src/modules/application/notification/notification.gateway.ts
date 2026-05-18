import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import Redis from 'ioredis';
import { Server, Socket } from 'socket.io';
import { PrismaService } from 'src/prisma/prisma.service';

@WebSocketGateway({
  // Using a wildcard for origin; consider specifying your frontend URL in production
  cors: {
    origin: '*',
    credentials: true,
  },
  transports: ['websocket'], // Force WebSocket transport for better performance and stability
})
@Injectable()
export class NotificationGateway
  implements
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnModuleInit,
    OnModuleDestroy
{
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(NotificationGateway.name);
  private redisSub: Redis;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lifecycle hook: Initialize Redis connection when the module starts
   */
  onModuleInit() {
    this.initializeRedis();
  }

  /**
   * Lifecycle hook: Cleanly close Redis connection when the module is destroyed
   */
  onModuleDestroy() {
    if (this.redisSub) {
      this.redisSub.quit();
    }
  }

  /**
   * Executed after the WebSocket server has been initialized
   */
  afterInit(server: Server) {
    this.logger.log('🚀 WebSocket Gateway successfully initialized');
  }

  /**
   * Setup Redis Subscriber and message listeners
   */
  private initializeRedis() {
    const redisConfig = {
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
    };

    this.redisSub = new Redis(redisConfig);

    this.redisSub.on('connect', () =>
      this.logger.log('✅ Redis Subscriber connected for notifications'),
    );

    this.redisSub.on('error', (err) =>
      this.logger.error(`❌ Redis Subscription Error: ${err.message}`),
    );

    // Subscribe to the notification channel used by your repository/service
    this.redisSub.subscribe('NOTIFICATION_CHANNEL', (err) => {
      if (err) {
        this.logger.error('❌ Failed to subscribe to NOTIFICATION_CHANNEL');
      } else {
        this.logger.log('📡 Subscribed to NOTIFICATION_CHANNEL');
      }
    });

    // Listen for incoming messages from Redis
    this.redisSub.on('message', (channel, message) => {
      if (channel === 'NOTIFICATION_CHANNEL') {
        this.handleInboundNotification(message);
      }
    });
  }

  /**
   * Logic for processing and emitting Redis messages to specific users
   */
  private handleInboundNotification(message: string) {
    try {
      const data = JSON.parse(message);

      // Ensure the payload has a receiver_id
      if (!data.receiver_id) {
        this.logger.warn(
          '⚠️ Received notification payload without receiver_id',
        );
        return;
      }

      const roomName = `user_${data.receiver_id}`;

      // Emit to the specific user's room
      this.server.to(roomName).emit('notification', data);
      this.logger.log(`📤 Notification delivered to room: ${roomName}`);
    } catch (error) {
      this.logger.error(
        '❌ Failed to parse or emit Redis notification',
        error.stack,
      );
    }
  }

  // /**
  //  * Handle new WebSocket connections
  //  */
  // async handleConnection(client: Socket) {
  //   try {
  //     const userId = client.handshake.query.userId as string;

  //     // 1. Validate the userId exists in the query
  //     if (!userId || userId === 'null' || userId === 'undefined') {
  //       this.logger.error(
  //         `🚫 Connection rejected: Missing or invalid userId (${userId})`,
  //       );
  //       client.disconnect();
  //       return;
  //     }

  //     this.logger.log(`🔍 Verifying user in database: ${userId}`);

  //     // 2. Database verification to ensure the user is legitimate
  //     const userExists = await this.prisma.user.findUnique({
  //       where: { id: userId },
  //       select: { id: true, type: true },
  //     });

  //     if (!userExists) {
  //       this.logger.warn(
  //         `🚫 Connection rejected: User ID ${userId} not found in DB`,
  //       );
  //       client.emit('error', {
  //         message: 'Authentication failed: User not found',
  //       });
  //       client.disconnect();
  //       return;
  //     }

  //     // 3. Join a unique room for this user to enable targeted notifications
  //     const roomName = `user_${userId}`;
  //     await client.join(roomName);

  //     this.logger.log(
  //       `✅ Connection established: ${client.id} joined ${roomName}`,
  //     );

  //     // Send a confirmation to the client
  //     client.emit('connection_ready', { status: 'authorized', room: roomName });
  //   } catch (error) {
  //     this.logger.error(
  //       `❌ Unexpected error during connection for client ${client.id}: ${error.message}`,
  //     );
  //     client.disconnect();
  //   }
  // }

  // NotificationGateway - NestJS
  async handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;

    if (!userId || userId === 'null' || userId === 'undefined') {
      this.logger.error('Invalid userId');
      return client.disconnect();
    }

    /*
  const userExists = await this.prisma.user.findUnique({
    where: { id: userId },
  });

  if (!userExists) {
    this.logger.warn(`User ${userId} not found in DB`);
    return client.disconnect(); 
  }
  */


    await client.join(`user_${userId}`);
    this.logger.log(`✅ Socket connected and joined room: user_${userId}`);
  }

  /**
   * Handle WebSocket disconnections
   */
  handleDisconnect(client: Socket) {
    this.logger.log(`❌ Client disconnected: ${client.id}`);
  }
}
