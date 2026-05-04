import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
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

  //get all with pagination
  @Get()
  @ApiOperation({ summary: 'Get all trades' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
  ) {
    return this.tradeService.findAll({ page, limit });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get trade details' })
  findOne(@Param('id') id: string) {
    return this.tradeService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update trade status or name',
    description: 'ACTIVE, PAUSED',
  })
  update(@Param('id') id: string, @Body() dto: UpdateTradeDto) {
    return this.tradeService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a trade' })
  remove(@Param('id') id: string) {
    return this.tradeService.remove(id);
  }
}
