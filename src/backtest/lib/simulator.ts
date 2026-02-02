import { OHLCVBar } from '../../stock/types/ohlcv.entity';
import { Signal } from '../../analysis/types/analysis.entity';
import {
  Trade,
  BacktestResult,
  BacktestSummary,
} from '../types/backtest.entity';

interface SimulationParams {
  initialCapital: number;
  positionSize: number;
  stopLossPercent?: number;
  takeProfitPercent?: number;
  minConfidence?: number;
}

export function runSimulation(
  data: OHLCVBar[],
  signals: Signal[],
  params: SimulationParams,
): BacktestResult {
  const { minConfidence = 0, stopLossPercent, takeProfitPercent } = params;

  const filtered = signals.filter((s) => s.confidence >= minConfidence);
  const trades: Trade[] = [];

  let position: {
    entryPrice: number;
    entryDate: string;
    signalType: string;
  } | null = null;

  for (let i = 0; i < data.length; i++) {
    const bar = data[i];
    const signal = filtered.find((s) => s.index === i);

    // 포지션 보유 중 청산 조건 체크
    if (position) {
      let exitPrice: number | null = null;

      // 손절
      if (
        stopLossPercent &&
        bar.low <= position.entryPrice * (1 - stopLossPercent / 100)
      ) {
        exitPrice = bar.close;
      }
      // 익절
      else if (
        takeProfitPercent &&
        bar.high >= position.entryPrice * (1 + takeProfitPercent / 100)
      ) {
        exitPrice = bar.close;
      }
      // 반대 신호
      else if (signal?.signal === 'SELL') {
        exitPrice = signal.price;
      }

      if (exitPrice !== null) {
        const pnl = exitPrice - position.entryPrice;
        trades.push({
          entryDate: position.entryDate,
          entryPrice: position.entryPrice,
          exitDate: bar.date,
          exitPrice,
          type: 'BUY',
          signalType: position.signalType,
          pnl,
          pnlPercent: (pnl / position.entryPrice) * 100,
        });
        position = null;
      }
    }

    // 신규 진입
    if (!position && signal?.signal === 'BUY') {
      position = {
        entryPrice: signal.price,
        entryDate: signal.date,
        signalType: signal.type,
      };
    }
  }

  return { trades, summary: calculateSummary(trades, params.initialCapital) };
}

function calculateSummary(
  trades: Trade[],
  initialCapital: number,
): BacktestSummary {
  if (trades.length === 0) {
    return {
      totalTrades: 0,
      winCount: 0,
      lossCount: 0,
      winRate: 0,
      totalPnl: 0,
      totalPnlPercent: 0,
      maxDrawdown: 0,
    };
  }

  const winCount = trades.filter((t) => t.pnl > 0).length;
  const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);

  let peak = initialCapital;
  let maxDrawdown = 0;
  let equity = initialCapital;

  for (const trade of trades) {
    equity += trade.pnl;
    peak = Math.max(peak, equity);
    maxDrawdown = Math.max(maxDrawdown, ((peak - equity) / peak) * 100);
  }

  return {
    totalTrades: trades.length,
    winCount,
    lossCount: trades.length - winCount,
    winRate: (winCount / trades.length) * 100,
    totalPnl,
    totalPnlPercent: (totalPnl / initialCapital) * 100,
    maxDrawdown,
  };
}
