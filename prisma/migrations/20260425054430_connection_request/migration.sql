-- AlterTable
ALTER TABLE "attachments" ADD COLUMN     "connectionRequestId" TEXT;

-- AlterTable
ALTER TABLE "connection_requests" ADD COLUMN     "user_id" TEXT;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_connectionRequestId_fkey" FOREIGN KEY ("connectionRequestId") REFERENCES "connection_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connection_requests" ADD CONSTRAINT "connection_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
