import { RqbitSession } from 'rqbit-napi';
import type { TorrentStats } from 'rqbit-napi';
import type { Config, TorrentMatch } from './types.js';

export interface DownloadOptions {
    outputFolder?: string;
    overwrite?: boolean;
}

export interface ActiveDownload {
    id: number;
    animeTitle: string;
    matched: TorrentMatch;
    stats: TorrentStats | null;
    started: number;
}

let session: RqbitSession | null = null;
const downloads: Map<number, ActiveDownload> = new Map();
let downloadPath = './downloads';

async function ensureDir(path: string): Promise<void> {
    try {
        const { mkdir } = await import('fs/promises');
        await mkdir(path, { recursive: true });
    } catch {
        // Directory may already exist
    }
}

export async function initSession(): Promise<void> {
    const { join } = await import('path');
    downloadPath = join(process.cwd(), 'downloads');
    await ensureDir(downloadPath);
    
    session = await RqbitSession.create(downloadPath, {
        listenPort: 6881,
    });
}

export async function getSession(): Promise<RqbitSession> {
    if (!session) {
        await initSession();
    }
    return session!;
}

export function getDownloadPath(): string {
    return downloadPath;
}

export function getActiveDownloads(): ActiveDownload[] {
    return Array.from(downloads.values());
}

export async function downloadTorrent(
    animeTitle: string,
    matched: TorrentMatch,
    options: DownloadOptions = {},
): Promise<ActiveDownload | null> {
    const sess = await getSession();
    
    let url = '';
    
    if (matched.downloadURL && (matched.downloadURL.startsWith('http') || matched.downloadURL.startsWith('magnet:'))) {
        url = matched.downloadURL;
    } else if (matched.nyaaId > 0) {
        url = `https://nyaa.si/download/${matched.nyaaId}.torrent`;
    } else {
        console.log(`  ❌ No valid URL for ${matched.animeTitle}`);
        return null;
    }
    
    console.log(`  ⬇️  ${matched.animeTitle} (Ep${matched.episode})`);
    console.log(`     URL: ${url}`);

    try {
        let id: number;
        
        if (url.startsWith('http')) {
            const response = await fetch(url);
            const buffer = await response.arrayBuffer();
            const nodeBuffer = Buffer.from(buffer);
            id = await sess.addTorrentBuffer(nodeBuffer, {
                outputFolder: options.outputFolder,
                overwrite: options.overwrite ?? true,
            });
        } else {
            id = await sess.addTorrent(url, {
                outputFolder: options.outputFolder,
                overwrite: options.overwrite ?? true,
            });
        }

        const download: ActiveDownload = {
            id,
            animeTitle,
            matched,
            stats: null,
            started: Date.now(),
        };

        downloads.set(id, download);
        console.log(`     ✓ Added (ID: ${id})`);
        return download;
    } catch (e) {
        console.log(`     ❌ ${e}`);
        return null;
    }
}

export async function getTorrentStats(id: number): Promise<TorrentStats | null> {
    if (!session) return null;
    return session.getTorrentStats(id);
}

export async function updateDownloadStats(id: number): Promise<TorrentStats | null> {
    const download = downloads.get(id);
    if (!download) return null;
    
    download.stats = await getTorrentStats(id);
    return download.stats;
}

export async function getAllDownloadStats(): Promise<ActiveDownload[]> {
    const sess = await getSession();
    const ids = sess.listTorrents();
    
    for (const id of ids) {
        const stats = await updateDownloadStats(id);
        if (!stats) continue;
    }
    
    return getActiveDownloads();
}

export async function pauseDownload(id: number): Promise<boolean> {
    if (!session) return false;
    return session.pauseTorrent(id);
}

export async function resumeDownload(id: number): Promise<boolean> {
    if (!session) return false;
    return session.startTorrent(id);
}

export async function deleteDownload(id: number, deleteFiles = false): Promise<boolean> {
    if (!session) return false;
    
    downloads.delete(id);
    return session.deleteTorrent(id, deleteFiles);
}

export async function stopSession(): Promise<void> {
    if (session) {
        await session.stop();
        session = null;
    }
}