import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { OHLCVBar } from '../stock/types/ohlcv.entity';
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
  highestHigh?: number;
  lowestLow?: number;
}

@Injectable()
export class AnalysisService {
  analyze(rawData: OHLCVBar[], params: AnalysisParams): AnalysisResult {
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

  calculateChandelier(
    data: OHLCVBar[],
    position: 'BUY' | 'SELL',
    atrPeriod: number,
    multiplier: number,
  ): ChandelierResult {
    if (data.length < atrPeriod) {
      throw new HttpException(
        `최소 ${atrPeriod}개 이상의 데이터가 필요합니다`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const atrValues = calculateATR(data, atrPeriod);
    const lastIndex = data.length - 1;
    const atr = atrValues[lastIndex]!;

    if (position === 'BUY') {
      let highestHigh = -Infinity;
      for (
        let i = Math.max(0, lastIndex - atrPeriod + 1);
        i <= lastIndex;
        i++
      ) {
        highestHigh = Math.max(highestHigh, data[i].high);
      }
      return {
        exitPrice: highestHigh - atr * multiplier,
        atr,
        highestHigh,
      };
    } else {
      let lowestLow = Infinity;
      for (
        let i = Math.max(0, lastIndex - atrPeriod + 1);
        i <= lastIndex;
        i++
      ) {
        lowestLow = Math.min(lowestLow, data[i].low);
      }
      return {
        exitPrice: lowestLow + atr * multiplier,
        atr,
        lowestLow,
      };
    }
  }
}
