-- CreateEnum
CREATE TYPE "TradeStatus" AS ENUM ('ACTIVE', 'PAUSED');

-- AlterTable
ALTER TABLE "trades" ADD COLUMN     "status" "TradeStatus" NOT NULL DEFAULT 'ACTIVE';
