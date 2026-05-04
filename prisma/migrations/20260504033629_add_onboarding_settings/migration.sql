-- CreateTable
CREATE TABLE "onboarding_settings" (
    "id" TEXT NOT NULL,
    "tutorial_video_id" TEXT,
    "tutorial_unskippable_duration" INTEGER NOT NULL DEFAULT 30,
    "meeting_video_id" TEXT,
    "meeting_unskippable_duration" INTEGER NOT NULL DEFAULT 30,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "onboarding_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_settings_tutorial_video_id_key" ON "onboarding_settings"("tutorial_video_id");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_settings_meeting_video_id_key" ON "onboarding_settings"("meeting_video_id");

-- AddForeignKey
ALTER TABLE "onboarding_settings" ADD CONSTRAINT "onboarding_settings_tutorial_video_id_fkey" FOREIGN KEY ("tutorial_video_id") REFERENCES "attachments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_settings" ADD CONSTRAINT "onboarding_settings_meeting_video_id_fkey" FOREIGN KEY ("meeting_video_id") REFERENCES "attachments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
