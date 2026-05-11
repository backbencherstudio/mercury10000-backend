/*
  Warnings:

  - You are about to drop the column `latest_news` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `message_news` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `sign_of_disaster` on the `Notification` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "latest_news",
DROP COLUMN "message_news",
DROP COLUMN "sign_of_disaster",
ADD COLUMN     "conection_req" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "new_leads" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "reward_system" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "support_ticket" BOOLEAN NOT NULL DEFAULT true;
