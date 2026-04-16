import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateTradeDto } from 'src/modules/application/trade/dto/create-trade.dto';
import { UpdateTradeDto } from 'src/modules/application/trade/dto/update-trade.dto';
import { TradeService } from './trade.service';

@ApiTags('Trades')
@ApiBearerAuth()
@Controller('trades')
export class TradeController {
  constructor(private readonly tradeService: TradeService) {}

  @Post()
  @ApiBody({ type: CreateTradeDto })
  // @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a new trade' })
  create(@Body() dto: CreateTradeDto) {
    return this.tradeService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all trades' })
  findAll() {
    return this.tradeService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get trade details' })
  findOne(@Param('id') id: string) {
    return this.tradeService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update trade status or name' })
  update(@Param('id') id: string, @Body() dto: UpdateTradeDto) {
    return this.tradeService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a trade' })
  remove(@Param('id') id: string) {
    return this.tradeService.remove(id);
  }
}
