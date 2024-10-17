import { Module } from '@nestjs/common';
import { SeriesController } from './series.controller';
import { DonghuaService } from './services/donghua.service';
import { AnimeService } from './services/anime.service';

@Module({
  controllers: [SeriesController],
  providers: [],
})
export class SeriesModule {}
