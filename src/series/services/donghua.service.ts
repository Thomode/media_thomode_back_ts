import { Injectable, Logger } from "@nestjs/common";
import { Episode, Series, SeriesDetails, SeriesService, VideoEpisode } from "../interfaces/series.interface";
import * as puppeteer from "puppeteer";
import axios from "axios";
import * as cheerio from "cheerio";
import * as ytdl from 'ytdl-core';


export class DonghuaService implements SeriesService {
    private browser: puppeteer.Browser | null = null;
    private readonly logger = new Logger(DonghuaService.name);
    private readonly baseUrl: string = "https://seriesdonghua.com";

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
            const searchUrl = `${this.baseUrl}/busquedas/${searchName}`;
            const { data } = await axios.get(searchUrl);
            const $ = cheerio.load(data);

            const seriesList: Series[] = [];

            // Recorre cada enlace que contenga la clase 'angled-img'
            $('a.angled-img').each((i, elem) => {
                // Extrae el nombre de la serie
                const name = $(elem).find('h5.sf.fc-dark.f-bold.fs-14').text().trim();

                // Extrae el ID de la serie a partir del enlace
                const href = $(elem).attr('href');

                // Verifica si href tiene un valor válido antes de dividir
                let nameId = href;
                if (href) {
                    const parts = href.split('/');
                    nameId = parts[parts.length - 2] || '';
                }

                // Extrae la URL de la imagen
                const imageUrl = `${this.baseUrl}${$(elem).find('img').attr('src')}`;

                seriesList.push({
                    name,
                    nameId,
                    imageUrl,
                });
            });

            return seriesList;

        } catch (error) {
            this.logger.error(`Error searching series: ${error.message}`);
            return [];
        }
    }

    async getSeriesDetails(nameId: string): Promise<SeriesDetails> {
        try {
            const url = `${this.baseUrl}/${nameId}/`;
            const { data } = await axios.get(url);
            const $ = cheerio.load(data);

            const name = $('div.sf.fc-dark.ls-title-serie').text().trim() || 'Name not available';

            // Ajuste del selector de la sinopsis
            const synopsis = $('div.text-justify.fc-dark p').text().trim() || 'Synopsis not available';

            // Ajuste del selector del estado
            const status = $('div.col-md-6.col-xs-6.align-center.bg-white p span.badge.bg-default')
                .text().trim() || 'Status not available';

            const profileImage = $('div.banner-side-serie').attr('style') || '';
            const profileImageUrl = profileImage
                ? `${this.baseUrl}${profileImage.split("url(")[1]?.slice(0, -1)}`
                : 'Profile image not available';

            const coverImage = $('div.image').attr('style') || '';
            const coverImageUrl = coverImage
                ? `${this.baseUrl}${coverImage.split("url('")[1]?.slice(0, -2)}`
                : 'Cover image not available';

            const episodes: Episode[] = [];
            $('ul.donghua-list a').each((i, elem) => {
                const title = $(elem).find('blockquote.message.sf.fc-dark.f-bold.fs-16').text().trim();
                const episodeUrl = $(elem).attr('href') || '';
                const episodeIdMatch = episodeUrl.match(/-episodio-(\d+)\//);
                const episodeId = episodeIdMatch ? Number(episodeIdMatch[1]) : 0;

                if (episodeId) {
                    episodes.push({
                        title,
                        nameId,
                        episodeId
                    });
                }
            });

            const lastEpisode = episodes.length > 0 ? Number(episodes[0].episodeId) : 0;

            return {
                name,
                nameId,
                synopsis,
                status,
                profileImageUrl,
                coverImageUrl,
                lastEpisode,
                episodes,
            };

        } catch (error) {
            this.logger.error(`Error retrieving series details: ${error.message}`);
            return null;
        }
    }

    async getVideoServers(nameId: string, episodeId: number): Promise<VideoEpisode[]> {
        const videoEpisodes: VideoEpisode[] = [];

        try {
            // Inicializar Puppeteer
            await this.initBrowser();
            const page = await this.browser.newPage();

            // Navegar a la URL del episodio
            const url = `${this.baseUrl}/${nameId}-episodio-${episodeId}/`;
            await page.goto(url, { waitUntil: 'networkidle2' });

            // Obtener el contenido HTML después de la ejecución de JavaScript
            const html = await page.content();

            // Cargar el HTML en Cheerio
            const $ = cheerio.load(html);

            // Buscar scripts que contengan iframes
            const scriptTags = $('script').toArray();

            // Usar expresión regular para encontrar URLs de iframes en el contenido de los scripts
            const iframeRegex = /<iframe\s+src=['"]?(.*?)['"]?\s+width/g;
            scriptTags.forEach(script => {
                const scriptContent = $(script).html();
                if (scriptContent) {
                    let match;
                    // Buscar coincidencias de iframes dentro del script
                    while ((match = iframeRegex.exec(scriptContent)) !== null) {
                        let src = match[1];
                        // Añadir https: si la URL empieza con //
                        if (src.startsWith('//')) {
                            src = `https:${src}`;
                        }
                        // Agregar a videoEpisodes
                        videoEpisodes.push({
                            nameId,
                            episodeId,
                            videoUrl: src,
                            videoDirect: false, // Se asume que es un enlace directo
                            serverName: 'Dynamic Server', // Ajusta esto según la lógica del servidor
                        });
                    }
                }
            });

            // Cerrar el navegador
            await this.closeBrowser();
            
            return videoEpisodes;
        } catch (error) {
            console.error(`Error retrieving video servers: ${error.message}`);
            return [];
        }
    }

    async getDirectLinkFromEmbed(embedUrl: string): Promise<string> {
        try {
            const videoInfo = await ytdl.getInfo(embedUrl);
            
            // Obtener la mejor calidad
            const format = ytdl.chooseFormat(videoInfo.formats, { quality: 'highest' });
    
            return format.url;
        } catch (error) {
            console.error(`Error getting video direct link: ${error.message}`);
            return null;
        }
    }
}
