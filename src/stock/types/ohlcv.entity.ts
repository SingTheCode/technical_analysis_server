// OHLCV 엔티티 타입

export interface OHLCVBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type TimeFrame = 'daily' | 'weekly';

export const PERIOD_BY_TIMEFRAME: Record<TimeFrame, string> = {
  daily: '1y',
  weekly: '2y',
};

export const INTERVAL_BY_TIMEFRAME: Record<TimeFrame, string> = {
  daily: '1d',
  weekly: '1wk',
};
