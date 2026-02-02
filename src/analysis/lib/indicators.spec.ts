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

  describe('calculateATR', () => {
    it('RMA(Wilder) 방식으로 ATR을 계산한다', () => {
      // Given: 5개 봉, period=3
      const data: OHLCVBar[] = [
        { date: '2024-01-01', open: 100, high: 105, low: 95, close: 102, volume: 1000 },
        { date: '2024-01-02', open: 102, high: 108, low: 100, close: 106, volume: 1000 },
        { date: '2024-01-03', open: 106, high: 112, low: 104, close: 110, volume: 1000 },
        { date: '2024-01-04', open: 110, high: 115, low: 107, close: 113, volume: 1000 },
        { date: '2024-01-05', open: 113, high: 118, low: 110, close: 116, volume: 1000 },
      ];

      // TR 계산:
      // TR[0] = 105 - 95 = 10
      // TR[1] = max(108-100, |108-102|, |100-102|) = max(8, 6, 2) = 8
      // TR[2] = max(112-104, |112-106|, |104-106|) = max(8, 6, 2) = 8
      // TR[3] = max(115-107, |115-110|, |107-110|) = max(8, 5, 3) = 8
      // TR[4] = max(118-110, |118-113|, |110-113|) = max(8, 5, 3) = 8

      // RMA 계산 (period=3):
      // ATR[2] = (10 + 8 + 8) / 3 = 8.6667 (첫 ATR은 SMA)
      // ATR[3] = (8.6667 * 2 + 8) / 3 = 8.4444
      // ATR[4] = (8.4444 * 2 + 8) / 3 = 8.2963

      const result = calculateATR(data, 3);

      expect(result[0]).toBeNull();
      expect(result[1]).toBeNull();
      expect(result[2]).toBeCloseTo(8.6667, 2);
      expect(result[3]).toBeCloseTo(8.4444, 2);
      expect(result[4]).toBeCloseTo(8.2963, 2);
    });
  });

  describe('calculateChandelierExit', () => {
    it('롱 청산가는 HHV - ATR * multiplier로 계산한다', () => {
      const atrValues = calculateATR(mockData, 14);
      const lastIndex = mockData.length - 1;

      const exitPrice = calculateChandelierExit(mockData, atrValues, 14, 3);

      const lastATR = atrValues[lastIndex];
      let highestHigh = -Infinity;
      for (let i = Math.max(0, lastIndex - 14 + 1); i <= lastIndex; i++) {
        highestHigh = Math.max(highestHigh, mockData[i].high);
      }
      const expectedExit = highestHigh - lastATR! * 3;

      expect(exitPrice).toBeCloseTo(expectedExit, 2);
    });
  });
});
