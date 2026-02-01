import { Test, TestingModule } from '@nestjs/testing';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';

describe('StockController', () => {
  let controller: StockController;
  let service: StockService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StockController],
      providers: [
        {
          provide: StockService,
          useValue: {
            getOHLCV: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<StockController>(StockController);
    service = module.get<StockService>(StockService);
  });

  describe('getOHLCV', () => {
    it('종목 코드와 시간 프레임으로 OHLCV 데이터를 반환한다', async () => {
      // Given: 서비스 mock 설정
      const mockResult = {
        ticker: 'AAPL',
        timeFrame: 'daily' as const,
        data: [
          {
            date: '2024-01-01',
            open: 100,
            high: 105,
            low: 98,
            close: 103,
            volume: 1000000,
          },
        ],
      };
      jest.spyOn(service, 'getOHLCV').mockResolvedValue(mockResult);

      // When: 컨트롤러 호출
      const result = await controller.getOHLCV('AAPL', { timeFrame: 'daily' });

      // Then: 서비스가 올바른 파라미터로 호출되고 결과 반환
      expect(service.getOHLCV).toHaveBeenCalledWith('AAPL', 'daily');
      expect(result).toEqual(mockResult);
    });

    it('시간 프레임 미지정 시 기본값 daily 사용', async () => {
      // Given: 서비스 mock 설정
      jest.spyOn(service, 'getOHLCV').mockResolvedValue({
        ticker: 'AAPL',
        timeFrame: 'daily',
        data: [],
      });

      // When: 시간 프레임 없이 호출
      await controller.getOHLCV('AAPL', {});

      // Then: daily로 호출
      expect(service.getOHLCV).toHaveBeenCalledWith('AAPL', 'daily');
    });
  });
});
