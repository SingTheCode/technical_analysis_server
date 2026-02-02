import {
  detectTwoBarReversal,
  detectWBottom,
  detectBollingerSignals,
  consolidateSignals,
} from './patterns';
import { getWeights } from './pattern-weights';
import { OHLCVBar } from '../../stock/types/ohlcv.entity';
import { BollingerBand, Signal } from '../types/analysis.entity';

// 테스트 헬퍼: OHLCV 바 생성
const createBar = (
  date: string,
  open: number,
  high: number,
  low: number,
  close: number,
  volume = 1000000,
): OHLCVBar => ({ date, open, high, low, close, volume });

// 테스트 헬퍼: 볼린저밴드 생성
const createBB = (
  lower: number,
  middle: number,
  upper: number,
): BollingerBand => ({ lower, middle, upper, sma: middle });

describe('getWeights', () => {
  it('daily timeframe 가중치 반환', () => {
    const weights = getWeights('daily');
    expect(weights.twoBarReversal.baseConfidenceConfirmed).toBeDefined();
    expect(weights.twoBarReversal.volumeBonus).toBeGreaterThan(0);
  });

  it('weekly timeframe 가중치 반환', () => {
    const weights = getWeights('weekly');
    expect(weights.twoBarReversal.baseConfidenceConfirmed).toBeDefined();
  });

  it('weekly는 daily보다 기본 신뢰도가 높음', () => {
    const daily = getWeights('daily');
    const weekly = getWeights('weekly');
    expect(
      weekly.twoBarReversal.baseConfidenceConfirmed,
    ).toBeGreaterThanOrEqual(daily.twoBarReversal.baseConfidenceConfirmed);
  });

  it('weekly W패턴은 저점 차이 12%까지 허용', () => {
    const weights = getWeights('weekly');
    expect(weights.wBottom.maxLowDiff).toBe(0.12);
  });
});

describe('TimeFrame별 패턴 감지', () => {
  it('detectTwoBarReversal - daily/weekly 호출 가능', () => {
    const data: OHLCVBar[] = [
      createBar('2024-01-01', 100, 102, 88, 92),
      createBar('2024-01-02', 92, 108, 91, 100, 1500000),
    ];
    const bb = data.map(() => createBB(90, 100, 110));
    const atr = data.map(() => 8);

    const dailySignals = detectTwoBarReversal(data, bb, atr, 'daily');
    const weeklySignals = detectTwoBarReversal(data, bb, atr, 'weekly');
    expect(Array.isArray(dailySignals)).toBe(true);
    expect(Array.isArray(weeklySignals)).toBe(true);
  });

  it('detectWBottom - timeFrame 옵션 지원', () => {
    const data: OHLCVBar[] = [
      createBar('2024-01-01', 100, 102, 100, 101),
      createBar('2024-01-02', 101, 102, 100, 101),
      createBar('2024-01-03', 101, 102, 85, 87),
      createBar('2024-01-04', 87, 105, 86, 104),
      createBar('2024-01-05', 104, 106, 103, 105),
      createBar('2024-01-06', 105, 106, 91, 95),
      createBar('2024-01-07', 95, 112, 94, 110),
      createBar('2024-01-08', 110, 115, 109, 114),
    ];
    const bb = data.map(() => createBB(85, 100, 115));

    const dailySignals = detectWBottom(data, bb, { timeFrame: 'daily' });
    const weeklySignals = detectWBottom(data, bb, { timeFrame: 'weekly' });
    expect(Array.isArray(dailySignals)).toBe(true);
    expect(Array.isArray(weeklySignals)).toBe(true);
  });

  it('detectBollingerSignals - timeFrame 파라미터 지원', () => {
    const data: OHLCVBar[] = Array.from({ length: 22 }, (_, i) =>
      createBar(
        `2024-01-${String(i + 1).padStart(2, '0')}`,
        100,
        102,
        98,
        100,
        1000000,
      ),
    );
    data[20] = createBar('2024-01-21', 100, 101, 89, 90);
    data[21] = createBar('2024-01-22', 90, 98, 89, 96, 1500000);
    const bb = data.map(() => createBB(90, 100, 110));

    const dailySignals = detectBollingerSignals(data, bb, 'daily');
    const weeklySignals = detectBollingerSignals(data, bb, 'weekly');
    expect(Array.isArray(dailySignals)).toBe(true);
    expect(Array.isArray(weeklySignals)).toBe(true);
  });
});

