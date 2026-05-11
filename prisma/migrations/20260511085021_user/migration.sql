/*
  Warnings:

  - You are about to drop the column `conection_req` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `new_leads` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `reward_system` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `support_ticket` on the `Notification` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "conection_req",
DROP COLUMN "new_leads",
DROP COLUMN "reward_system",
DROP COLUMN "support_ticket",
ADD COLUMN     "latest_news" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "message_news" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sign_of_disaster" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "conection_req" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "new_leads" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "reward_system" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "support_ticket" BOOLEAN NOT NULL DEFAULT true;
