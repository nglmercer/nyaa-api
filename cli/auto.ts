import { loadConfig } from './config.js';
import { getAiringSchedule } from './anilist.js';
import { searchTorrentForAnime } from './nyaa.js';
import * as download from './download.js';
import type { AnimeSchedule, TorrentMatch } from './types.js';

interface CachedSchedule {
    anime: AnimeSchedule[];
    lastUpdated: number;
    nextAirDate: number;
}

let scheduleCache: CachedSchedule | null = null;
const STALE_TIME_MS = 12 * 60 * 60 * 1000;

async function loadScheduleCache(): Promise<CachedSchedule | null> {
    const cachePath = './schedule-cache.json';
    try {
        const { readFile } = await import('fs/promises');
        const content = await readFile(cachePath, 'utf-8');
        return JSON.parse(content) as CachedSchedule;
    } catch {
        return null;
    }
}

async function saveScheduleCache(): Promise<void> {
    if (!scheduleCache) return;
    const cachePath = './schedule-cache.json';
    try {
        const { writeFile } = await import('fs/promises');
        await writeFile(cachePath, JSON.stringify(scheduleCache, null, 2));
    } catch {
        // Ignore
    }
}

export async function getTodaysAnime(): Promise<AnimeSchedule[]> {
    const config = loadConfig();
    const now = Math.floor(Date.now() / 1000);
    const weekEnd = now + 7 * 86400;
    
    const cache = await loadScheduleCache();
    
    if (cache && cache.lastUpdated > now - STALE_TIME_MS && cache.anime.length > 0) {
        console.log(`📋 Using cached schedule (${cache.anime.length} anime)`);
        return cache.anime.filter(a => a.nextEpisode && a.airingAt >= now && a.airingAt <= weekEnd);
    }
    
    console.log('🌐 Fetching fresh schedule from AniList...');
    const schedule = await getAiringSchedule(config);
    const upcoming = schedule.filter(a => a.nextEpisode && a.airingAt >= now && a.airingAt <= weekEnd);
    
    scheduleCache = {
        anime: schedule,
        lastUpdated: now,
        nextAirDate: weekEnd,
    };
    await saveScheduleCache();
    
    console.log(`📅 Found ${upcoming.length} anime airing this week`);
    return upcoming;
}

interface DownloadResult {
    anime: AnimeSchedule;
    matched: TorrentMatch | null;
    download: download.ActiveDownload | null;
    error?: string;
}

export async function processTodaysDownloads(maxResults = 10): Promise<DownloadResult[]> {
    const config = loadConfig();
    await download.initSession();
    
    const todaysAnime = await getTodaysAnime();
    console.log(`\n📅 Today's anime: ${todaysAnime.length}`);
    
    const results: DownloadResult[] = [];
    
    for (const anime of todaysAnime.slice(0, maxResults)) {
        console.log(`\n🔍 ${anime.romajiTitle} (Ep${anime.nextEpisode})`);
        
        const matched = await searchTorrentForAnime(
            anime.englishTitle || anime.romajiTitle,
            anime.nextEpisode,
            config,
        );
        
        if (!matched) {
            console.log(`   ❌ No torrent found`);
            results.push({ anime, matched: null, download: null, error: 'No torrent found' });
            continue;
        }
        
        console.log(`   ✓ Found: ${matched.nyaaTitle}`);
        
        const dl = await download.downloadTorrent(anime.romajiTitle, matched);
        
        if (dl) {
            console.log(`   ⬇️  Started (ID: ${dl.id})`);
            results.push({ anime, matched, download: dl });
        } else {
            console.log(`   ❌ Download failed`);
            results.push({ anime, matched, download: null, error: 'Download failed' });
        }
    }
    
    return results;
}

export async function runAutoDownload(options: {
    maxPerDay?: number;
    intervalHours?: number;
}): Promise<void> {
    const maxPerDay = options.maxPerDay ?? 10;
    const intervalHours = options.intervalHours ?? 24;
    
    console.log('🤖 Auto-download agent started');
    console.log(`📅 Max downloads per run: ${maxPerDay}`);
    console.log(`⏰ Interval: ${intervalHours}h\n`);
    
    const run = async (): Promise<void> => {
        const now = new Date().toISOString();
        console.log(`\n═══════════════════════════════════════`);
        console.log(`🤖 ${now}`);
        console.log(`═══════════════════════════════════════`);
        
        try {
            const results = await processTodaysDownloads(maxPerDay);
            
            const success = results.filter(r => r.download).length;
            const failed = results.filter(r => r.error).length;
            
            console.log(`\n📊 Results: ${success} downloaded, ${failed} failed`);
        } catch (e) {
            console.error(`❌ Error: ${e}`);
        }
    };
    
    await run();
    
    setInterval(run, intervalHours * 60 * 60 * 1000);
}