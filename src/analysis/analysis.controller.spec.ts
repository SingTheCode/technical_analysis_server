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
    it('ticker와 params로 분석을 요청하고 결과를 반환한다', async () => {
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
      jest.spyOn(service, 'analyze').mockResolvedValue(mockResult);

      const requestDto = {
        ticker: 'AAPL',
        params: {
          bbPeriod: 20,
          bbStdMult: 2,
          atrPeriod: 14,
          chandelierMult: 3,
          timeFrame: 'daily' as const,
        },
      };

      const result = await controller.analyze(requestDto);

      expect(service.analyze).toHaveBeenCalledWith('AAPL', requestDto.params);
      expect(result).toEqual(mockResult);
    });
  });

  describe('calculateChandelier', () => {
    it('ticker와 timeFrame으로 샹들리에 청산가를 계산한다', async () => {
      const mockResult = {
        exitPrice: 95.5,
        atr: 5.0,
        highestHigh: 110.5,
      };
      jest.spyOn(service, 'calculateChandelier').mockResolvedValue(mockResult);

      const requestDto = {
        ticker: 'AAPL',
        timeFrame: 'daily' as const,
        position: 'BUY' as const,
        atrPeriod: 14,
        multiplier: 3,
      };

      const result = await controller.calculateChandelier(requestDto);

      expect(service.calculateChandelier).toHaveBeenCalledWith(
        'AAPL',
        'daily',
        'BUY',
        14,
        3,
      );
      expect(result).toEqual(mockResult);
    });
  });
});
