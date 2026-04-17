/*
  Warnings:

  - The values [SEEKER,VOLUNTEER] on the enum `UserType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "UserType_new" AS ENUM ('ADMIN', 'CLIENT', 'EDITOR', 'MAID', 'SECRETARY', 'SUP_ADMIN');
ALTER TABLE "public"."users" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "type" TYPE "UserType_new" USING ("type"::text::"UserType_new");
ALTER TYPE "UserType" RENAME TO "UserType_old";
ALTER TYPE "UserType_new" RENAME TO "UserType";
DROP TYPE "public"."UserType_old";
ALTER TABLE "users" ALTER COLUMN "type" SET DEFAULT 'CLIENT';
COMMIT;

-- AlterTable
ALTER TABLE "trades" ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "conversion_fee" DOUBLE PRECISION DEFAULT 0.0,
ADD COLUMN     "qualified_leads_fee" DOUBLE PRECISION DEFAULT 0.0,
ADD COLUMN     "work_at_company" TEXT DEFAULT 'N/A';

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
