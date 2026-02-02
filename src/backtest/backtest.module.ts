import { Module } from '@nestjs/common';
import { BacktestController } from './backtest.controller';
import { BacktestService } from './backtest.service';
import { StockModule } from '../stock/stock.module';

@Module({
  imports: [StockModule],
  controllers: [BacktestController],
  providers: [BacktestService],
})
export class BacktestModule {}
