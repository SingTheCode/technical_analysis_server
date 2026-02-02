import { Controller, Post, Body } from '@nestjs/common';
import { BacktestService } from './backtest.service';
import { BacktestRequestDto } from './dto/backtest-request.dto';
import { BacktestResult } from './types/backtest.entity';

@Controller('backtest')
export class BacktestController {
  constructor(private readonly backtestService: BacktestService) {}

  @Post()
  async runBacktest(@Body() dto: BacktestRequestDto): Promise<BacktestResult> {
    return this.backtestService.runBacktest(dto);
  }
}
