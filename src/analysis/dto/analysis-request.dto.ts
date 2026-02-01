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

class AnalysisParamsDto {
  @IsNumber()
  bbPeriod: number;

  @IsNumber()
  bbStdMult: number;

  @IsNumber()
  atrPeriod: number;

  @IsNumber()
  chandelierMult: number;

  @IsIn(['daily', 'weekly'])
  timeFrame: 'daily' | 'weekly';
}

export class AnalysisRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OHLCVBarDto)
  data: OHLCVBarDto[];

  @ValidateNested()
  @Type(() => AnalysisParamsDto)
  params: AnalysisParamsDto;
}
