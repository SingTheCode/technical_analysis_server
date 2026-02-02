import { OHLCVBar } from '../../stock/types/ohlcv.entity';
import { Signal } from '../../analysis/types/analysis.entity';
import { runSimulation } from './simulator';

describe('runSimulation', () => {
  const mockData: OHLCVBar[] = [
    {
      date: '2024-01-01',
      open: 100,
      high: 105,
      low: 99,
      close: 102,
      volume: 1000,
    },
    {
      date: '2024-01-02',
      open: 102,
      high: 108,
      low: 101,
      close: 107,
      volume: 1200,
    },
    {
      date: '2024-01-03',
      open: 107,
      high: 110,
      low: 106,
      close: 109,
      volume: 1100,
    },
    {
      date: '2024-01-04',
      open: 109,
      high: 112,
      low: 105,
      close: 106,
      volume: 900,
    },
    {
      date: '2024-01-05',
      open: 106,
      high: 108,
      low: 100,
      close: 101,
      volume: 1500,
    },
  ];

  it('신호가 없으면 빈 결과 반환', () => {
    const result = runSimulation(mockData, [], {
      initialCapital: 10000,
      positionSize: 1,
    });

    expect(result.trades).toHaveLength(0);
    expect(result.summary.totalTrades).toBe(0);
    expect(result.summary.winRate).toBe(0);
  });

  it('BUY 신호 후 SELL 신호로 청산', () => {
    const signals: Signal[] = [
      {
        index: 1,
        date: '2024-01-02',
        type: 'two_bar_bullish',
        signal: 'BUY',
        confidence: 80,
        price: 107,
      },
      {
        index: 4,
        date: '2024-01-05',
        type: 'two_bar_bearish',
        signal: 'SELL',
        confidence: 75,
        price: 101,
      },
    ];

    const result = runSimulation(mockData, signals, {
      initialCapital: 10000,
      positionSize: 1,
    });

    expect(result.trades).toHaveLength(1);
    expect(result.trades[0].entryPrice).toBe(107);
    expect(result.trades[0].exitPrice).toBe(101);
    expect(result.trades[0].pnl).toBeLessThan(0);
  });

  it('손절 조건 도달 시 청산', () => {
    const signals: Signal[] = [
      {
        index: 1,
        date: '2024-01-02',
        type: 'two_bar_bullish',
        signal: 'BUY',
        confidence: 80,
        price: 107,
      },
    ];

    const result = runSimulation(mockData, signals, {
      initialCapital: 10000,
      positionSize: 1,
      stopLossPercent: 5,
    });

    expect(result.trades).toHaveLength(1);
    expect(result.trades[0].exitPrice).toBe(101);
    expect(result.trades[0].pnlPercent).toBeCloseTo(-5.6, 1);
  });

  it('익절 조건 도달 시 청산', () => {
    const signals: Signal[] = [
      {
        index: 0,
        date: '2024-01-01',
        type: 'two_bar_bullish',
        signal: 'BUY',
        confidence: 80,
        price: 102,
      },
    ];

    const result = runSimulation(mockData, signals, {
      initialCapital: 10000,
      positionSize: 1,
      takeProfitPercent: 5,
    });

    expect(result.trades).toHaveLength(1);
    expect(result.trades[0].exitPrice).toBe(107);
    expect(result.trades[0].pnlPercent).toBeCloseTo(4.9, 1);
  });

  it('minConfidence 미만 신호 필터링', () => {
    const signals: Signal[] = [
      {
        index: 1,
        date: '2024-01-02',
        type: 'two_bar_bullish',
        signal: 'BUY',
        confidence: 60,
        price: 107,
      },
      {
        index: 4,
        date: '2024-01-05',
        type: 'two_bar_bearish',
        signal: 'SELL',
        confidence: 75,
        price: 101,
      },
    ];

    const result = runSimulation(mockData, signals, {
      initialCapital: 10000,
      positionSize: 1,
      minConfidence: 70,
    });

    expect(result.trades).toHaveLength(0);
  });

  it('summary 통계 정확히 계산', () => {
    const data: OHLCVBar[] = [
      {
        date: '2024-01-01',
        open: 100,
        high: 105,
        low: 99,
        close: 100,
        volume: 1000,
      },
      {
        date: '2024-01-02',
        open: 100,
        high: 110,
        low: 99,
        close: 110,
        volume: 1000,
      },
      {
        date: '2024-01-03',
        open: 110,
        high: 115,
        low: 108,
        close: 108,
        volume: 1000,
      },
      {
        date: '2024-01-04',
        open: 108,
        high: 120,
        low: 107,
        close: 120,
        volume: 1000,
      },
      {
        date: '2024-01-05',
        open: 120,
        high: 125,
        low: 115,
        close: 115,
        volume: 1000,
      },
    ];

    const signals: Signal[] = [
      {
        index: 0,
        date: '2024-01-01',
        type: 'bb_bounce_buy',
        signal: 'BUY',
        confidence: 80,
        price: 100,
      },
      {
        index: 1,
        date: '2024-01-02',
        type: 'bb_rejection_sell',
        signal: 'SELL',
        confidence: 80,
        price: 110,
      },
      {
        index: 2,
        date: '2024-01-03',
        type: 'bb_bounce_buy',
        signal: 'BUY',
        confidence: 80,
        price: 108,
      },
      {
        index: 4,
        date: '2024-01-05',
        type: 'bb_rejection_sell',
        signal: 'SELL',
        confidence: 80,
        price: 115,
      },
    ];

    const result = runSimulation(data, signals, {
      initialCapital: 10000,
      positionSize: 1,
    });

    expect(result.summary.totalTrades).toBe(2);
    expect(result.summary.winCount).toBe(2);
    expect(result.summary.lossCount).toBe(0);
    expect(result.summary.winRate).toBe(100);
  });
});
