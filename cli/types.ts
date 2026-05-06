export interface Config {
    nyAAgent: {
        model: string;
        providerUrl: string;
        anilistUrl: string;
        nyAAgentUrl: string;
    };
    ai: {
        apiKey: string;
    };
}

export interface AnimeSchedule {
    id: number;
    title: string;
    englishTitle: string | null;
    romajiTitle: string;
    format: string;
    episodes: number | null;
    season?: string;
    seasonYear?: number;
    nextEpisode: number | null;
    airingAt: number;
    coverImage: string;
}

export interface TorrentMatch {
    animeId: number;
    animeTitle: string;
    episode: number | null;
    nyaaId: number;
    nyaaTitle: string;
    nyaaURL: string;
    downloadURL: string;
    size: string;
    seeders: number;
    leechers: number;
    date: string;
}

export interface SearchResult {
    scheduled: AnimeSchedule[];
    matched: TorrentMatch[];
    missing: AnimeSchedule[];
}

export interface MediaItem {
    id: number;
    title: {
        english: string | null;
        romaji: string;
        native: string | null;
    };
    format: string | null;
    episodes: number | null;
    coverImage: {
        large: string | null;
        medium: string | null;
    };
    nextAiringEpisode: {
        episode: number;
        airingAt: number;
    } | null;
}

export interface MediaResponse {
    data: {
        Page: {
            media: MediaItem[];
        };
    };
}

export interface SearchOptions {
    category?: string;
    filter?: string;
    sort?: string;
    order?: string;
}

export interface ActiveDownload {
    id: number;
    animeTitle: string;
    matched: TorrentMatch;
    stats: {
        name: string;
        finished: boolean;
        totalBytes: number;
        downloadedBytes: number;
        uploadedBytes: number;
        downloadSpeed: number;
        uploadSpeed: number;
    } | null;
    started: number;
}