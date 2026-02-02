// 분석 엔티티 타입

import { OHLCVBar, TimeFrame } from '../../stock/types/ohlcv.entity';

export interface BollingerBand {
  sma: number | null;
  upper: number | null;
  lower: number | null;
  middle?: number | null;
}

export type SignalType =
  | 'two_bar_bullish'
  | 'two_bar_bearish'
  | 'w_bottom'
  | 'bb_buy'
  | 'bb_sell'
  | 'bb_bounce_buy'
  | 'bb_rejection_sell';

export type SignalDirection = 'BUY' | 'SELL';

export interface Signal {
  index: number;
  date: string;
  type: SignalType;
  signal: SignalDirection;
  confidence: number;
  price: number;
  exitPrice?: number;
  target?: number;
  bbInside?: boolean;
  bbRecovery?: boolean;
  atr?: number;
  chandelierMultiplier?: number;
  confirmed?: boolean;
  metadata?: Record<string, unknown>;
}

export interface AnalysisParams {
  bbPeriod: number;
  bbStdMult: number;
  atrPeriod: number;
  chandelierMult: number;
  timeFrame: TimeFrame;
}

export interface AnalysisResult {
  signals: Signal[];
  stats: AnalysisStats;
  currentATR: number | null;
  data: OHLCVBar[];
  bollingerBands: BollingerBand[];
}

export interface AnalysisStats {
  buyCount: number;
  sellCount: number;
  totalBars: number;
  patternCount: number;
  recentSignalCount: number;
}
