// 패턴 감지 함수

import { OHLCVBar } from '../../stock/types/ohlcv.entity';
import { BollingerBand, Signal } from '../types/analysis.entity';

export const detectTwoBarReversal = (
  data: OHLCVBar[],
  bb: BollingerBand[],
  atrValues: (number | null)[],
): Signal[] => {
  const signals: Signal[] = [];

  for (let i = 1; i < data.length; i++) {
    const prev = data[i - 1];
    const curr = data[i];
    const currBB = bb[i];
    const prevATR = atrValues[i - 1];
    const currATR = atrValues[i];

    if (!prevATR || !currATR) continue;

    const range1 = prev.high - prev.low;
    const range2 = curr.high - curr.low;
    const body1 = Math.abs(prev.close - prev.open);
    const body2 = Math.abs(curr.close - curr.open);
    const bodySimilarity = Math.min(body1, body2) / Math.max(body1, body2);

    const hasWideRange =
      range2 >= currATR * 1.8 ||
      (range1 >= prevATR * 1.5 && range2 >= currATR * 1.2);

    if (
      prev.close < prev.open &&
      curr.close > curr.open &&
      bodySimilarity >= 0.7 &&
      hasWideRange
    ) {
      const insideBB =
        currBB?.lower != null &&
        currBB?.upper != null &&
        curr.close >= currBB.lower &&
        curr.close <= currBB.upper;
      const bbRecovery = currBB?.lower != null && curr.close >= currBB.lower;

      let confidence = 65;
      if (insideBB) confidence += 20;
      if (bbRecovery) confidence += 30;
      if (range1 > prevATR * 2.0) confidence += 15;

      signals.push({
        index: i,
        date: curr.date,
        type: 'two_bar_bullish',
        signal: 'BUY',
        confidence: Math.min(100, confidence),
        price: curr.close,
        bbInside: insideBB,
        bbRecovery,
        atr: currATR,
      });
    }

    if (
      prev.close > prev.open &&
      curr.close < curr.open &&
      bodySimilarity >= 0.7 &&
      hasWideRange
    ) {
      const insideBB =
        currBB?.lower != null &&
        currBB?.upper != null &&
        curr.close >= currBB.lower &&
        curr.close <= currBB.upper;
      const bbRecovery = currBB?.upper != null && curr.close <= currBB.upper;

      let confidence = 65;
      if (insideBB) confidence += 20;
      if (bbRecovery) confidence += 30;
      if (range1 > prevATR * 2.0) confidence += 15;

      signals.push({
        index: i,
        date: curr.date,
        type: 'two_bar_bearish',
        signal: 'SELL',
        confidence: Math.min(100, confidence),
        price: curr.close,
        bbInside: insideBB,
        bbRecovery,
        atr: currATR,
      });
    }
  }

  return signals;
};

export const detectWBottom = (
  data: OHLCVBar[],
  bb: BollingerBand[],
): Signal[] => {
  const signals: Signal[] = [];

  for (let i = 2; i < data.length - 1; i++) {
    const low1 = data[i - 2].low;
    const high = data[i - 1].high;
    const low2 = data[i].low;
    const low2Close = data[i].close;
    const low2BB = bb[i];

    const isWBottom = low2 >= low1 * 0.98 && low2 < high && low1 > low2 * 0.95;

    if (isWBottom) {
      let breakoutConfirmed = false;
      for (let j = i + 1; j < Math.min(i + 5, data.length); j++) {
        if (data[j].close > high) {
          breakoutConfirmed = true;
          break;
        }
      }

      if (breakoutConfirmed) {
        const lowDiff = Math.abs(low1 - low2) / low1;
        const bbRecovery = low2BB?.lower != null && low2Close >= low2BB.lower;
        let confidence = (1 - lowDiff) * 100;
        if (bbRecovery) confidence = Math.min(100, confidence + 30);

        signals.push({
          index: i,
          date: data[i].date,
          type: 'w_bottom',
          signal: 'BUY',
          confidence,
          price: low2,
          target: 2 * high - low1,
          bbRecovery,
        });
      }
    }
  }

  return signals;
};

export const detectBollingerSignals = (
  data: OHLCVBar[],
  bb: BollingerBand[],
): Signal[] => {
  const signals: Signal[] = [];

  for (let i = 1; i < data.length; i++) {
    if (
      !bb[i]?.upper ||
      !bb[i]?.lower ||
      !bb[i - 1]?.upper ||
      !bb[i - 1]?.lower
    )
      continue;

    const prevClose = data[i - 1].close;
    const currClose = data[i].close;

    if (prevClose > bb[i - 1].lower! && currClose < bb[i].lower!) {
      signals.push({
        index: i,
        date: data[i].date,
        type: 'bb_buy',
        signal: 'BUY',
        confidence: 75,
        price: currClose,
      });
    }

    if (prevClose < bb[i - 1].upper! && currClose > bb[i].upper!) {
      signals.push({
        index: i,
        date: data[i].date,
        type: 'bb_sell',
        signal: 'SELL',
        confidence: 75,
        price: currClose,
      });
    }
  }

  return signals;
};