describe('patterns', () => {
  describe('detectTwoBarReversal - 추세 필터', () => {
    it('하락추세에서 매수 신호 차단', () => {
      // Given: 20일간 하락추세 데이터 (100 → 85, -15%)
      const data: OHLCVBar[] = Array.from({ length: 22 }, (_, i) => {
        const price = 100 - i * 0.7; // 점진적 하락
        return createBar(
          `2024-01-${String(i + 1).padStart(2, '0')}`,
          price + 1,
          price + 2,
          price - 10,
          price,
        );
      });
      // Two Bar Reversal 패턴 추가 (음봉 → 양봉)
      data[20] = createBar('2024-01-21', 88, 89, 78, 82); // 음봉, BB 이탈
      data[21] = createBar('2024-01-22', 82, 95, 81, 90, 1500000); // 양봉

      const bb: BollingerBand[] = data.map(() => createBB(80, 90, 100));
      const atrValues = data.map(() => 8);

      // When
      const signals = detectTwoBarReversal(data, bb, atrValues);

      // Then: 하락추세에서 매수 신호 없음
      const buySignals = signals.filter((s) => s.signal === 'BUY');
      expect(buySignals.length).toBe(0);
    });

    it('상승추세에서는 매수 신호 정상 발생', () => {
      // Given: 20일간 상승추세 데이터
      const data: OHLCVBar[] = Array.from({ length: 22 }, (_, i) => {
        const price = 100 + i * 0.5;
        return createBar(
          `2024-01-${String(i + 1).padStart(2, '0')}`,
          price,
          price + 2,
          price - 1,
          price + 1,
          1000000,
        );
      });
      // Two Bar Reversal 패턴 (조정 후 반등) - BB 이탈 + 충분한 range
      data[20] = createBar('2024-01-21', 112, 113, 98, 102); // 음봉, 저가 98 < BB하단 100
      data[21] = createBar('2024-01-22', 102, 118, 101, 115, 1500000); // 양봉, range=17

      const bb: BollingerBand[] = data.map(() => createBB(100, 110, 120));
      const atrValues = data.map(() => 8); // range 17 >= 8*1.8=14.4

      // When
      const signals = detectTwoBarReversal(data, bb, atrValues);

      // Then: 상승추세에서 매수 신호 발생
      const buySignals = signals.filter((s) => s.signal === 'BUY');
      expect(buySignals.length).toBeGreaterThan(0);
    });

    it('약한 하락추세(-5%~-10%)에서는 신호 발생하되 신뢰도 감소', () => {
      // Given: 약한 하락추세
      const data: OHLCVBar[] = Array.from({ length: 42 }, (_, i) => {
        const price = 100 - i * 0.17;
        return createBar(
          `2024-01-${String(i + 1).padStart(2, '0')}`,
          price,
          price + 2,
          price - 1,
          price + 1,
          1000000,
        );
      });
      data[40] = createBar('2024-02-10', 94, 95, 88, 90);
      data[41] = createBar('2024-02-11', 90, 105, 89, 100, 1500000);

      const bb: BollingerBand[] = data.map(() => createBB(90, 100, 110));
      const atrValues = data.map(() => 8);

      const signals = detectTwoBarReversal(data, bb, atrValues);
      const buySignals = signals.filter((s) => s.signal === 'BUY');
      if (buySignals.length > 0) {
        expect(buySignals[0].confidence).toBeLessThan(90);
      }
    });
  });

  describe('detectWBottom - 저점 간격 허용 범위', () => {
    it('저점 차이 8% 이내 + confirmed=true면 W패턴 인정', () => {
      const data: OHLCVBar[] = [
        createBar('2024-01-01', 100, 102, 100, 101),
        createBar('2024-01-02', 101, 102, 100, 101),
        createBar('2024-01-03', 101, 102, 84, 87), // 저점1: 84 < BB하단 85
        createBar('2024-01-04', 87, 105, 86, 104),
        createBar('2024-01-05', 104, 106, 103, 105),
        createBar('2024-01-06', 105, 106, 90, 95), // 저점2: 90 >= BB하단 85 (7% 차이)
        createBar('2024-01-07', 95, 112, 94, 110),
        createBar('2024-01-08', 110, 115, 109, 114),
        createBar('2024-01-09', 114, 118, 113, 117),
        createBar('2024-01-10', 117, 120, 116, 119),
        createBar('2024-01-11', 119, 122, 118, 121),
      ];
      const bb: BollingerBand[] = data.map(() => createBB(85, 100, 115));

      const signals = detectWBottom(data, bb, {
        requireBreakout: true,
        maxLookAhead: 3,
      });
      expect(signals.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('detectBollingerSignals - 거래량 조건 완화', () => {
    it('거래량 없어도 BB 하단 반등 시 신호 발생', () => {
      const data: OHLCVBar[] = Array.from({ length: 42 }, (_, i) => {
        const price = 100 + i * 0.2;
        return createBar(
          `2024-01-${String(i + 1).padStart(2, '0')}`,
          price,
          price + 2,
          price - 1,
          price + 1,
          1000000,
        );
      });
      data[40] = createBar('2024-02-10', 108, 109, 99, 100);
      data[41] = createBar('2024-02-11', 100, 108, 99, 106, 1000000); // 거래량 평균

      const bb: BollingerBand[] = data.map(() => createBB(100, 110, 120));

      const signals = detectBollingerSignals(data, bb);
      const bounceSignal = signals.find((s) => s.type === 'bb_bounce_buy');
      expect(bounceSignal).toBeDefined();
    });
  });

  describe('detectTwoBarReversal', () => {
    describe('Bullish 패턴 확정 조건', () => {
      it('왼쪽 bar가 BB 하단 이탈 + 오른쪽 bar가 BB 내부 복귀 시 confirmed=true', () => {
        // Given: 충분한 range와 body similarity를 가진 Two Bar Reversal
        // 음봉(open > close) → 양봉(close > open), 저가 BB 이탈
        const data: OHLCVBar[] = [
          createBar('2024-01-01', 100, 102, 88, 92), // 음봉, 저가 88 < BB하단 90
          createBar('2024-01-02', 92, 108, 91, 100, 1500000), // 양봉, range=17 >= ATR*1.8
        ];
        const bb: BollingerBand[] = [
          createBB(90, 100, 110),
          createBB(90, 100, 110),
        ];
        const atrValues = [8, 8]; // range 17 >= 8*1.8=14.4

        // When
        const signals = detectTwoBarReversal(data, bb, atrValues);

        // Then
        expect(signals.length).toBe(1);
        expect(signals[0].type).toBe('two_bar_bullish');
        expect(signals[0].confirmed).toBe(true);
      });

      it('왼쪽 bar가 BB 이탈하지 않으면 confirmed=false', () => {
        // Given: 저가가 BB 하단 이탈 안함
        const data: OHLCVBar[] = [
          createBar('2024-01-01', 100, 102, 91, 92), // 저가 91 >= BB하단 90
          createBar('2024-01-02', 92, 108, 91, 100, 1500000),
        ];
        const bb: BollingerBand[] = [
          createBB(90, 100, 110),
          createBB(90, 100, 110),
        ];
        const atrValues = [8, 8];

        // When
        const signals = detectTwoBarReversal(data, bb, atrValues);

        // Then
        if (signals.length > 0) {
          expect(signals[0].confirmed).toBe(false);
        }
      });
    });

    describe('Bearish 패턴 확정 조건', () => {
      it('왼쪽 bar가 BB 상단 이탈 + 오른쪽 bar가 BB 내부 복귀 시 confirmed=true', () => {
        // Given: 양봉 → 음봉, 고가 BB 상단 이탈
        const data: OHLCVBar[] = [
          createBar('2024-01-01', 100, 112, 98, 108), // 양봉, 고가 112 > BB상단 110
          createBar('2024-01-02', 108, 109, 90, 100, 1500000), // 음봉, range=19
        ];
        const bb: BollingerBand[] = [
          createBB(90, 100, 110),
          createBB(90, 100, 110),
        ];
        const atrValues = [8, 8];

        // When
        const signals = detectTwoBarReversal(data, bb, atrValues);

        // Then
        expect(signals.length).toBe(1);
        expect(signals[0].type).toBe('two_bar_bearish');
        expect(signals[0].confirmed).toBe(true);
      });
    });

    describe('거래량 검증', () => {
      it('거래량이 평균의 1.2배 이상이면 volumeConfirm=true', () => {
        // Given: 20일 평균 거래량 계산 가능한 데이터
        const data: OHLCVBar[] = Array.from({ length: 22 }, (_, i) =>
          createBar(
            `2024-01-${String(i + 1).padStart(2, '0')}`,
            100,
            102,
            98,
            100,
            1000000,
          ),
        );
        // Two Bar Reversal 패턴 + 거래량 2배
        data[20] = createBar('2024-01-21', 100, 102, 88, 92); // 음봉, BB 이탈
        data[21] = createBar('2024-01-22', 92, 110, 91, 100, 2000000); // 양봉, 거래량 2배

        const bb: BollingerBand[] = data.map(() => createBB(90, 100, 110));
        const atrValues = data.map(() => 8);

        // When
        const signals = detectTwoBarReversal(data, bb, atrValues);

        // Then
        const lastSignal = signals.find((s) => s.index === 21);
        expect(lastSignal).toBeDefined();
        expect(lastSignal?.metadata?.volumeConfirm).toBe(true);
      });
    });
  });

  describe('detectWBottom', () => {
    describe('확정 조건', () => {
      it('저점1이 BB 이탈 + 저점2가 BB 내부면 confirmed=true', () => {
        // Given: W패턴 데이터 (충분한 길이 확보)
        const data: OHLCVBar[] = [
          createBar('2024-01-01', 100, 102, 100, 101), // i=0
          createBar('2024-01-02', 101, 102, 100, 101), // i=1
          createBar('2024-01-03', 101, 102, 88, 90), // i=2, 저점1: 88 < BB하단 90
          createBar('2024-01-04', 90, 100, 89, 99), // i=3
          createBar('2024-01-05', 99, 105, 98, 104), // i=4, 고점: 105
          createBar('2024-01-06', 104, 105, 90, 95), // i=5, 저점2: 90 >= BB하단 90
          createBar('2024-01-07', 95, 110, 94, 108), // i=6, 브레이크아웃
          createBar('2024-01-08', 108, 112, 107, 110), // i=7, 패딩
          createBar('2024-01-09', 110, 115, 109, 114), // i=8, 패딩
          createBar('2024-01-10', 114, 118, 113, 117), // i=9, 패딩
          createBar('2024-01-11', 117, 120, 116, 119), // i=10, 패딩
          createBar('2024-01-12', 119, 122, 118, 121), // i=11, 패딩
        ];

        const bb: BollingerBand[] = data.map(() => createBB(90, 100, 110));

        // When
        const signals = detectWBottom(data, bb, {
          requireBreakout: true,
          maxLookAhead: 3,
        });

        // Then
        expect(signals.length).toBeGreaterThanOrEqual(1);
        const wSignal = signals.find((s) => s.type === 'w_bottom');
        expect(wSignal?.confirmed).toBe(true);
      });

      it('저점1이 BB 이탈하지 않으면 신호 발생 안함', () => {
        // Given: 저점1이 BB 내부
        const data: OHLCVBar[] = [
          createBar('2024-01-01', 100, 102, 100, 101),
          createBar('2024-01-02', 101, 102, 100, 101),
          createBar('2024-01-03', 101, 102, 92, 93), // 저점1: 92 >= BB하단 90
          createBar('2024-01-04', 93, 105, 92, 104), // 고점
          createBar('2024-01-05', 104, 105, 103, 104),
          createBar('2024-01-06', 104, 105, 93, 95), // 저점2
          createBar('2024-01-07', 95, 110, 94, 108), // 브레이크아웃
        ];
        const bb: BollingerBand[] = data.map(() => createBB(90, 100, 110));

        // When
        const signals = detectWBottom(data, bb, { requireBreakout: true });

        // Then: confirmed=false이므로 신호 없음
        expect(signals.length).toBe(0);
      });
    });

    describe('옵션', () => {
      it('requireBreakout=false + confirmed=true면 W형성만으로 신호 발생', () => {
        // Given: 브레이크아웃 없는 W패턴 (저점1 BB 이탈 필수)
        const data: OHLCVBar[] = [
          createBar('2024-01-01', 100, 102, 100, 101),
          createBar('2024-01-02', 101, 102, 100, 101),
          createBar('2024-01-03', 101, 102, 85, 90), // 저점1: 85 < BB하단 90
          createBar('2024-01-04', 90, 105, 89, 104), // 고점
          createBar('2024-01-05', 104, 105, 103, 104),
          createBar('2024-01-06', 104, 105, 90, 95), // 저점2: 90 >= BB하단 90
        ];
        const bb: BollingerBand[] = data.map(() => createBB(90, 100, 110));

        // When
        const signals = detectWBottom(data, bb, { requireBreakout: false });

        // Then: 브레이크아웃 없이도 신호 발생 (confirmed=true 필수)
        expect(signals.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('detectBollingerSignals', () => {
    describe('하단 반등 (bb_bounce_buy)', () => {
      it('BB 하단 터치 후 양봉 반등 + 거래량 증가 시 신호 발생', () => {
        // Given: 20개 이상의 데이터 (평균 거래량 계산용)
        const data: OHLCVBar[] = Array.from({ length: 22 }, (_, i) =>
          createBar(
            `2024-01-${String(i + 1).padStart(2, '0')}`,
            100,
            102,
            98,
            100,
            1000000,
          ),
        );
        // 마지막 2개: BB 하단 터치 후 반등
        data[20] = createBar('2024-01-21', 100, 101, 89, 90); // 저가 89 <= BB하단 90
        data[21] = createBar('2024-01-22', 90, 98, 89, 96, 1500000); // 양봉, 거래량 증가

        const bb: BollingerBand[] = data.map(() => createBB(90, 100, 110));

        // When
        const signals = detectBollingerSignals(data, bb);

        // Then
        const bounceSignal = signals.find((s) => s.type === 'bb_bounce_buy');
        expect(bounceSignal).toBeDefined();
        expect(bounceSignal?.signal).toBe('BUY');
      });
    });

    describe('상단 반락 (bb_rejection_sell)', () => {
      it('BB 상단 터치 후 음봉 반락 + 거래량 증가 시 신호 발생', () => {
        // Given
        const data: OHLCVBar[] = Array.from({ length: 22 }, (_, i) =>
          createBar(
            `2024-01-${String(i + 1).padStart(2, '0')}`,
            100,
            102,
            98,
            100,
            1000000,
          ),
        );
        data[20] = createBar('2024-01-21', 100, 111, 99, 109); // 고가 111 >= BB상단 110
        data[21] = createBar('2024-01-22', 109, 110, 102, 104, 1500000); // 음봉

        const bb: BollingerBand[] = data.map(() => createBB(90, 100, 110));

        // When
        const signals = detectBollingerSignals(data, bb);

        // Then
        const rejectSignal = signals.find(
          (s) => s.type === 'bb_rejection_sell',
        );
        expect(rejectSignal).toBeDefined();
        expect(rejectSignal?.signal).toBe('SELL');
      });
    });

    describe('BB Squeeze', () => {
      it('Squeeze 상태에서 반등 시 신뢰도 추가 상승', () => {
        // Given
        const data: OHLCVBar[] = Array.from({ length: 22 }, (_, i) =>
          createBar(
            `2024-01-${String(i + 1).padStart(2, '0')}`,
            100,
            102,
            98,
            100,
            1000000,
          ),
        );
        data[20] = createBar('2024-01-21', 100, 101, 89, 90);
        data[21] = createBar('2024-01-22', 90, 98, 89, 96, 1500000);

        const bb: BollingerBand[] = data.map(() => createBB(90, 100, 110));
        // Squeeze: 현재 BB폭이 이전보다 70% 미만
        bb[20] = createBB(92, 100, 108); // 폭 16
        bb[21] = createBB(95, 100, 105); // 폭 10 (< 16 * 0.7 = 11.2)

        // When
        const signals = detectBollingerSignals(data, bb);

        // Then
        const bounceSignal = signals.find((s) => s.index === 21);
        expect(bounceSignal?.metadata?.squeeze).toBe(true);
      });
    });
  });

  describe('consolidateSignals', () => {
    it('minGap 이내 같은 방향 신호는 신뢰도 높은 것만 유지', () => {
      // Given
      const signals: Signal[] = [
        {
          index: 5,
          date: '2024-01-05',
          type: 'two_bar_bullish',
          signal: 'BUY',
          confidence: 70,
          price: 100,
        },
        {
          index: 6,
          date: '2024-01-06',
          type: 'bb_bounce_buy',
          signal: 'BUY',
          confidence: 85,
          price: 101,
        },
        {
          index: 7,
          date: '2024-01-07',
          type: 'w_bottom',
          signal: 'BUY',
          confidence: 75,
          price: 102,
        },
      ];

      // When
      const result = consolidateSignals(signals, 3);

      // Then: 신뢰도 가장 높은 85짜리만 남음
      expect(result.length).toBe(1);
      expect(result[0].confidence).toBe(85);
    });

    it('minGap 이상 떨어진 신호는 모두 유지', () => {
      // Given
      const signals: Signal[] = [
        {
          index: 5,
          date: '2024-01-05',
          type: 'two_bar_bullish',
          signal: 'BUY',
          confidence: 70,
          price: 100,
        },
        {
          index: 10,
          date: '2024-01-10',
          type: 'bb_bounce_buy',
          signal: 'BUY',
          confidence: 85,
          price: 101,
        },
      ];

      // When
      const result = consolidateSignals(signals, 3);

      // Then
      expect(result.length).toBe(2);
    });

    it('다른 방향 신호는 간격 상관없이 유지', () => {
      // Given
      const signals: Signal[] = [
        {
          index: 5,
          date: '2024-01-05',
          type: 'two_bar_bullish',
          signal: 'BUY',
          confidence: 70,
          price: 100,
        },
        {
          index: 6,
          date: '2024-01-06',
          type: 'two_bar_bearish',
          signal: 'SELL',
          confidence: 75,
          price: 99,
        },
      ];

      // When
      const result = consolidateSignals(signals, 3);

      // Then
      expect(result.length).toBe(2);
    });
  });
});
