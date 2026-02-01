import { IsArray, IsNumber, IsIn, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class OHLCVBarDto {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export class ChandelierRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OHLCVBarDto)
  data: OHLCVBarDto[];

  @IsIn(['BUY', 'SELL'])
  position: 'BUY' | 'SELL';

  @IsNumber()
  atrPeriod: number;

  @IsNumber()
  multiplier: number;
}
