import { Injectable } from '@nestjs/common';
import { StockService } from '../stock/stock.service';
import { BacktestParams, BacktestResult } from './types/backtest.entity';
import { runSimulation } from './lib/simulator';
import {
  calculateATR,
  calculateBollingerBands,
} from '../analysis/lib/indicators';
import {
  detectTwoBarReversal,
  detectWBottom,
  detectBollingerSignals,
} from '../analysis/lib/patterns';
import { Signal } from '../analysis/types/analysis.entity';

const BACKTEST_PERIOD = { daily: '1y', weekly: '3y' } as const;

@Injectable()
export class BacktestService {
  constructor(private readonly stockService: StockService) {}

  async runBacktest(params: BacktestParams): Promise<BacktestResult> {
    const timeFrame = params.timeFrame ?? 'daily';
    const { data } = await this.stockService.getOHLCV(
      params.ticker,
      timeFrame,
      BACKTEST_PERIOD[timeFrame],
    );

    const atrValues = calculateATR(data, params.atrPeriod);
    const bb = calculateBollingerBands(data, params.bbPeriod, params.bbStdMult);

    const signals: Signal[] = [
      ...detectTwoBarReversal(data, bb, atrValues, timeFrame),
      ...detectWBottom(data, bb, { timeFrame }),
      ...detectBollingerSignals(data, bb, timeFrame),
    ].sort((a, b) => a.index - b.index);

    return runSimulation(data, signals, params);
  }
}
