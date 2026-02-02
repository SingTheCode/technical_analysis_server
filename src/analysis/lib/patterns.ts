// 패턴 감지 함수

import { OHLCVBar, TimeFrame } from '../../stock/types/ohlcv.entity';
import { BollingerBand, Signal } from '../types/analysis.entity';
import { getWeights, TwoBarReversalWeights } from './pattern-weights';

// ===== 유틸리티 함수 =====

/** 추세 계산: 현재 SMA vs 과거 SMA 비교. 양수=상승, 음수=하락 */
function calculateTrend(
  data: OHLCVBar[],
  index: number,
  period: number = 20,
): number {
  if (index < period * 2) return 0;
  const recent = data.slice(index - period + 1, index + 1);
  const old = data.slice(index - period * 2 + 1, index - period + 1);
  const recentSma = recent.reduce((s, d) => s + d.close, 0) / period;
  const oldSma = old.reduce((s, d) => s + d.close, 0) / period;
  return (recentSma - oldSma) / oldSma;
}

/** N일 이동평균 거래량 계산. 현재 거래량이 평소 대비 높은지 판단하는 기준값 제공 */
function calculateAverageVolume(data: OHLCVBar[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(0);
      continue;
    }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += data[j].volume;
    }
    result.push(sum / period);
  }
  return result;
}

/** 지정 구간 내 최저점 인덱스 반환. W패턴의 저점 탐색에 사용 */
function findLowestInRange(
  data: OHLCVBar[],
  start: number,
  end: number,
): number {
  if (start < 0 || end >= data.length || start > end) return -1;
  let lowestIdx = start;
  for (let i = start + 1; i <= end; i++) {
    if (data[i].low < data[lowestIdx].low) lowestIdx = i;
  }
  return lowestIdx;
}

/** 지정 구간 내 최고점 인덱스 반환. W패턴의 넥라인(고점) 탐색에 사용 */
function findHighestInRange(
  data: OHLCVBar[],
  start: number,
  end: number,
): number {
  if (start < 0 || end >= data.length || start > end) return -1;
  let highestIdx = start;
  for (let i = start + 1; i <= end; i++) {
    if (data[i].high > data[highestIdx].high) highestIdx = i;
  }
  return highestIdx;
}

// ===== 헬퍼 함수 =====

/**
 * 상승 반전 신호 분석
 * - BB 하단 이탈 후 복귀 시 confirmed=true (추세 전환 확정)
 * - 거래량, 가격 위치 등으로 신뢰도 계산
 */
function analyzeBullishReversal(
  curr: OHLCVBar,
  prev: OHLCVBar,
  currBB: BollingerBand,
  prevBB: BollingerBand,
  currATR: number,
  volumeConfirm: boolean,
  index: number,
  trend: number,
  data: OHLCVBar[],
  weights: TwoBarReversalWeights,
): Signal | null {
  if (!currBB?.lower || !currBB?.upper || !prevBB?.lower) return null;

  // 추세 필터: 강한 하락추세(-10% 이상)에서만 차단
  if (trend < -0.1) return null;

  // 연속 하락 필터: 5봉 연속 + 15% 이상 하락 시에만 차단
  if (index >= 5) {
    let consecutiveCount = 0;
    let totalDrop = 0;
    for (let i = index - 4; i <= index; i++) {
      if (data[i].close < data[i - 1].close) {
        consecutiveCount++;
        totalDrop += (data[i - 1].close - data[i].close) / data[i - 1].close;
      }
    }
    if (consecutiveCount >= 5 && totalDrop > 0.15) return null;
  }

  const bbWidth = currBB.upper - currBB.lower;
  const pricePosition = (curr.close - currBB.lower) / bbWidth;

  // 확정 조건: 왼쪽 bar BB 하단 이탈 → 오른쪽 bar BB 내부 복귀
  const prevBreachedLower = prev.low < prevBB.lower;
  const currInsideBB = curr.close >= currBB.lower && curr.close <= currBB.upper;
  const confirmed = prevBreachedLower && currInsideBB;

  // 추세 필터 강화: 하락추세에서는 confirmed + 거래량 필수
  if (trend < -0.03 && (!confirmed || !volumeConfirm)) return null;
  // 횡보에서는 confirmed 또는 거래량 필수
  if (trend < 0.02 && !confirmed && !volumeConfirm) return null;

  let baseConfidence = confirmed
    ? weights.baseConfidenceConfirmed
    : weights.baseConfidenceUnconfirmed;

  // 추세 기반 신뢰도 조정
  if (trend < -0.05) baseConfidence -= weights.trendPenalty;
  else if (trend > 0.1) baseConfidence += weights.trendBonus + 15;
  else if (trend > 0.05) baseConfidence += weights.trendBonus + 8;
  else if (trend > 0.02) baseConfidence += weights.trendBonus;

  if (!confirmed) {
    if (prev.low < currBB.lower * 1.01) baseConfidence += 15;
    if (pricePosition < 0.3) baseConfidence += 15;
  }
  if (volumeConfirm) baseConfidence += weights.volumeBonus;
  if (curr.close > prev.high) baseConfidence += weights.priceBreakBonus;

  const confidence = Math.min(100, baseConfidence);
  if (confidence < weights.minConfidence) return null;

  return {
    index,
    date: curr.date,
    type: 'two_bar_bullish',
    signal: 'BUY',
    confidence,
    price: curr.close,
    bbInside: currInsideBB,
    bbRecovery: prevBreachedLower && curr.close >= currBB.lower,
    atr: currATR,
    confirmed,
    metadata: { pricePosition, volumeConfirm, confirmed, trend },
  };
}

