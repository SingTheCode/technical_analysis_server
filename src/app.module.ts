import { Module } from '@nestjs/common';
import { StockModule } from './stock/stock.module';
import { AnalysisModule } from './analysis/analysis.module';
import { BacktestModule } from './backtest/backtest.module';

@Module({
  imports: [StockModule, AnalysisModule, BacktestModule],
})
export class AppModule {}
