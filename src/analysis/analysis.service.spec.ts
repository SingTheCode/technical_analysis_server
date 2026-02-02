import { Test, TestingModule } from '@nestjs/testing';
import { AnalysisService } from './analysis.service';
import { StockService } from '../stock/stock.service';
import { OHLCVBar } from '../stock/types/ohlcv.entity';
import { AnalysisParams } from './types/analysis.entity';

describe('AnalysisService', () => {
  let service: AnalysisService;
  let stockService: StockService;

  const mockOHLCVData: OHLCVBar[] = Array.from({ length: 30 }, (_, i) => ({
    date: `2024-01-${String(i + 1).padStart(2, '0')}`,
    open: 100 + i,
    high: 105 + i,
    low: 98 + i,
    close: 103 + i,
    volume: 1000000,
  }));

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalysisService,
        {
          provide: StockService,
          useValue: {
            getOHLCV: jest.fn().mockResolvedValue({
              ticker: 'AAPL',
              timeFrame: 'daily',
              data: mockOHLCVData,
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AnalysisService>(AnalysisService);
    stockService = module.get<StockService>(StockService);
  });

  describe('analyze', () => {
    const defaultParams: AnalysisParams = {
      bbPeriod: 20,
      bbStdMult: 2,
      atrPeriod: 14,
      chandelierMult: 3,
      timeFrame: 'daily',
    };

    it('ticker로 OHLCV를 조회하고 분석 결과를 반환한다', async () => {
      const result = await service.analyze('AAPL', defaultParams);

      expect(stockService.getOHLCV).toHaveBeenCalledWith('AAPL', 'daily');
      expect(result).toHaveProperty('signals');
      expect(result).toHaveProperty('stats');
      expect(result).toHaveProperty('currentATR');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('bollingerBands');
    });

    it('통계 정보를 올바르게 계산한다', async () => {
      const result = await service.analyze('AAPL', defaultParams);

      expect(result.stats).toHaveProperty('buyCount');
      expect(result.stats).toHaveProperty('sellCount');
      expect(result.stats).toHaveProperty('totalBars');
      expect(result.stats.totalBars).toBe(mockOHLCVData.length);
    });

    it('볼린저밴드를 계산한다', async () => {
      const result = await service.analyze('AAPL', defaultParams);

      expect(result.bollingerBands).toHaveLength(mockOHLCVData.length);
    });

    it('데이터가 부족하면 예외를 던진다', async () => {
      jest.spyOn(stockService, 'getOHLCV').mockResolvedValue({
        ticker: 'AAPL',
        timeFrame: 'daily',
        data: mockOHLCVData.slice(0, 5),
      });

      await expect(service.analyze('AAPL', defaultParams)).rejects.toThrow(
        '최소',
      );
    });
  });

  describe('calculateChandelier', () => {
    it('ticker로 OHLCV를 조회하고 BUY 포지션 청산가를 계산한다', async () => {
      const result = await service.calculateChandelier(
        'AAPL',
        'daily',
        'BUY',
        14,
        3,
      );

      expect(stockService.getOHLCV).toHaveBeenCalledWith('AAPL', 'daily');
      expect(result).toHaveProperty('exitPrice');
      expect(result).toHaveProperty('atr');
      expect(result).toHaveProperty('highestHigh');
      expect(result.exitPrice).toBeGreaterThan(0);
    });

    it('SELL 포지션의 청산가를 계산한다', async () => {
      const result = await service.calculateChandelier(
        'AAPL',
        'daily',
        'SELL',
        14,
        3,
      );

      expect(result).toHaveProperty('exitPrice');
      expect(result).toHaveProperty('lowestLow');
      expect(result.exitPrice).toBeGreaterThan(0);
    });

    it('데이터가 부족하면 예외를 던진다', async () => {
      jest.spyOn(stockService, 'getOHLCV').mockResolvedValue({
        ticker: 'AAPL',
        timeFrame: 'daily',
        data: mockOHLCVData.slice(0, 5),
      });

      await expect(
        service.calculateChandelier('AAPL', 'daily', 'BUY', 14, 3),
      ).rejects.toThrow('최소');
    });
  });
});
