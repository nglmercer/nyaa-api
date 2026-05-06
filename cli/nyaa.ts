import { Nyaa } from 'nyaa-sia';
import type { Config, AnimeSchedule, TorrentMatch } from './types.js';

export async function searchTorrentForAnime(
    title: string,
    episode: number | null,
    config: Config,
): Promise<TorrentMatch | null> {
    const episodeStr = episode !== null ? ` Episode ${episode}` : '';
    const searchQueries = [`${title}${episodeStr}`, title];

    const nyaa = new Nyaa({
        baseUrl: config.nyAAgent.nyAAgentUrl,
        mode: 'html',
    });

    for (const searchQuery of searchQueries) {
        try {
            const result = await nyaa.search(searchQuery, {
                category: 'anime',
                filter: 'no filter',
                sort: 'date',
                order: 'desc',
            });

            if (result.data.length === 0) continue;

            const torrent = result.data[0];
            return {
                animeId: 0,
                animeTitle: title,
                episode: episode,
                nyaaId: torrent.id,
                nyaaTitle: torrent.name,
                nyaaURL: torrent.viewUrl || '',
                downloadURL: torrent.torrentUrl || '',
                size: torrent.size,
                seeders: torrent.seeders,
                leechers: torrent.leechers,
                date: torrent.date?.toISOString() || '',
            };
        } catch {
            continue;
        }
    }

    return null;
}
