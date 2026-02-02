import { AnalysisParams } from '../../analysis/types/analysis.entity';

export interface BacktestParams extends Omit<AnalysisParams, 'timeFrame'> {
  ticker: string;
  initialCapital: number;
  positionSize: number;
  stopLossPercent?: number;
  takeProfitPercent?: number;
  minConfidence?: number;
}

export interface Trade {
  entryDate: string;
  entryPrice: number;
  exitDate: string;
  exitPrice: number;
  type: 'BUY' | 'SELL';
  signalType: string;
  pnl: number;
  pnlPercent: number;
}

export interface BacktestSummary {
  totalTrades: number;
  winCount: number;
  lossCount: number;
  winRate: number;
  totalPnl: number;
  totalPnlPercent: number;
  maxDrawdown: number;
}

export interface BacktestResult {
  trades: Trade[];
  summary: BacktestSummary;
}
