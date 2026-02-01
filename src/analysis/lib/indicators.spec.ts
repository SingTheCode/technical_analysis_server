import {
  calculateATR,
  calculateBollingerBands,
  calculateChandelierExit,
} from './indicators';
import { OHLCVBar } from '../../stock/types/ohlcv.entity';

describe('indicators', () => {
  const mockData: OHLCVBar[] = Array.from({ length: 20 }, (_, i) => ({
    date: `2024-01-${String(i + 1).padStart(2, '0')}`,
    open: 100 + i,
    high: 110 + i,
    low: 95 + i,
    close: 105 + i,
    volume: 1000000,
  }));

  describe('calculateChandelierExit', () => {
    it('BUY 신호의 청산가는 최근 봉 기준으로 계산한다', () => {
      // Given: ATR 값과 신호
      const atrValues = calculateATR(mockData, 14);
      const signal = { signal: 'BUY' as const, index: 15 };
      const lastIndex = mockData.length - 1;

      // When: 청산가 계산
      const exitPrice = calculateChandelierExit(
        signal,
        mockData,
        atrValues,
        14,
        3,
      );

      // Then: 최근 봉(lastIndex) 기준으로 계산됨
      const lastATR = atrValues[lastIndex];
      let highestHigh = -Infinity;
      for (let i = Math.max(0, lastIndex - 14 + 1); i <= lastIndex; i++) {
        highestHigh = Math.max(highestHigh, mockData[i].high);
      }
      const expectedExit = highestHigh - lastATR! * 3;

      expect(exitPrice).toBeCloseTo(expectedExit, 2);
    });

    it('SELL 신호의 청산가는 최근 봉 기준으로 계산한다', () => {
      // Given: ATR 값과 신호
      const atrValues = calculateATR(mockData, 14);
      const signal = { signal: 'SELL' as const, index: 15 };
      const lastIndex = mockData.length - 1;

      // When: 청산가 계산
      const exitPrice = calculateChandelierExit(
        signal,
        mockData,
        atrValues,
        14,
        3,
      );

      // Then: 최근 봉(lastIndex) 기준으로 계산됨
      const lastATR = atrValues[lastIndex];
      let lowestLow = Infinity;
      for (let i = Math.max(0, lastIndex - 14 + 1); i <= lastIndex; i++) {
        lowestLow = Math.min(lowestLow, mockData[i].low);
      }
      const expectedExit = lowestLow + lastATR! * 3;

      expect(exitPrice).toBeCloseTo(expectedExit, 2);
    });
  });
});
