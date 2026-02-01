// 일봉 → 주봉 변환

import { OHLCVBar } from '../../stock/types/ohlcv.entity';

export const transformDailyToWeekly = (dailyData: OHLCVBar[]): OHLCVBar[] => {
  if (dailyData.length === 0) return [];

  const weekly: OHLCVBar[] = [];
  let week: OHLCVBar[] = [dailyData[0]];

  for (let i = 1; i < dailyData.length; i++) {
    const date = new Date(dailyData[i].date);

    if (date.getDay() === 1 && week.length > 0) {
      weekly.push(aggregateWeek(week));
      week = [dailyData[i]];
    } else {
      week.push(dailyData[i]);
    }
  }

  if (week.length > 0) {
    weekly.push(aggregateWeek(week));
  }

  return weekly;
};

const aggregateWeek = (weekData: OHLCVBar[]): OHLCVBar => ({
  date: weekData[0].date,
  open: weekData[0].open,
  high: Math.max(...weekData.map((d) => d.high)),
  low: Math.min(...weekData.map((d) => d.low)),
  close: weekData[weekData.length - 1].close,
  volume: weekData.reduce((s, d) => s + d.volume, 0),
});
