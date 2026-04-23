-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('OPEN', 'CLOSED', 'FULFILLED');

-- CreateTable
CREATE TABLE "connection_requests" (
    "id" TEXT NOT NULL,
    "trade_id" TEXT NOT NULL,
    "location" TEXT,
    "city" TEXT,
    "description" TEXT,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "connection_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connection_responses" (
    "id" TEXT NOT NULL,
    "connection_request_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "contractor_name" TEXT,
    "contractor_phone" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "connection_responses_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "connection_requests" ADD CONSTRAINT "connection_requests_trade_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "trades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connection_responses" ADD CONSTRAINT "connection_responses_connection_request_id_fkey" FOREIGN KEY ("connection_request_id") REFERENCES "connection_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connection_responses" ADD CONSTRAINT "connection_responses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
