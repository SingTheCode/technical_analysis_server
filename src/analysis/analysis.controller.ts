import { Controller, Post, Body } from '@nestjs/common';
import { AnalysisService } from './analysis.service';
import { AnalysisRequestDto } from './dto/analysis-request.dto';
import { ChandelierRequestDto } from './dto/chandelier-request.dto';

@Controller('analysis')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Post()
  analyze(@Body() dto: AnalysisRequestDto) {
    return this.analysisService.analyze(dto.data, dto.params);
  }

  @Post('chandelier')
  calculateChandelier(@Body() dto: ChandelierRequestDto) {
    return this.analysisService.calculateChandelier(
      dto.data,
      dto.position,
      dto.atrPeriod,
      dto.multiplier,
    );
  }
}
