import { IsString, IsNumber, IsIn, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

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
  @IsString()
  ticker: string;

  @ValidateNested()
  @Type(() => AnalysisParamsDto)
  params: AnalysisParamsDto;
}
