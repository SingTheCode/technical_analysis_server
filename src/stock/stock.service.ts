import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import {
  OHLCVBar,
  TimeFrame,
  PERIOD_BY_TIMEFRAME,
  INTERVAL_BY_TIMEFRAME,
} from './types/ohlcv.entity';
import { YahooChartResponse } from './types/yahoo-response';

const YAHOO_API_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';

@Injectable()
export class StockService {
  async getOHLCV(
    ticker: string,
    timeFrame: TimeFrame,
  ): Promise<{ ticker: string; timeFrame: TimeFrame; data: OHLCVBar[] }> {
    const period = PERIOD_BY_TIMEFRAME[timeFrame];
    const interval = INTERVAL_BY_TIMEFRAME[timeFrame];

    const url = `${YAHOO_API_BASE}/${ticker}?range=${period}&interval=${interval}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    if (!response.ok) {
      throw new HttpException(
        `종목 데이터를 불러올 수 없습니다: ${ticker}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const json: YahooChartResponse = await response.json();

    if (json.chart.error) {
      throw new HttpException(
        json.chart.error.description,
        HttpStatus.BAD_REQUEST,
      );
    }

    const data = this.transformResponse(json);

    return { ticker, timeFrame, data };
  }

  private transformResponse(response: YahooChartResponse): OHLCVBar[] {
    const result = response.chart.result?.[0];
    if (!result) return [];

    const { timestamp, indicators } = result;
    const quote = indicators.quote?.[0];
    if (!quote) return [];

    return timestamp
      .map((ts, i) => ({
        date: new Date(ts * 1000).toISOString().split('T')[0],
        open: quote.open?.[i] ?? 0,
        high: quote.high?.[i] ?? 0,
        low: quote.low?.[i] ?? 0,
        close: quote.close?.[i] ?? 0,
        volume: quote.volume?.[i] ?? 0,
      }))
      .filter((bar) => bar.open > 0);
  }
}
