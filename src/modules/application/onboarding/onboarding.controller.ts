import { Controller, Get, Patch, Post, Body, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { OnboardingService } from './onboarding.service';
import { UploadVideoDto } from './dto/create-onboarding.dto';

@ApiTags('Onboarding Settings')
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly service: OnboardingService) {}

  @Get()
  async getOnboarding() {
    return this.service.getSettings();
  }

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadVideoDto })
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'tutorial_video_file', maxCount: 1 },
    { name: 'meeting_video_file', maxCount: 1 },
  ]))
  async uploadVideo(
    @UploadedFiles() files: { tutorial_video_file?: Express.Multer.File[], meeting_video_file?: Express.Multer.File[] },
    @Body() dto: UploadVideoDto
  ) {
    return this.service.processVideoUpload(files, dto);
  }
}