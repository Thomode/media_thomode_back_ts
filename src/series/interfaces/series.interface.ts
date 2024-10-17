export interface SeriesService{
    searchSeries(searchName: string): Promise<Series[]>;
    getSeriesDetails(nameId: string): Promise<SeriesDetails>;
    getVideoServers(nameId: string, episodeId: number): Promise<VideoEpisode[]>;
}

export interface Series {
    name: string;
    nameId: string;
    imageUrl: string;
}

export interface Episode {
    title: string;
    nameId: string;
    episodeId: number;
}

export interface SeriesDetails {
    name: string;
    nameId: string;
    synopsis: string;
    status: string;
    profileImageUrl: string;
    coverImageUrl: string;
    lastEpisode: number;
    episodes: Episode[];
}

export interface VideoEpisode {
    nameId: string;
    episodeId: number;
    videoUrl: string;
    videoDirect: boolean;
    serverName: string;
}

  

