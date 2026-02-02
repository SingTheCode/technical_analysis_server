import { Controller, Post, Body } from '@nestjs/common';
import { AnalysisService } from './analysis.service';
import { AnalysisRequestDto } from './dto/analysis-request.dto';
import { ChandelierRequestDto } from './dto/chandelier-request.dto';

@Controller('analysis')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Post()
  async analyze(@Body() dto: AnalysisRequestDto) {
    return this.analysisService.analyze(dto.ticker, dto.params);
  }

  @Post('chandelier')
  async calculateChandelier(@Body() dto: ChandelierRequestDto) {
    return this.analysisService.calculateChandelier(
      dto.ticker,
      dto.timeFrame,
      dto.position,
      dto.atrPeriod,
      dto.multiplier,
    );
  }
}
