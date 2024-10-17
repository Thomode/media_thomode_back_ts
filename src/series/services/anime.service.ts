import { Injectable, Logger } from "@nestjs/common";
import { Episode, Series, SeriesDetails, SeriesService, VideoEpisode } from "../interfaces/series.interface";
import * as puppeteer from "puppeteer";
import axios from "axios";
import * as cheerio from "cheerio";


export class AnimeService implements SeriesService {
    private browser: puppeteer.Browser | null = null;
    private readonly logger = new Logger(AnimeService.name);
    private readonly baseUrl: string = "https://www3.animeflv.net";

    private async initBrowser(headless = true): Promise<void> {
        if (!this.browser) {
            this.browser = await puppeteer.launch({
                headless: headless,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-extensions',
                    '--disable-application-cache',
                    '--disable-gpu',
                ],
            });
        }
    }

    private async closeBrowser(): Promise<void> {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }

    async searchSeries(searchName: string): Promise<Series[]> {
        try {
            const url = `${this.baseUrl}/browse?q=${encodeURIComponent(searchName)}&page=1`;
            const response = await axios.get(url);
            const html = response.data;
            const $ = cheerio.load(html);

            const seriesList: Series[] = [];

            // Seleccionamos los elementos que contienen los animes
            $('.ListAnimes .Anime').each((i, element) => {
                const name = $(element).find('h3.Title').text().trim();
                const nameId = $(element).find('a').attr('href')?.split('/').pop() ?? '';
                const imageUrl = $(element).find('figure img').attr('src') ?? '';

                seriesList.push({
                    name,
                    nameId,
                    imageUrl,
                });
            });

            return seriesList;
        } catch (error) {
            console.error('Error fetching the series: ', error);
            return [];
        }
    }

    async getSeriesDetails(nameId: string): Promise<SeriesDetails> {
        try {
            const url = `${this.baseUrl}/anime/${nameId}`;

            await this.initBrowser()
            const page = await this.browser.newPage();
            await page.goto(url, { waitUntil: 'networkidle0' });

            // Obtener el contenido de la página una vez que está completamente cargada
            const content = await page.content();


            // Usar Cheerio para hacer scraping del contenido
            const $ = cheerio.load(content);

            const title = $('div.Ficha.fchlt div.Container h1.Title').text();
            const synopsis = $('div.Description p').text().trim();
            const profileImageUrl = $('div.AnimeCover div.Image figure img').attr('src') || '';
            const coverImageUrl = profileImageUrl.replace('covers', 'banners');
            const status = $('p.AnmStts').text();

            // Parsear episodios
            const episodes: Episode[] = [];
            $('ul.ListCaps li').each((_, element) => {
                // Excluir el episodio "PRÓXIMO EPISODIO" que tiene la clase 'Next'
                if ($(element).hasClass('Next')) {
                    return;
                }

                const href = $(element).find('a').attr('href') || '';
                const episodeId = parseInt(href.split('-').pop() || '0', 10);
                const episodeTitle = $(element).find('a h3.Title').text().trim();

                episodes.push({
                    title: `${episodeTitle} - ${episodeId}`,
                    nameId: nameId,
                    episodeId: episodeId,
                });
            });

            const lastEpisode = episodes.length !== 0 ? Number(episodes[0].episodeId) : 0;

            await this.closeBrowser()

            return {
                name: title,
                nameId: nameId,
                synopsis: synopsis,
                status: status,
                profileImageUrl: `https://www3.animeflv.net${profileImageUrl}`,
                coverImageUrl: `https://www3.animeflv.net${coverImageUrl}`,
                lastEpisode: lastEpisode,
                episodes: episodes,
            };
        } catch (error) {
            throw new Error(`Failed to fetch series details: ${error.message}`);
        }
    }


    async getVideoServers(nameId: string, episodeId: number): Promise<VideoEpisode[]> {
        try {
            await this.initBrowser();
            const page = await this.browser.newPage();
            await page.goto(`${this.baseUrl}/ver/${nameId}-${episodeId}`, {
                waitUntil: 'networkidle0', // Esperar a que se cargue la página completamente
            });

            // Obtener el contenido de la página
            const content = await page.content();
            const $ = cheerio.load(content);

            // Extraer el bloque de script que contiene el objeto 'videos'
            const scriptContent = $('script').filter((_, script) => {
                return $(script).html()?.includes('var videos =');
            }).html();

            if (!scriptContent) {
                throw new Error('No se pudo encontrar el script de videos');
            }

            // Extraer la parte de 'videos' del contenido del script
            const videosMatch = scriptContent.match(/var videos = (\{.*?\});/s);
            if (!videosMatch) {
                throw new Error('No se pudo encontrar el objeto videos en el script');
            }

            const videos = JSON.parse(videosMatch[1]);

            // Crear la lista de servidores de video a partir del objeto 'videos'
            const videoEpisodes: VideoEpisode[] = videos.SUB.map((video: any) => ({
                nameId: nameId,
                episodeId: episodeId,
                videoUrl: video.url || video.code, 
                videoDirect: false,           
                serverName: video.title             
            }));

            await this.closeBrowser();

            return videoEpisodes;

        } catch (error) {
            throw new Error(`Failed to fetch video servers: ${error.message}`);
        }
    }

}