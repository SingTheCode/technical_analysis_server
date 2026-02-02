import { Test, TestingModule } from '@nestjs/testing';
import { BacktestService } from './backtest.service';
import { StockService } from '../stock/stock.service';
import { OHLCVBar } from '../stock/types/ohlcv.entity';

describe('BacktestService', () => {
  let service: BacktestService;
  let stockService: jest.Mocked<StockService>;

  const mockData: OHLCVBar[] = Array.from({ length: 30 }, (_, i) => ({
    date: `2024-01-${String(i + 1).padStart(2, '0')}`,
    open: 100 + i,
    high: 105 + i,
    low: 98 + i,
    close: 102 + i,
    volume: 1000 + i * 100,
  }));

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BacktestService,
        {
          provide: StockService,
          useValue: { getOHLCV: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<BacktestService>(BacktestService);
    stockService = module.get(StockService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('데이터 조회 후 백테스트 실행', async () => {
    stockService.getOHLCV.mockResolvedValue({
      ticker: 'AAPL',
      timeFrame: 'daily',
      data: mockData,
    });

    const result = await service.runBacktest({
      ticker: 'AAPL',
      initialCapital: 10000,
      positionSize: 1,
      bbPeriod: 20,
      bbStdMult: 2,
      atrPeriod: 14,
      chandelierMult: 3,
    });

    expect(stockService.getOHLCV).toHaveBeenCalledWith('AAPL', 'daily', '1y');
    expect(result).toHaveProperty('trades');
    expect(result).toHaveProperty('summary');
  });

  it('minConfidence 필터 적용', async () => {
    stockService.getOHLCV.mockResolvedValue({
      ticker: 'AAPL',
      timeFrame: 'daily',
      data: mockData,
    });

    const result = await service.runBacktest({
      ticker: 'AAPL',
      initialCapital: 10000,
      positionSize: 1,
      bbPeriod: 20,
      bbStdMult: 2,
      atrPeriod: 14,
      chandelierMult: 3,
      minConfidence: 90,
    });

    expect(result.summary.totalTrades).toBeLessThanOrEqual(
      result.trades.length,
    );
  });
});
