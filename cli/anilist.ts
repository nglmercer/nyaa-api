import type { Config, AnimeSchedule, MediaResponse } from './types.js';

export async function getAiringSchedule(config: Config): Promise<AnimeSchedule[]> {
    const query = `
        {
            Page(page: 1, perPage: 50) {
                media(status: RELEASING, type: ANIME, sort: START_DATE) {
                    id
                    title {
                        english
                        romaji
                        native
                    }
                    format
                    episodes
                    nextAiringEpisode {
                        episode
                        airingAt
                    }
                    coverImage {
                        large
                        medium
                    }
                }
            }
        }
    `;

    const response = await fetch(config.nyAAgent.anilistUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify({ query }),
    });

    const res = (await response.json()) as MediaResponse;

    if (!res.data?.Page?.media) {
        return [];
    }

    const now = Math.floor(Date.now() / 1000);
    const weekEnd = now + 7 * 86400;

    return res.data.Page.media
        .filter(m => m.nextAiringEpisode && m.nextAiringEpisode.airingAt >= now && m.nextAiringEpisode.airingAt <= weekEnd)
        .map(node => ({
            id: node.id,
            title: node.title.native || node.title.romaji,
            englishTitle: node.title.english,
            romajiTitle: node.title.romaji,
            format: node.format || 'UNKNOWN',
            episodes: node.episodes,
            nextEpisode: node.nextAiringEpisode?.episode ?? null,
            airingAt: node.nextAiringEpisode?.airingAt ?? 0,
            coverImage: node.coverImage.large || node.coverImage.medium || '',
        }));
}