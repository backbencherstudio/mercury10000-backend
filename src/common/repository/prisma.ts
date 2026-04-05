import { PrismaClient } from "prisma/generated/client";
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// Use a singleton pattern for PrismaClient to prevent too many connections
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const createPrismaClient = () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
