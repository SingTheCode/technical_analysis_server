import { Test, TestingModule } from '@nestjs/testing';
import { BacktestController } from './backtest.controller';
import { BacktestService } from './backtest.service';
import { BacktestResult } from './types/backtest.entity';

describe('BacktestController', () => {
  let controller: BacktestController;
  let service: jest.Mocked<BacktestService>;

  const mockResult: BacktestResult = {
    trades: [],
    summary: {
      totalTrades: 0,
      winCount: 0,
      lossCount: 0,
      winRate: 0,
      totalPnl: 0,
      totalPnlPercent: 0,
      maxDrawdown: 0,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BacktestController],
      providers: [
        { provide: BacktestService, useValue: { runBacktest: jest.fn() } },
      ],
    }).compile();

    controller = module.get<BacktestController>(BacktestController);
    service = module.get(BacktestService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('POST /backtest 호출 시 서비스 실행', async () => {
    service.runBacktest.mockResolvedValue(mockResult);

    const dto = {
      ticker: 'AAPL',
      initialCapital: 10000,
      positionSize: 1,
      bbPeriod: 20,
      bbStdMult: 2,
      atrPeriod: 14,
      chandelierMult: 3,
    };

    const result = await controller.runBacktest(dto);

    expect(service.runBacktest).toHaveBeenCalledWith(dto);
    expect(result).toEqual(mockResult);
  });
});