/**
 * 하락 반전 신호 분석
 * - BB 상단 이탈 후 복귀 시 confirmed=true (추세 전환 확정)
 * - 거래량, 가격 위치 등으로 신뢰도 계산
 */
function analyzeBearishReversal(
  curr: OHLCVBar,
  prev: OHLCVBar,
  currBB: BollingerBand,
  prevBB: BollingerBand,
  currATR: number,
  volumeConfirm: boolean,
  index: number,
  weights: TwoBarReversalWeights,
): Signal | null {
  if (!currBB?.lower || !currBB?.upper || !prevBB?.upper) return null;

  const bbWidth = currBB.upper - currBB.lower;
  const pricePosition = (curr.close - currBB.lower) / bbWidth;

  // 확정 조건: 왼쪽 bar BB 상단 이탈 → 오른쪽 bar BB 내부 복귀
  const prevBreachedUpper = prev.high > prevBB.upper;
  const currInsideBB = curr.close >= currBB.lower && curr.close <= currBB.upper;
  const confirmed = prevBreachedUpper && currInsideBB;

  let baseConfidence = confirmed
    ? weights.baseConfidenceConfirmed
    : weights.baseConfidenceUnconfirmed - 15;

  if (!confirmed) {
    if (prev.high > currBB.upper * 0.99) baseConfidence += 15;
    if (pricePosition > 0.7) baseConfidence += 15;
  }
  if (volumeConfirm) baseConfidence += weights.volumeBonus;
  if (curr.close < prev.low) baseConfidence += weights.priceBreakBonus;

  const confidence = Math.min(100, baseConfidence);
  if (confidence < weights.minConfidence) return null;

  return {
    index,
    date: curr.date,
    type: 'two_bar_bearish',
    signal: 'SELL',
    confidence,
    price: curr.close,
    bbInside: currInsideBB,
    bbRecovery: prevBreachedUpper && curr.close <= currBB.upper,
    atr: currATR,
    confirmed,
    metadata: { pricePosition, volumeConfirm, confirmed },
  };
}

// ===== 메인 함수 =====

/**
 * Two Bar Reversal 패턴 감지
 * - 음봉→양봉(Bullish) 또는 양봉→음봉(Bearish) 연속 패턴
 * - BB 이탈 후 복귀 시 confirmed=true로 추세 전환 확정
 * - 거래량 검증 및 ATR 기반 변동성 체크 포함
 */
export const detectTwoBarReversal = (
  data: OHLCVBar[],
  bb: BollingerBand[],
  atrValues: (number | null)[],
  timeFrame: TimeFrame = 'daily',
): Signal[] => {
  const signals: Signal[] = [];
  const avgVolumes = calculateAverageVolume(data, 20);
  const weights = getWeights(timeFrame).twoBarReversal;

  for (let i = 1; i < data.length; i++) {
    const prev = data[i - 1];
    const curr = data[i];
    const currBB = bb[i];
    const prevBB = bb[i - 1];
    const prevATR = atrValues[i - 1];
    const currATR = atrValues[i];

    if (!prevATR || !currATR || !currBB || !prevBB) continue;

    const range1 = prev.high - prev.low;
    const range2 = curr.high - curr.low;
    const body1 = Math.abs(prev.close - prev.open);
    const body2 = Math.abs(curr.close - curr.open);
    const bodySimilarity = Math.min(body1, body2) / Math.max(body1, body2);

    const hasWideRange =
      range2 >= currATR * 1.8 ||
      (range1 >= prevATR * 1.5 && range2 >= currATR * 1.2);

    const volumeConfirm =
      avgVolumes[i] > 0 && curr.volume > avgVolumes[i] * 1.2;

    const trend = calculateTrend(data, i);

    // Bullish
    if (
      prev.close < prev.open &&
      curr.close > curr.open &&
      bodySimilarity >= 0.7 &&
      hasWideRange
    ) {
      const signal = analyzeBullishReversal(
        curr,
        prev,
        currBB,
        prevBB,
        currATR,
        volumeConfirm,
        i,
        trend,
        data,
        weights,
      );
      if (signal) signals.push(signal);
    }

    // Bearish
    if (
      prev.close > prev.open &&
      curr.close < curr.open &&
      bodySimilarity >= 0.7 &&
      hasWideRange
    ) {
      const signal = analyzeBearishReversal(
        curr,
        prev,
        currBB,
        prevBB,
        currATR,
        volumeConfirm,
        i,
        weights,
      );
      if (signal) signals.push(signal);
    }
  }

  return signals;
};

