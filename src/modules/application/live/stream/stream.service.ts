import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { LivekitService } from '../livekit/livekit.service';

@Injectable()
export class StreamService {
  constructor(
    private readonly livekitService: LivekitService,
    private readonly prisma: PrismaService,
  ) {}

  async startStream(userId: string, title: string) {
    const room_name = `live_${userId}_${Date.now()}`;

    // 1. Generate Token for Host
    const token = await this.livekitService.generateStreamToken(
      room_name,
      userId,
      true,
    );

    // 2. Create Record in DB
    await this.prisma.live_streams.create({
      data: {
        room_name,
        host_id: userId,
        title,
        is_active: true,
      },
    });

    // 3. Trigger Auto Recording (Background process)
    // Local public folder-e save hobe
    await this.livekitService.triggerAutoRecording(room_name);

    return { token, room_name };
  }

  async stopStream(userId: string, room_name: string) {
    const stream = await this.prisma.live_streams.findFirst({
      where: {
        room_name,
        host_id: userId,
        is_active: true,
      },
    });

    if (!stream) {
      throw new NotFoundException('Active stream session not found');
    }

    // Use a Promise.allSettled or individual try-catch for external services
    // so that even if LiveKit fails, your DB still updates.
    try {
      // 1. Stop Recording (wrapped in try-catch to ignore 'not found' errors)
      await this.livekitService.stopRecording(room_name).catch((err) => {
        console.error('LiveKit Egress Stop Error:', err.message);
      });

      // 2. Delete Room
      await this.livekitService.deleteRoom(room_name).catch((err) => {
        console.error('LiveKit Room Delete Error:', err.message);
      });
    } finally {
      // 3. Always update the DB, even if LiveKit calls failed
      // This ensures your UI doesn't get stuck in "Live" mode
      await this.prisma.live_streams.update({
        where: { id: stream.id },
        data: {
          is_active: false,
          ended_at: new Date(),
        },
      });
    }

    return { success: true, message: 'Stream ended' };
  }

  async getActiveStreams() {
    return this.prisma.live_streams.findMany({
      where: { is_active: true },
      include: { host: { select: { id: true, name: true } } },
      orderBy: { created_at: 'desc' },
    });
  }

  async getPublicJoinToken(room_name: string, viewer_id: string) {
    const stream = await this.prisma.live_streams.findUnique({
      where: { room_name, is_active: true },
    });

    if (!stream)
      throw new NotFoundException('Live stream not found or inactive');

    // Guest will have is_host = false
    const token = await this.livekitService.generateStreamToken(
      room_name,
      viewer_id,
      false,
    );
    return { token };
  }

  async getAllRecordedVideos() {
    return this.prisma.live_streams.findMany({
      where: { is_active: false, NOT: { recording_url: null } },
      include: { host: { select: { id: true, name: true } } },
      orderBy: { created_at: 'desc' },
    });
  }

  async getSingleRecordedVideo(room_name: string) {
    const video = await this.prisma.live_streams.findUnique({
      where: { room_name },
      include: { host: { select: { id: true, name: true } } },
    });
    if (!video) throw new NotFoundException('Recorded video not found');
    return video;
  }
}
