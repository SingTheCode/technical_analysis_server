import { Test, TestingModule } from '@nestjs/testing';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';

describe('AnalysisController', () => {
  let controller: AnalysisController;
  let service: AnalysisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalysisController],
      providers: [
        {
          provide: AnalysisService,
          useValue: {
            analyze: jest.fn(),
            calculateChandelier: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AnalysisController>(AnalysisController);
    service = module.get<AnalysisService>(AnalysisService);
  });

  describe('analyze', () => {
    it('분석 요청을 처리하고 결과를 반환한다', () => {
      const mockResult = {
        signals: [],
        stats: {
          buyCount: 0,
          sellCount: 0,
          totalBars: 30,
          patternCount: 0,
          recentSignalCount: 0,
        },
        currentATR: 5.0,
        data: [],
        bollingerBands: [],
      };
      jest.spyOn(service, 'analyze').mockReturnValue(mockResult);

      const requestDto = {
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
        params: {
          bbPeriod: 20,
          bbStdMult: 2,
          atrPeriod: 14,
          chandelierMult: 3,
          timeFrame: 'daily' as const,
        },
      };

      const result = controller.analyze(requestDto);

      expect(service.analyze).toHaveBeenCalledWith(
        requestDto.data,
        requestDto.params,
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('calculateChandelier', () => {
    it('샹들리에 청산가를 계산하고 반환한다', () => {
      // Given: 서비스 mock 설정
      const mockResult = {
        exitPrice: 95.5,
        atr: 5.0,
        highestHigh: 110.5,
      };
      jest.spyOn(service, 'calculateChandelier').mockReturnValue(mockResult);

      const requestDto = {
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
        position: 'BUY' as const,
        atrPeriod: 14,
        multiplier: 3,
      };

      // When: 컨트롤러 호출
      const result = controller.calculateChandelier(requestDto);

      // Then: 서비스가 올바른 파라미터로 호출되고 결과 반환
      expect(service.calculateChandelier).toHaveBeenCalledWith(
        requestDto.data,
        'BUY',
        14,
        3,
      );
      expect(result).toEqual(mockResult);
    });
  });
});
