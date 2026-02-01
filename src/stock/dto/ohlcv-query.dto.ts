import { IsIn, IsOptional } from 'class-validator';

export class OhlcvQueryDto {
  @IsOptional()
  @IsIn(['daily', 'weekly'])
  timeFrame?: 'daily' | 'weekly' = 'daily';
}
