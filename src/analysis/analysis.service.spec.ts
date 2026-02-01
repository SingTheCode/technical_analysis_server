import { Test, TestingModule } from '@nestjs/testing';
import { AnalysisService } from './analysis.service';
import { OHLCVBar } from '../stock/types/ohlcv.entity';
import { AnalysisParams } from './types/analysis.entity';

describe('AnalysisService', () => {
  let service: AnalysisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AnalysisService],
    }).compile();

    service = module.get<AnalysisService>(AnalysisService);
  });

  describe('analyze', () => {
    const mockData: OHLCVBar[] = Array.from({ length: 30 }, (_, i) => ({
      date: `2024-01-${String(i + 1).padStart(2, '0')}`,
      open: 100 + i,
      high: 105 + i,
      low: 98 + i,
      close: 103 + i,
      volume: 1000000,
    }));

    const defaultParams: AnalysisParams = {
      bbPeriod: 20,
      bbStdMult: 2,
      atrPeriod: 14,
      chandelierMult: 3,
      timeFrame: 'daily',
    };

    it('분석 결과를 반환한다', () => {
      // Given: OHLCV 데이터와 파라미터

      // When: 분석 실행
      const result = service.analyze(mockData, defaultParams);

      // Then: 결과 구조 확인
      expect(result).toHaveProperty('signals');
      expect(result).toHaveProperty('stats');
      expect(result).toHaveProperty('currentATR');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('bollingerBands');
    });

    it('통계 정보를 올바르게 계산한다', () => {
      // Given: OHLCV 데이터와 파라미터

      // When: 분석 실행
      const result = service.analyze(mockData, defaultParams);

      // Then: 통계 구조 확인
      expect(result.stats).toHaveProperty('buyCount');
      expect(result.stats).toHaveProperty('sellCount');
      expect(result.stats).toHaveProperty('totalBars');
      expect(result.stats.totalBars).toBe(mockData.length);
    });

    it('볼린저밴드를 계산한다', () => {
      // Given: OHLCV 데이터와 파라미터

      // When: 분석 실행
      const result = service.analyze(mockData, defaultParams);

      // Then: 볼린저밴드 길이 확인
      expect(result.bollingerBands).toHaveLength(mockData.length);
    });

    it('데이터가 부족하면 예외를 던진다', () => {
      // Given: 부족한 데이터
      const shortData = mockData.slice(0, 5);

      // When & Then: 예외 발생
      expect(() => service.analyze(shortData, defaultParams)).toThrow('최소');
    });
  });

  describe('calculateChandelier', () => {
    const mockData: OHLCVBar[] = Array.from({ length: 30 }, (_, i) => ({
      date: `2024-01-${String(i + 1).padStart(2, '0')}`,
      open: 100 + i,
      high: 105 + i,
      low: 98 + i,
      close: 103 + i,
      volume: 1000000,
    }));

    it('BUY 포지션의 청산가를 계산한다', () => {
      // Given & When: BUY 포지션 청산가 계산
      const result = service.calculateChandelier(mockData, 'BUY', 14, 3);

      // Then: 청산가 반환
      expect(result).toHaveProperty('exitPrice');
      expect(result).toHaveProperty('atr');
      expect(result).toHaveProperty('highestHigh');
      expect(result.exitPrice).toBeGreaterThan(0);
      expect(result.highestHigh).toBeGreaterThan(0);
    });

    it('SELL 포지션의 청산가를 계산한다', () => {
      // Given & When: SELL 포지션 청산가 계산
      const result = service.calculateChandelier(mockData, 'SELL', 14, 3);

      // Then: 청산가 반환
      expect(result).toHaveProperty('exitPrice');
      expect(result).toHaveProperty('atr');
      expect(result).toHaveProperty('lowestLow');
      expect(result.exitPrice).toBeGreaterThan(0);
      expect(result.lowestLow).toBeGreaterThan(0);
    });

    it('데이터가 부족하면 예외를 던진다', () => {
      // Given: 부족한 데이터
      const shortData = mockData.slice(0, 5);

      // When & Then: 예외 발생
      expect(() =>
        service.calculateChandelier(shortData, 'BUY', 14, 3),
      ).toThrow('최소');
    });
  });
});
