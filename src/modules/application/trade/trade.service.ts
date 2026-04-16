import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateTradeDto } from 'src/modules/application/trade/dto/create-trade.dto';
import { UpdateTradeDto } from 'src/modules/application/trade/dto/update-trade.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class TradeService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTradeDto) {
    const existing = await this.prisma.trade.findFirst({
      where: { name: { equals: dto.name, mode: 'insensitive' } },
    });
    if (existing) throw new ConflictException('Trade name already exists');

    const trade = await this.prisma.trade.create({ data: dto });
    return { success: true, message: 'Trade created successfully', data: trade };
  }

  async findAll() {
    const trades = await this.prisma.trade.findMany({
      orderBy: { created_at: 'desc' },
    });
    return { success: true, data: trades, total: trades.length };
  }

  async findOne(id: string) {
    const trade = await this.prisma.trade.findUnique({ where: { id } });
    if (!trade) throw new NotFoundException('Trade not found');
    return { success: true, data: trade };
  }

  async update(id: string, dto: UpdateTradeDto) {
    await this.findOne(id); // Check if exists
    const updated = await this.prisma.trade.update({
      where: { id },
      data: dto,
    });
    return { success: true, message: 'Trade updated successfully', data: updated };
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.trade.delete({ where: { id } });
    return { success: true, message: 'Trade deleted successfully' };
  }
}