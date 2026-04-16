/*
  Warnings:

  - You are about to drop the column `lead_id` on the `trades` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[trade_id]` on the table `leads` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "trades" DROP CONSTRAINT "trades_lead_id_fkey";

-- DropIndex
DROP INDEX "trades_lead_id_key";

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "trade_id" TEXT;

-- AlterTable
ALTER TABLE "trades" DROP COLUMN "lead_id";

-- CreateIndex
CREATE UNIQUE INDEX "leads_trade_id_key" ON "leads"("trade_id");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_trade_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "trades"("id") ON DELETE CASCADE ON UPDATE CASCADE;
