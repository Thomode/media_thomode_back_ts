import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SeriesModule } from './series/series.module';

@Module({
  imports: [SeriesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
