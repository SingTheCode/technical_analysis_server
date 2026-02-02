import { IsString, IsNumber, IsOptional, Min, Max, IsIn } from 'class-validator';

export class BacktestRequestDto {
  @IsString()
  ticker: string;

  @IsOptional()
  @IsIn(['daily', 'weekly'])
  timeFrame?: 'daily' | 'weekly';

  @IsNumber()
  @Min(1000)
  initialCapital: number;

  @IsNumber()
  @Min(0.1)
  @Max(1)
  positionSize: number;

  @IsNumber()
  bbPeriod: number;

  @IsNumber()
  bbStdMult: number;

  @IsNumber()
  atrPeriod: number;

  @IsNumber()
  chandelierMult: number;

  @IsOptional()
  @IsNumber()
  stopLossPercent?: number;

  @IsOptional()
  @IsNumber()
  takeProfitPercent?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  minConfidence?: number;
}
