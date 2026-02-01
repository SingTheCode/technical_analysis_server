// 기술적 지표 계산 함수

import { OHLCVBar } from '../../stock/types/ohlcv.entity';
import { BollingerBand } from '../types/analysis.entity';

export const calculateATR = (
  data: OHLCVBar[],
  period: number,
): (number | null)[] => {
  const trueRanges: number[] = [];

  for (let i = 0; i < data.length; i++) {
    let tr: number;
    if (i === 0) {
      tr = data[i].high - data[i].low;
    } else {
      const hl = data[i].high - data[i].low;
      const hc = Math.abs(data[i].high - data[i - 1].close);
      const lc = Math.abs(data[i].low - data[i - 1].close);
      tr = Math.max(hl, hc, lc);
    }
    trueRanges.push(tr);
  }

  const atrValues: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      atrValues.push(null);
    } else {
      const slice = trueRanges.slice(i - period + 1, i + 1);
      const atr = slice.reduce((a, b) => a + b) / period;
      atrValues.push(atr);
    }
  }

  return atrValues;
};

export const calculateBollingerBands = (
  data: OHLCVBar[],
  period: number,
  stdMult: number,
): BollingerBand[] => {
  const bb: BollingerBand[] = [];
  const closes = data.map((d) => d.close);

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      bb.push({ sma: null, upper: null, lower: null });
      continue;
    }

    const slice = closes.slice(i - period + 1, i + 1);
    const sma = slice.reduce((a, b) => a + b) / period;
    const variance =
      slice.reduce((sum, val) => sum + Math.pow(val - sma, 2), 0) / period;
    const std = Math.sqrt(variance);

    bb.push({
      sma,
      upper: sma + std * stdMult,
      lower: sma - std * stdMult,
    });
  }

  return bb;
};

export const calculateChandelierExit = (
  signal: { signal: 'BUY' | 'SELL'; index: number },
  data: OHLCVBar[],
  atrValues: (number | null)[],
  lookback: number,
  multiplier: number,
): number => {
  // 최근 봉 기준으로 계산
  const lastIndex = data.length - 1;
  const atr = atrValues[lastIndex];
  if (!atr) return 0;

  if (signal.signal === 'BUY') {
    let highestHigh = -Infinity;
    for (let i = Math.max(0, lastIndex - lookback + 1); i <= lastIndex; i++) {
      highestHigh = Math.max(highestHigh, data[i].high);
    }
    return highestHigh - atr * multiplier;
  } else {
    let lowestLow = Infinity;
    for (let i = Math.max(0, lastIndex - lookback + 1); i <= lastIndex; i++) {
      lowestLow = Math.min(lowestLow, data[i].low);
    }
    return lowestLow + atr * multiplier;
  }
};
