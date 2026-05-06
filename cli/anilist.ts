import type { Config, AnimeSchedule, MediaResponse } from './types.js';

function getCurrentSeason(): { season: string; year: number } {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    
    let season: string;
    if (month >= 0 && month <= 2) {
        season = 'WINTER';
    } else if (month >= 3 && month <= 5) {
        season = 'SPRING';
    } else if (month >= 6 && month <= 8) {
        season = 'SUMMER';
    } else {
        season = 'FALL';
    }
    
    return { season, year };
}

export async function getAiringSchedule(config: Config): Promise<AnimeSchedule[]> {
    const { season, year } = getCurrentSeason();
    
    console.log(`📺 Fetching ${season} ${year} anime...`);
    
    const query = `
        query ($season: MediaSeason, $year: Int) {
            Page(page: 1, perPage: 50) {
                media(season: $season, seasonYear: $year, type: ANIME, format_not: MUSIC, sort: START_DATE) {
                    id
                    title {
                        english
                        romaji
                        native
                    }
                    format
                    episodes
                    status
                    season
                    seasonYear
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
        body: JSON.stringify({ 
            query,
            variables: { season, year }
        }),
    });

    const res = (await response.json()) as MediaResponse;

    if (!res.data?.Page?.media) {
        console.log('⚠️ No data from AniList');
        return [];
    }

    const now = Math.floor(Date.now() / 1000);
    const weekEnd = now + 7 * 86400;

    const animeList = res.data.Page.media
        .filter(m => m.nextAiringEpisode && m.nextAiringEpisode.airingAt >= now && m.nextAiringEpisode.airingAt <= weekEnd)
        .map(node => ({
            id: node.id,
            title: node.title.native || node.title.romaji,
            englishTitle: node.title.english,
            romajiTitle: node.title.romaji,
            format: node.format || 'UNKNOWN',
            episodes: node.episodes,
            season: node.season || season,
            seasonYear: node.seasonYear || year,
            nextEpisode: node.nextAiringEpisode?.episode ?? null,
            airingAt: node.nextAiringEpisode?.airingAt ?? 0,
            coverImage: node.coverImage.large || node.coverImage.medium || '',
        }));

    console.log(`📺 Found ${animeList.length} anime airing this week (${season} ${year})`);
    
    return animeList;
}