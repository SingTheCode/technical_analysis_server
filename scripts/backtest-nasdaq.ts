import { StockService } from '../src/stock/stock.service';
import { BacktestService } from '../src/backtest/backtest.service';

const PARAMS = {
  initialCapital: 10000,
  positionSize: 1000,
  atrPeriod: 22,
  bbPeriod: 20,
  bbStdMult: 2,
  chandelierMult: 3,
};

type TimeFrame = 'daily' | 'weekly';

async function run() {
  const args = process.argv.slice(2);
  const timeFrames: TimeFrame[] = [];
  const tickers: string[] = [];

  for (const arg of args) {
    if (arg === 'daily' || arg === 'weekly') timeFrames.push(arg);
    else tickers.push(arg.toUpperCase());
  }

  if (tickers.length < 2) {
    console.error('사용법: npx ts-node scripts/backtest-nasdaq.ts <ticker1> <ticker2> [daily] [weekly]');
    process.exit(1);
  }

  if (timeFrames.length === 0) timeFrames.push('daily', 'weekly');

  const stockService = new StockService();
  const backtestService = new BacktestService(stockService);

  for (const timeFrame of timeFrames) {
    console.log(`\n=== ${timeFrame.toUpperCase()} 백테스트 ===\n`);
    const results: Array<{ ticker: string; trades: number; winRate: number; pnl: number; pnlPct: number }> = [];

    for (const ticker of tickers) {
      try {
        const { summary } = await backtestService.runBacktest({ ticker, timeFrame, ...PARAMS });
        results.push({
          ticker,
          trades: summary.totalTrades,
          winRate: summary.winRate,
          pnl: summary.totalPnl,
          pnlPct: summary.totalPnlPercent,
        });
        console.log(`✓ ${ticker}: ${summary.totalTrades}건, 승률 ${summary.winRate.toFixed(1)}%, PnL $${summary.totalPnl.toFixed(2)} (${summary.totalPnlPercent.toFixed(2)}%)`);
      } catch {
        console.log(`✗ ${ticker}: 데이터 없음`);
      }
      await new Promise((r) => setTimeout(r, 300));
    }

    const valid = results.filter((r) => r.trades > 0);
    const avgWinRate = valid.length ? valid.reduce((s, r) => s + r.winRate, 0) / valid.length : 0;
    const totalPnl = results.reduce((s, r) => s + r.pnl, 0);
    const totalInvested = results.reduce((s, r) => s + r.trades * PARAMS.positionSize, 0);
    const totalReturn = totalInvested ? (totalPnl / totalInvested) * 100 : 0;

    console.log(`\n--- ${timeFrame} 결과 (승률 기준) ---`);
    console.table(
      results
        .sort((a, b) => b.winRate - a.winRate)
        .map((r) => ({
          ticker: r.ticker,
          trades: r.trades,
          winRate: `${r.winRate.toFixed(1)}%`,
          pnl: `$${r.pnl.toFixed(2)}`,
          pnlPct: `${r.pnlPct.toFixed(2)}%`,
        })),
    );
    console.log(`\n📊 평균 승률: ${avgWinRate.toFixed(1)}% | PnL 합계: $${totalPnl.toFixed(2)} | 총 투자: $${totalInvested.toLocaleString()} | 손익률: ${totalReturn.toFixed(2)}%`);
  }
}

run();
