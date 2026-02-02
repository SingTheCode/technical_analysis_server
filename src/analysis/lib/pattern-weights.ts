import { TimeFrame } from '../../stock/types/ohlcv.entity';

export interface TwoBarReversalWeights {
  baseConfidenceConfirmed: number;
  baseConfidenceUnconfirmed: number;
  volumeBonus: number;
  trendPenalty: number;
  trendBonus: number;
  priceBreakBonus: number;
  minConfidence: number;
}

export interface WBottomWeights {
  baseConfidenceConfirmed: number;
  baseConfidenceUnconfirmed: number;
  perfectSymmetryBonus: number;
  goodSymmetryBonus: number;
  bbRecoveryBonus: number;
  maxLowDiff: number;
}

export interface BollingerWeights {
  baseConfidence: number;
  volumeBonus: number;
  squeezeBonus: number;
  priceBreakBonus: number;
  trendPenalty: number;
  trendBonus: number;
}

export interface PatternWeights {
  twoBarReversal: TwoBarReversalWeights;
  wBottom: WBottomWeights;
  bollinger: BollingerWeights;
}

const DAILY_WEIGHTS: PatternWeights = {
  twoBarReversal: {
    baseConfidenceConfirmed: 96,
    baseConfidenceUnconfirmed: 80,
    volumeBonus: 24,
    trendPenalty: 18,
    trendBonus: 38,
    priceBreakBonus: 24,
    minConfidence: 88,
  },
  wBottom: {
    baseConfidenceConfirmed: 96,
    baseConfidenceUnconfirmed: 82,
    perfectSymmetryBonus: 24,
    goodSymmetryBonus: 16,
    bbRecoveryBonus: 24,
    maxLowDiff: 0.08,
  },
  bollinger: {
    baseConfidence: 84,
    volumeBonus: 24,
    squeezeBonus: 24,
    priceBreakBonus: 24,
    trendPenalty: 18,
    trendBonus: 38,
  },
};

const WEEKLY_WEIGHTS: PatternWeights = {
  twoBarReversal: {
    baseConfidenceConfirmed: 98,
    baseConfidenceUnconfirmed: 85,
    volumeBonus: 25,
    trendPenalty: 15,
    trendBonus: 55,
    priceBreakBonus: 25,
    minConfidence: 92,
  },
  wBottom: {
    baseConfidenceConfirmed: 98,
    baseConfidenceUnconfirmed: 87,
    perfectSymmetryBonus: 25,
    goodSymmetryBonus: 18,
    bbRecoveryBonus: 35,
    maxLowDiff: 0.08,
  },
  bollinger: {
    baseConfidence: 88,
    volumeBonus: 25,
    squeezeBonus: 38,
    priceBreakBonus: 25,
    trendPenalty: 15,
    trendBonus: 55,
  },
};

export function getWeights(timeFrame: TimeFrame): PatternWeights {
  return timeFrame === 'weekly' ? WEEKLY_WEIGHTS : DAILY_WEIGHTS;
}