/**
 * W Bottom (이중 바닥) 패턴 감지
 * - 저점1 → 고점(넥라인) → 저점2 형태의 W자 패턴
 * - 저점1이 BB 이탈 + 저점2가 BB 내부면 confirmed=true
 * - requireBreakout 옵션으로 넥라인 돌파 확인 여부 선택
 */
export const detectWBottom = (
  data: OHLCVBar[],
  bb: BollingerBand[],
  options: {
    requireBreakout?: boolean;
    maxLookAhead?: number;
    timeFrame?: TimeFrame;
  } = {},
): Signal[] => {
  const signals: Signal[] = [];
  const {
    requireBreakout = true,
    maxLookAhead = 5,
    timeFrame = 'daily',
  } = options;
  const weights = getWeights(timeFrame).wBottom;

  for (let i = 4; i < data.length - (requireBreakout ? maxLookAhead : 0); i++) {
    // 추세 필터: 하락추세(-5%)에서 차단
    const trend = calculateTrend(data, i);
    if (trend < -0.05) continue;

    const low1Idx = findLowestInRange(data, i - 4, i - 2);
    const highIdx = findHighestInRange(data, low1Idx, i - 1);
    const low2Idx = i;

    if (low1Idx === -1 || highIdx === -1) continue;

    const low1 = data[low1Idx].low;
    const high = data[highIdx].high;
    const low2 = data[low2Idx].low;
    const low2Close = data[low2Idx].close;
    const low1BB = bb[low1Idx];
    const low2BB = bb[low2Idx];

    const lowDiff = Math.abs(low1 - low2) / low1;
    // 저점 간격 timeFrame별 차등 적용
    const isWBottom =
      lowDiff < weights.maxLowDiff &&
      low2 < high &&
      low1 < high &&
      high > low1 * 1.02 &&
      highIdx > low1Idx &&
      highIdx < low2Idx;

    if (!isWBottom) continue;

    // 확정 조건: 저점1 BB 이탈 → 저점2 BB 내부
    const low1BreachedBB = low1BB?.lower != null && low1 < low1BB.lower;
    const low2InsideBB = low2BB?.lower != null && low2 >= low2BB.lower;
    const confirmed = low1BreachedBB && low2InsideBB;

    let breakoutConfirmed = !requireBreakout;
    let breakoutIdx = requireBreakout ? -1 : i;

    if (requireBreakout) {
      for (
        let j = i + 1;
        j < Math.min(i + maxLookAhead + 1, data.length);
        j++
      ) {
        if (data[j].close > high * 1.01) {
          breakoutConfirmed = true;
          breakoutIdx = j;
          break;
        }
      }
    }

    if (!breakoutConfirmed) continue;

    // confirmed=false인 경우 신호 발생하지 않음 (품질 향상)
    if (!confirmed) continue;

    const bbRecovery = low2BB?.lower != null && low2Close >= low2BB.lower;
    let confidence = weights.baseConfidenceConfirmed;

    // 저점 대칭도에 따른 신뢰도 차등
    if (lowDiff < 0.03) confidence += weights.perfectSymmetryBonus;
    else if (lowDiff < 0.05) confidence += weights.goodSymmetryBonus;

    if (bbRecovery) confidence += weights.bbRecoveryBonus;

    confidence = Math.min(100, Math.max(50, confidence));

    signals.push({
      index: breakoutIdx,
      date: data[breakoutIdx].date,
      type: 'w_bottom',
      signal: 'BUY',
      confidence,
      price: data[breakoutIdx].close,
      target: 2 * high - low1,
      bbRecovery,
      confirmed,
      metadata: {
        low1,
        low2,
        neckline: high,
        pattern: 'W',
        lowDiff,
        confirmed,
      },
    });
  }

  return signals;
};

/**
 * 볼린저밴드 신호 감지
 * - BB 하단 터치 후 양봉 반등 → bb_bounce_buy (매수)
 * - BB 상단 터치 후 음봉 반락 → bb_rejection_sell (매도)
 * - BB Squeeze(변동성 수축) 상태에서 반등/반락 시 신뢰도 추가 상승
 * - 거래량은 가산점으로만 활용
 */
