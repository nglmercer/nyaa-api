import { generateText } from '@xsai/generate-text';
import type {
    Config,
    User,
    ConversationContext,
} from './types.js';
import { loadConfig } from './config.js';
import { getAiringSchedule } from './anilist.js';
import { searchTorrentForAnime } from './nyaa.js';
import { downloadTorrent } from './download.js';
import {
    loadUsers,
    updateUserPreferences,
    createUser as createNewUser,
} from './user.js';

interface AniListMedia {
    id: number;
    title: { english: string | null; romaji: string };
    episodes: number | null;
}

function getMediaTitle(media: AniListMedia): string {
    return media.title.english || media.title.romaji;
}

async function searchAnimeBySeason(
    season: string,
    year: number,
    animeName?: string,
): Promise<AniListMedia[]> {
    const query = `
        query ($season: MediaSeason, $year: Int, $search: String) {
            Page(page: 1, perPage: 50) {
                media(season: $season, seasonYear: $year, type: ANIME, format_not: MUSIC, sort: POPULARITY_DESC, search: $search) {
                    id
                    title { english romaji }
                    episodes
                }
            }
        }
    `;

    const config = loadConfig();
    try {
        const response = await fetch(config.nyAAgent.anilistUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query,
                variables: { season, year, search: animeName },
            }),
        });

        const data = await response.json();
        return data?.data?.Page?.media || [];
    } catch {
        return [];
    }
}

export class ConversationalAgent {
    private context: ConversationContext;
    private config: Config;

    constructor(user: User) {
        this.config = loadConfig();
        this.context = {
            user,
            history: [],
        };
    }

