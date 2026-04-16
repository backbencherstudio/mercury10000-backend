-- DropIndex
DROP INDEX "leads_phone_key";

-- AlterTable
ALTER TABLE "leads" ALTER COLUMN "name" DROP NOT NULL,
ALTER COLUMN "phone" DROP NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'SUBMITTED';