export const detectBollingerSignals = (
  data: OHLCVBar[],
  bb: BollingerBand[],
  timeFrame: TimeFrame = 'daily',
): Signal[] => {
  const signals: Signal[] = [];
  const avgVolumes = calculateAverageVolume(data, 20);
  const weights = getWeights(timeFrame).bollinger;

  for (let i = 2; i < data.length; i++) {
    const currBB = bb[i];
    const prevBB = bb[i - 1];

    if (!currBB?.upper || !currBB?.lower || !prevBB?.upper || !prevBB?.lower)
      continue;

    const prev = data[i - 1];
    const curr = data[i];
    const trend = calculateTrend(data, i);

    const bbWidth = currBB.upper - currBB.lower;
    const bbWidthPrev = prevBB.upper - prevBB.lower;
    const isSqueeze = bbWidth < bbWidthPrev * 0.7;

    const volumeConfirm =
      avgVolumes[i] > 0 && curr.volume > avgVolumes[i] * 1.2;

    // 하단 반등 (매수) - BB 터치 또는 이탈 후 반등
    const touchedOrBreachedLower = prev.low <= prevBB.lower * 1.01;
    const prevBreachedLower = prev.low < prevBB.lower;
    const bouncingFromLower =
      touchedOrBreachedLower &&
      curr.close > curr.open &&
      curr.close > prevBB.lower &&
      trend >= -0.1;

    // 추세 필터: 하락추세(-3%)에서는 BB 이탈 + 거래량 필수
    if (
      bouncingFromLower &&
      trend < -0.03 &&
      (!prevBreachedLower || !volumeConfirm)
    )
      continue;
    // 횡보에서는 BB 이탈 또는 거래량 필수
    if (bouncingFromLower && trend < 0 && !prevBreachedLower && !volumeConfirm)
      continue;

    if (bouncingFromLower) {
      let confidence = weights.baseConfidence;
      // BB 이탈 후 복귀 시 추가 보너스
      if (prevBreachedLower && curr.close >= currBB.lower) {
        confidence += 12;
      }
      if (volumeConfirm) confidence += weights.volumeBonus;
      if (isSqueeze) confidence += weights.squeezeBonus;
      if (curr.close > prev.high) confidence += weights.priceBreakBonus;
      if (trend < -0.03) confidence -= weights.trendPenalty;
      else if (trend > 0.1) confidence += weights.trendBonus + 15;
      else if (trend > 0.05) confidence += weights.trendBonus + 8;
      else if (trend > 0.02) confidence += weights.trendBonus;

      if (confidence >= 65) {
        signals.push({
          index: i,
          date: curr.date,
          type: 'bb_bounce_buy',
          signal: 'BUY',
          confidence: Math.min(100, confidence),
          price: curr.close,
          metadata: {
            squeeze: isSqueeze,
            volumeRatio: curr.volume / avgVolumes[i],
            trend,
          },
        });
      }
    }

    // 상단 반락 (매도)
    const touchedUpper = prev.high >= prevBB.upper * 0.99;
    const rejectingFromUpper =
      touchedUpper && curr.close < curr.open && curr.close < prevBB.upper;

    if (rejectingFromUpper) {
      let confidence = weights.baseConfidence;
      if (volumeConfirm) confidence += weights.volumeBonus;
      if (isSqueeze) confidence += weights.squeezeBonus;
      if (curr.close < prev.low) confidence += weights.priceBreakBonus;

      signals.push({
        index: i,
        date: curr.date,
        type: 'bb_rejection_sell',
        signal: 'SELL',
        confidence: Math.min(100, confidence),
        price: curr.close,
        metadata: {
          squeeze: isSqueeze,
          volumeRatio: curr.volume / avgVolumes[i],
        },
      });
    }
  }

  return signals;
};

/**
 * 신호 통합 및 중복 제거
 * - minGap 이내 같은 방향 신호는 신뢰도 높은 것만 유지
 * - 다른 방향 신호는 간격 상관없이 모두 유지
 */
export function consolidateSignals(
  signals: Signal[],
  minGap: number = 3,
): Signal[] {
  if (signals.length === 0) return [];

  const sorted = [...signals].sort((a, b) => a.index - b.index);
  const consolidated: Signal[] = [];

  let lastIndex = -Infinity;
  let lastSignalType: 'BUY' | 'SELL' | null = null;

  for (const signal of sorted) {
    const gapOk = signal.index - lastIndex >= minGap;
    const sameType = signal.signal === lastSignalType;

    if (!gapOk && sameType) {
      const last = consolidated[consolidated.length - 1];
      if (signal.confidence > last.confidence) {
        consolidated[consolidated.length - 1] = signal;
      }
      continue;
    }

    consolidated.push(signal);
    lastIndex = signal.index;
    lastSignalType = signal.signal;
  }

  return consolidated;
}
