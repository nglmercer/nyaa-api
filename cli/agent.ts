import type { Config, AnimeSchedule, TorrentMatch, SearchResult } from './types.js';
import { loadConfig, obfuscateConfig } from './config.js';
import { getAiringSchedule } from './anilist.js';
import { searchTorrentForAnime } from './nyaa.js';
import { searchWithAI } from './ai.js';

export class AnimeNyAAgent {
    static getConfig(): Config {
        return loadConfig();
    }

    static getConfigSafe() {
        return obfuscateConfig(loadConfig());
    }

    async getAiringSchedule(): Promise<AnimeSchedule[]> {
        return getAiringSchedule(loadConfig());
    }

    async findMissingTorrents(
        useAI: boolean = false,
        maxResults: number = 10,
    ): Promise<SearchResult> {
        const config = loadConfig();
        let schedule = await getAiringSchedule(config);
        schedule = schedule.filter(a => a.nextEpisode !== null).slice(0, maxResults * 2);

        const matched: TorrentMatch[] = [];
        const missing: AnimeSchedule[] = [];

        for (const anime of schedule) {
            if (matched.length + missing.length >= maxResults) break;

            const torrent: TorrentMatch | null = useAI
                ? await searchWithAI(anime, config)
                : await searchTorrentForAnime(
                      anime.englishTitle || anime.romajiTitle,
                      anime.nextEpisode,
                      config,
                  );

            if (torrent) {
                matched.push({ ...torrent, animeId: anime.id });
            } else {
                missing.push(anime);
            }
        }

        return { scheduled: schedule, matched, missing };
    }

    startScheduler(intervalHours: number = 1): void {
        const run = async (): Promise<void> => {
            console.log(`[${new Date().toISOString()}] Running scheduler...`);
            try {
                const result = await this.findMissingTorrents();
                console.log(
                    `Found: ${result.matched.length} matched, ${result.missing.length} missing`,
                );
            } catch (e) {
                console.error('Scheduler error:', e);
            }
        };

        run();
        setInterval(run, intervalHours * 60 * 60 * 1000);
    }
}

export default AnimeNyAAgent;