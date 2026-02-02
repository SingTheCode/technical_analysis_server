import { IsString, IsNumber, IsIn } from 'class-validator';

export class ChandelierRequestDto {
  @IsString()
  ticker: string;

  @IsIn(['daily', 'weekly'])
  timeFrame: 'daily' | 'weekly';

  @IsNumber()
  atrPeriod: number;

  @IsNumber()
  multiplier: number;
}
