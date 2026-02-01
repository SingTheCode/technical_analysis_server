import { Module } from '@nestjs/common';
import { StockModule } from './stock/stock.module';
import { AnalysisModule } from './analysis/analysis.module';

@Module({
  imports: [StockModule, AnalysisModule],
})
export class AppModule {}
