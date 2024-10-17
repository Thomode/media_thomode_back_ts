import { BadRequestException, Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { DonghuaService } from './services/donghua.service';
import { Series, SeriesDetails, VideoEpisode } from './interfaces/series.interface';
import { ApiTags } from '@nestjs/swagger';
import { AnimeService } from './services/anime.service';

@Controller('api/series')
@ApiTags("Series")
export class SeriesController {
    @Get(':seriesType/search/:searchName')
    async searchSeries(
        @Param('seriesType') seriesType: string,
        @Param('searchName') searchName: string,
    ): Promise<Series[]> {
        let series: Series[];

        if (seriesType === 'donghua') {
            const donghuaService = new DonghuaService();
            series = await donghuaService.searchSeries(searchName);

        } else if (seriesType === 'anime') {
            const animeService = new AnimeService();
            series = await animeService.searchSeries(searchName);
        } else {
            throw new BadRequestException('Undefined series type');
        }

        return series;
    }

    @Get(':seriesType/:nameId')
    async getSeriesDetails(
        @Param('seriesType') seriesType: string,
        @Param('nameId') nameId: string,
    ): Promise<SeriesDetails> {
        let seriesDetails: SeriesDetails | null;

        if (seriesType === 'donghua') {
            const donghuaService = new DonghuaService();
            seriesDetails = await donghuaService.getSeriesDetails(nameId);

        } else if (seriesType === 'anime') {
            const animeService = new AnimeService();
            seriesDetails = await animeService.getSeriesDetails(nameId);

        } else {
            throw new BadRequestException('Undefined series type');
        }

        if (!seriesDetails) {
            throw new NotFoundException(`Series not found: ${nameId}`);
        }

        return seriesDetails;
    }

    @Get(':seriesType/:nameId/:episodeId')
    async getVideoServers(
        @Param('seriesType') seriesType: string,
        @Param('nameId') nameId: string,
        @Param('episodeId') episodeId: string
    ): Promise<VideoEpisode[]> {
        let servers: VideoEpisode[] | null;

        if (seriesType === 'donghua') {
            const donghuaService = new DonghuaService();
            servers = await donghuaService.getVideoServers(nameId, Number(episodeId));

        } else if (seriesType === 'anime') {
            const animeService = new AnimeService();
            servers = await animeService.getVideoServers(nameId, Number(episodeId));

        } else {
            throw new BadRequestException('Undefined series type');
        }

        if (!servers) {
            throw new NotFoundException(`Series not found: ${nameId}`);
        }

        return servers;
    }
}