    async chat(userMessage: string): Promise<string> {
        this.context.history.push({ role: 'user', content: userMessage });

        const systemPrompt = `You are a multilingual anime download assistant for nyaa.si torrents.
Parse user requests in ANY language and return ONLY valid JSON:
{
  "intent": "download" | "search" | "list" | "preferences" | "help",
  "animes": ["exact anime title only"],
  "seasons": ["WINTER", "SPRING", "SUMMER", "FALL"],
  "year": 2024,
  "episodes": [1, 2, 3],
  "quality": "1080p",
  "fansub": "subsgroup"
}

CRITICAL RULES:
- "list today/today's anime/current anime" → intent:"list" (NOT search/download)
- "download X" → animes:["X"] ONLY that anime, not related ones
- "search X" → intent:"search" with animes:["X"]
- Return ONLY the JSON object, no markdown or text
- For non-English queries, understand the intent and respond in English JSON

User: ${this.context.user.name}
Preferences: ${JSON.stringify(this.context.user.preferences)}`;

        if (!this.config.ai.apiKey) {
            return 'AI not configured. Set AI_API_KEY in .env file.';
        }

        try {
            const result = await generateText({
                apiKey: this.config.ai.apiKey,
                baseURL: this.config.nyAAgent.providerUrl,
                model: this.config.nyAAgent.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...this.context.history.slice(-6),
                ],
            });

            const content = result.text?.trim() || '';

            let parsed: Record<string, unknown>;
            try {
                parsed = JSON.parse(content);
            } catch {
                return `AI response: ${content.slice(0, 200)}`;
            }

            this.context.lastIntent = parsed;
            const response = await this.executeIntent(parsed);
            this.context.history.push({ role: 'assistant', content: response });

            return response;
        } catch (e) {
            return `Error: ${e}. Try: "download all episodes of [anime]" or "show my preferences"`;
        }
    }

    private async executeIntent(
        intent: Record<string, unknown>,
    ): Promise<string> {
        const intentType = intent.intent as string;

        switch (intentType) {
            case 'download':
                return this.handleDownload(intent);
            case 'search':
                return this.handleSearch(intent);
            case 'list':
                return this.handleList();
            case 'preferences':
                return this.handlePreferences(intent);
            case 'help':
                return `Available commands:
- "download [anime name] season X" - Download anime seasons
- "download [anime] episodes 1-10" - Download episode ranges
- "search [anime name]" - Search for torrents
- "list current anime" - Show airing anime
- "set quality to 1080p" - Set preferences
- "show my preferences" - View your settings`;
            default:
                return 'Available: download anime seasons, search torrents, list anime, set preferences. Type "help" for more info.';
        }
    }

    private async handleDownload(
        intent: Record<string, unknown>,
    ): Promise<string> {
        const animes = (intent.animes as string[]) || [];
        const seasons = (intent.seasons as string[]) || [];
        const year = intent.year as number | undefined;
        const episodes = (intent.episodes as number[]) || [];
        const quality =
            (intent.quality as string) ||
            this.context.user.preferences.preferredQuality;

        if (animes.length === 0 && seasons.length === 0) {
            return 'Please specify anime titles or seasons to download.';
        }

        const results: string[] = [];
        const maxDownloads = 5;

        // Direct anime name downloads (process these FIRST to prioritize user's specific request)
        for (const animeName of animes) {
            if (results.length >= maxDownloads) break;

            // If specific episodes requested, download those; otherwise get latest episode
            const epList = episodes.length > 0 ? episodes.slice(0, 3) : [null];

            for (const ep of epList) {
                if (results.length >= maxDownloads) break;

                const searchQuery = quality
                    ? `${animeName} ${quality}`
                    : animeName;
                const torrent = await searchTorrentForAnime(
                    searchQuery,
                    ep,
                    this.config,
                );

                if (torrent) {
                    await downloadTorrent(animeName, torrent);
                    const epNum = ep || torrent.episode || '?';
                    results.push(`✓ ${animeName} Ep${epNum} - ${torrent.nyaaTitle.slice(0, 50)}`);
                } else {
                    results.push(`✗ ${animeName} - Not found`);
                }
            }
        }

        // If seasons specified, search AniList for anime in those seasons
        if (seasons.length > 0 && year && results.length < maxDownloads) {
            for (const season of seasons) {
                const mediaList = await searchAnimeBySeason(season, year);
                for (const media of mediaList.slice(0, 3)) {
                    const title = getMediaTitle(media);
                    const totalEps = media.episodes || 12;
                    const epList =
                        episodes.length > 0
                            ? episodes
                            : Array.from(
                                  { length: Math.min(totalEps, 2) },
                                  (_, i) => i + 1,
                              );

                    for (const ep of epList) {
                        if (results.length >= maxDownloads) break;
                        const searchQuery = quality
                            ? `${title} ${quality}`
                            : title;
                        const torrent = await searchTorrentForAnime(
                            searchQuery,
                            ep,
                            this.config,
                        );
                        if (torrent) {
                            await downloadTorrent(title, torrent);
                            results.push(`✓ ${title} Ep${ep}`);
                        }
                    }
                }
            }
        }

        return results.length > 0
            ? `Download results:\n${results.join('\n')}`
            : 'No results found. Try different search terms.';
    }

    private async handleSearch(
        intent: Record<string, unknown>,
    ): Promise<string> {
        const animes = (intent.animes as string[]) || [];
        const episodes = (intent.episodes as number[]) || [];
        const maxResults = (intent.maxResults as number) || 10;

        const results: string[] = [];
        for (const title of animes.slice(0, maxResults)) {
            const ep = episodes.length > 0 ? episodes[0] : null;
            const torrent = await searchTorrentForAnime(title, ep, this.config);

            if (torrent) {
                results.push(
                    `${title} Ep${torrent.episode}: ${torrent.nyaaTitle} (${torrent.seeders} seeders)`,
                );
            }
        }

        return results.length > 0
            ? results.join('\n')
            : 'No torrents found. Try different search terms.';
    }

    private async handleList(): Promise<string> {
        const schedule = await getAiringSchedule(this.config);

        if (schedule.length === 0) {
            return 'No anime currently airing.';
        }

        return (
            'Current airing anime:\n' +
            schedule
                .slice(0, 20)
                .map(
                    a =>
                        `${a.romajiTitle} | Ep${a.nextEpisode} | ${a.season} ${a.seasonYear}`,
                )
                .join('\n')
        );
    }

    private async handlePreferences(
        intent: Record<string, unknown>,
    ): Promise<string> {
        const prefs = (intent.preferences as Record<string, unknown>) || {};
        const user = await updateUserPreferences(this.context.user.id, prefs);

        return `Preferences updated: ${JSON.stringify(user?.preferences, null, 2)}`;
    }
}

export async function createUser(name: string): Promise<User> {
    return createNewUser(name);
}
