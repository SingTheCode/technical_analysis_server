import { Controller, Get, Param, Query } from '@nestjs/common';
import { StockService } from './stock.service';
import { OhlcvQueryDto } from './dto/ohlcv-query.dto';

@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get(':ticker/ohlcv')
  async getOHLCV(
    @Param('ticker') ticker: string,
    @Query() query: OhlcvQueryDto,
  ) {
    return this.stockService.getOHLCV(ticker, query.timeFrame ?? 'daily');
  }
}
