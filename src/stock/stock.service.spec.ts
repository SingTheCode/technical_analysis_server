import { Test, TestingModule } from '@nestjs/testing';
import { StockService } from './stock.service';
import { TimeFrame } from './types/ohlcv.entity';

describe('StockService', () => {
  let service: StockService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StockService],
    }).compile();

    service = module.get<StockService>(StockService);
  });

  describe('getOHLCV', () => {
    it('일봉 요청 시 3개월 데이터를 가져온다', async () => {
      // Given: fetch mock 설정
      const mockResponse = {
        chart: {
          result: [
            {
              timestamp: [1704067200],
              indicators: {
                quote: [
                  {
                    open: [100],
                    high: [105],
                    low: [98],
                    close: [103],
                    volume: [1000000],
                  },
                ],
              },
            },
          ],
          error: null,
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      // When: 일봉 데이터 요청
      const result = await service.getOHLCV('AAPL', 'daily');

      // Then: 올바른 URL로 호출되고 데이터 반환
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('range=3mo&interval=1d'),
        expect.any(Object),
      );
      expect(result.data).toHaveLength(1);
      expect(result.data[0].open).toBe(100);
    });

    it('주봉 요청 시 1년 데이터를 가져온다', async () => {
      // Given: fetch mock 설정
      const mockResponse = {
        chart: {
          result: [
            {
              timestamp: [1704067200],
              indicators: {
                quote: [
                  {
                    open: [100],
                    high: [105],
                    low: [98],
                    close: [103],
                    volume: [1000000],
                  },
                ],
              },
            },
          ],
          error: null,
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      // When: 주봉 데이터 요청
      await service.getOHLCV('AAPL', 'weekly');

      // Then: 올바른 URL로 호출
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('range=1y&interval=1wk'),
        expect.any(Object),
      );
    });

    it('API 에러 시 예외를 던진다', async () => {
      // Given: fetch 실패 mock
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      // When & Then: 예외 발생
      await expect(service.getOHLCV('INVALID', 'daily')).rejects.toThrow(
        '종목 데이터를 불러올 수 없습니다',
      );
    });

    it('Yahoo Finance 에러 응답 시 예외를 던진다', async () => {
      // Given: Yahoo Finance 에러 응답
      const mockResponse = {
        chart: {
          result: null,
          error: {
            code: 'Not Found',
            description: 'No data found',
          },
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      // When & Then: 예외 발생
      await expect(service.getOHLCV('INVALID', 'daily')).rejects.toThrow(
        'No data found',
      );
    });
  });
});
