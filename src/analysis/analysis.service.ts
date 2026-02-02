import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { StockService } from '../stock/stock.service';
import { TimeFrame } from '../stock/types/ohlcv.entity';
import {
  AnalysisParams,
  AnalysisResult,
  Signal,
} from './types/analysis.entity';
import { transformDailyToWeekly } from './lib/transform';
import { calculateATR, calculateBollingerBands } from './lib/indicators';
import {
  detectTwoBarReversal,
  detectWBottom,
  detectBollingerSignals,
} from './lib/patterns';

export interface ChandelierResult {
  exitPrice: number;
  atr: number;
  highestHigh: number;
}

@Injectable()
export class AnalysisService {
  constructor(private readonly stockService: StockService) {}

  async analyze(
    ticker: string,
    params: AnalysisParams,
  ): Promise<AnalysisResult> {
    const { data: rawData } = await this.stockService.getOHLCV(
      ticker,
      params.timeFrame,
    );
    const data =
      params.timeFrame === 'weekly' ? transformDailyToWeekly(rawData) : rawData;

    const minRequired = Math.max(params.bbPeriod, params.atrPeriod);
    if (data.length < minRequired) {
      throw new HttpException(
        `최소 ${minRequired}개 이상의 데이터가 필요합니다`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const atrValues = calculateATR(data, params.atrPeriod);
    const bb = calculateBollingerBands(data, params.bbPeriod, params.bbStdMult);

    const twoBarSignals = detectTwoBarReversal(data, bb, atrValues);
    const wBottomSignals = detectWBottom(data, bb);
    const bbSignals = detectBollingerSignals(data, bb);

    const allSignals: Signal[] = [
      ...twoBarSignals,
      ...wBottomSignals,
      ...bbSignals,
    ].sort((a, b) => a.index - b.index);

    const recentSignals = allSignals.filter(
      (s) => s.index >= data.length - params.atrPeriod,
    );

    return {
      signals: recentSignals,
      stats: {
        buyCount: recentSignals.filter((s) => s.signal === 'BUY').length,
        sellCount: recentSignals.filter((s) => s.signal === 'SELL').length,
        totalBars: rawData.length,
        patternCount: recentSignals.length,
        recentSignalCount: recentSignals.length,
      },
      currentATR: atrValues[atrValues.length - 1],
      data,
      bollingerBands: bb,
    };
  }

  async calculateChandelier(
    ticker: string,
    timeFrame: TimeFrame,
    atrPeriod: number,
    multiplier: number,
  ): Promise<ChandelierResult> {
    const { data } = await this.stockService.getOHLCV(ticker, timeFrame);

    if (data.length < atrPeriod) {
      throw new HttpException(
        `최소 ${atrPeriod}개 이상의 데이터가 필요합니다`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const atrValues = calculateATR(data, atrPeriod);
    const lastIndex = data.length - 1;
    const atr = atrValues[lastIndex]!;

    let highestHigh = -Infinity;
    for (let i = Math.max(0, lastIndex - atrPeriod + 1); i <= lastIndex; i++) {
      highestHigh = Math.max(highestHigh, data[i].high);
    }
    return {
      exitPrice: highestHigh - atr * multiplier,
      atr,
      highestHigh,
    };
  }
}
