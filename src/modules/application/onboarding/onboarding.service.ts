import { Injectable } from '@nestjs/common';
import { TajulStorage } from 'src/common/lib/Disk/TajulStorage';
import appConfig from 'src/config/app.config';
import { PrismaService } from 'src/prisma/prisma.service';
import { UploadVideoDto } from './dto/create-onboarding.dto';

// onboarding.service.ts
@Injectable()
export class OnboardingService {
  constructor(private prisma: PrismaService) {}

  async getSettings() {
    const settings = await this.prisma.onboardingSetting.findMany({
      include: { tutorial_video: true, meeting_video: true },
    });

    if (!settings) {
      return {
        data: null,
        success: false,
        message: 'No settings found',
      };
    }


    const formatted = settings.map((setting) => ({
      id: setting.id,
      tutorial_video_url: setting.tutorial_video?.path
        ? `${TajulStorage.url(appConfig().storageUrl.video)}${setting.tutorial_video?.path}`
        : null,
      meeting_video_url: setting.meeting_video?.path
        ? `${TajulStorage.url(appConfig().storageUrl.video)}${setting.meeting_video?.path}`
        : null,
      tutorial_unskippable_duration: setting.tutorial_unskippable_duration,
      meeting_unskippable_duration: setting.meeting_unskippable_duration,
    }));

    return {
      data: formatted,
      success: true,
      message: 'Settings fetched successfully',
    };
  }

  async processVideoUpload(
    files: {
      tutorial_video_file?: Express.Multer.File[];
      meeting_video_file?: Express.Multer.File[];
    },
    dto: UploadVideoDto,
  ) {
    // onboarding setting find or create
    let settings = await this.prisma.onboardingSetting.findFirst();
    if (!settings) {
      settings = await this.prisma.onboardingSetting.create({
        data: {
          tutorial_unskippable_duration:
            dto.tutorial_unskippable_duration || 30,
          meeting_unskippable_duration: dto.meeting_unskippable_duration || 30,
        },
      });
    }

    const updateData: any = {};
    if (dto.tutorial_unskippable_duration !== undefined) {
      updateData.tutorial_unskippable_duration = Number(
        dto.tutorial_unskippable_duration,
      );
    }
    if (dto.meeting_unskippable_duration !== undefined) {
      updateData.meeting_unskippable_duration = Number(
        dto.meeting_unskippable_duration,
      );
    }

    const folder = appConfig().storageUrl.video;

    // Tutorial video processing
    if (files.tutorial_video_file?.[0]) {
      // old file cleanup
      if (settings.tutorial_video_id) {
        const old = await this.prisma.attachment.findUnique({
          where: { id: settings.tutorial_video_id },
        });
        if (old?.path) {
          await TajulStorage.delete(`${folder}${old.path}`);
        }
        await this.prisma.attachment.delete({
          where: { id: settings.tutorial_video_id },
        });
      }

      const file = files.tutorial_video_file[0];
      const fileName = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
      const fullPath = `${folder}${fileName}`;
      await TajulStorage.put(fullPath, file.buffer);

      const attachment = await this.prisma.attachment.create({
        data: {
          name: file.originalname,
          path: `${fileName}`,
          type: 'video',
        },
      });
      updateData.tutorial_video_id = attachment.id;
    }

    // meeting video processing
    if (files.meeting_video_file?.[0]) {
      // old file cleanup
      if (settings.meeting_video_id) {
        const old = await this.prisma.attachment.findUnique({
          where: { id: settings.meeting_video_id },
        });
        if (old?.path) {
          await TajulStorage.delete(`${folder}${old.path}`);
        }
        await this.prisma.attachment.delete({
          where: { id: settings.meeting_video_id },
        });
      }

      const file = files.meeting_video_file[0];
      const fileName = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
      const fullPath = `${folder}${fileName}`;
      await TajulStorage.put(fullPath, file.buffer);

      const attachment = await this.prisma.attachment.create({
        data: {
          name: file.originalname,
          path: `${fileName}`,
          type: 'video',
        },
      });
      updateData.meeting_video_id = attachment.id;
    }

    const updatedSettings = await this.prisma.onboardingSetting.update({
      where: { id: settings.id },
      data: updateData,
      include: { tutorial_video: true, meeting_video: true },
    });

    // Format response with URLs
    return {
      success: true,
      message: 'Settings updated successfully',
      data: updatedSettings,
    };
  }
}
