import { generateText } from '@xsai/generate-text';
import type { GenerateTextResult } from '@xsai/generate-text';
import type { Config, AnimeSchedule, TorrentMatch } from './types.js';
import { searchTorrentForAnime } from './nyaa.js';

export async function searchWithAI(
    anime: AnimeSchedule,
    config: Config,
): Promise<TorrentMatch | null> {
    if (!config.ai.apiKey) {
        return searchTorrentForAnime(
            anime.englishTitle || anime.romajiTitle,
            anime.nextEpisode,
            config,
        );
    }

    try {
        const searchTitle = anime.englishTitle || anime.romajiTitle;

        const result: GenerateTextResult = await generateText({
            apiKey: config.ai.apiKey,
            baseURL: config.nyAAgent.providerUrl,
            model: config.nyAAgent.model,
            messages: [
                {
                    role: 'system',
                    content:
                        `You are a torrent search assistant. Given an anime title and episode number, ` +
                        `search nyaa.si and return the best matching torrent ID (numeric only). ` +
                        `If no good match exists, respond with just "NONE".`,
                },
                {
                    role: 'user',
                    content: `Anime: "${searchTitle}" Episode: ${anime.nextEpisode}`,
                },
            ],
        });

        const content = result.text?.trim();

        if (content === 'NONE' || !/^\d+$/.test(content || '')) {
            return searchTorrentForAnime(searchTitle, anime.nextEpisode, config);
        }

        const { Nyaa } = await import('nyaa-sia');
        const nyaa = new Nyaa({ baseUrl: config.nyAAgent.nyAAgentUrl, mode: 'html' });

        const nyaaId = parseInt(content || '', 10);
        const detail = await nyaa.view(nyaaId);

        if (!detail) {
            return searchTorrentForAnime(searchTitle, anime.nextEpisode, config);
        }

        return {
            animeId: anime.id,
            animeTitle: searchTitle,
            episode: anime.nextEpisode,
            nyaaId: detail.id,
            nyaaTitle: detail.name,
            nyaaURL: detail.viewUrl || '',
            downloadURL: detail.torrentUrl || '',
            size: detail.size,
            seeders: detail.seeders,
            leechers: detail.leechers,
            date: detail.date?.toISOString() || '',
        };
    } catch {
        return searchTorrentForAnime(
            anime.englishTitle || anime.romajiTitle,
            anime.nextEpisode,
            config,
        );
    }
}