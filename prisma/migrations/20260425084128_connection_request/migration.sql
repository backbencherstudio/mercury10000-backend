/*
  Warnings:

  - You are about to drop the column `user_id` on the `connection_requests` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "connection_requests" DROP CONSTRAINT "connection_requests_user_id_fkey";

-- AlterTable
ALTER TABLE "connection_requests" DROP COLUMN "user_id";

-- CreateTable
CREATE TABLE "_UserTargetedConnections" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_UserTargetedConnections_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_UserTargetedConnections_B_index" ON "_UserTargetedConnections"("B");

-- AddForeignKey
ALTER TABLE "_UserTargetedConnections" ADD CONSTRAINT "_UserTargetedConnections_A_fkey" FOREIGN KEY ("A") REFERENCES "connection_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserTargetedConnections" ADD CONSTRAINT "_UserTargetedConnections_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
