import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import appConfig from '../config/app.config';

import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const datasourceUrl = appConfig().database.url;

    if (!datasourceUrl || datasourceUrl === 'undefined') {
      console.error(
        '--- ❌ DATABASE_URL is not defined or invalid! ---',
        `Value: ${datasourceUrl}`,
      );
      // We still haven't called super(), so we throw here
      throw new Error('DATABASE_URL is not defined in environment variables');
    }

    const pool = new Pool({ connectionString: datasourceUrl });
    const adapter = new PrismaPg(pool);

    super({ adapter });

    this.logger.log(`Connecting to database...`);
    if (process.env.PRISMA_ENV == '1') {
      this.logger.log('Prisma Middleware disabled by env');
    }
  }

  // async onModuleInit() {
  //   try {
  //     await this.$connect();
  //     this.logger.log('Prisma connected successfully');
  //   } catch (error) {
  //     this.logger.error('Failed to connect to database', error);
  //     throw error;
  //   }
  // }

  async onModuleInit() {
    this.logger.log('--- 🛡️ Attempting to connect to PostgreSQL... ---');
    try {
      await this.$connect();
      this.logger.log('--- ✅ PostgreSQL Connected Successfully ---');
    } catch (error) {
      this.logger.error('--- ❌ PostgreSQL Connection Failed ---', error);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
