import * as cheerio from 'cheerio';
import { Torrent } from '../types';

export const parseTorrentRow = ($: cheerio.CheerioAPI, elem: cheerio.Element): Torrent | null => {
    const $row = $(elem);

    const idLink = $row.find('td:nth-child(2) > a').attr('href');
    const id = idLink?.replace('/view/', '');
    if (!id) return null;

    const name = $row.find('td:nth-child(2) > a').text().trim();
    const magnet = $row.find('td:nth-child(3) a:nth-child(2)').attr('href') || '';
    const size = $row.find('td:nth-child(4)').text().trim();
    const categoryAnchor = $row.find('td:nth-child(1) > a');
    const category = categoryAnchor.attr('title') || '';
    const categoryIcon = categoryAnchor.find('img').attr('src') || '';
    const timestamp = parseInt($row.find('td:nth-child(5)').attr('data-timestamp') || '0') * 1000;
    const date = new Date(timestamp);
    const seeders = parseInt($row.find('td:nth-child(6)').text().trim()) || 0;
    const leechers = parseInt($row.find('td:nth-child(7)').text().trim()) || 0;
    const downloads = parseInt($row.find('td:nth-child(8)').text().trim()) || 0;

    return {
        id: parseInt(id),
        name,
        magnet,
        size,
        category,
        date,
        seeders,
        leechers,
        downloads,
    };
};

export const parseSearchResults = (html: string): Torrent[] => {
    const $ = cheerio.load(html);
    const torrents: Torrent[] = [];

    $('tr.default').each((_, elem) => {
        const torrent = parseTorrentRow($, elem);
        if (torrent) torrents.push(torrent);
    });

    return torrents;
};

export const parseSearchResultsRss = (xml: string): Torrent[] => {
    const $ = cheerio.load(xml, { xmlMode: true });
    const torrents: Torrent[] = [];

    $('item').each((_, elem) => {
        const el = $(elem);
        const id = el.find('guid').text().replace(/.*\//, '');
        const name = el.find('title').text().trim();
        const date = new Date(el.find('pubDate').text().trim());
        const hash = el.find('nyaa\\:infoHash').text().trim();
        const category = el.find('nyaa\\:category').text().trim();
        const size = el.find('nyaa\\:size').text().trim();

        if (id) {
            torrents.push({
                id: parseInt(id),
                name,
                date,
                magnet: `magnet:?xt=urn:btih:${hash}&dn=${encodeURIComponent(name)}`,
                category,
                size,
                seeders: parseInt(el.find('nyaa\\:seeders').text().trim()) || 0,
                leechers: parseInt(el.find('nyaa\\:leechers').text().trim()) || 0,
                downloads: parseInt(el.find('nyaa\\:downloads').text().trim()) || 0,
            });
        }
    });

    return torrents;
};

export const parsePagination = (html: string) => {
    const $ = cheerio.load(html);

    const lastPageEl = $('.pagination > li:nth-last-child(2)');
    const totalPage = parseInt(lastPageEl.text().replace(',', '').trim()) || null;

    const pageInfo = $('.pagination-page-info').text().trim();
    let total: number | null = null;
    let range: string | null = null;

    if (pageInfo) {
        const resultsMatch = pageInfo.match(/(\d+)\s+results/);
        if (resultsMatch) {
            total = parseInt(resultsMatch[1]);
        }
        const rangeMatch = pageInfo.match(/(\d+)\s*-\s*(\d+)/);
        if (rangeMatch) {
            range = `${rangeMatch[1]}-${rangeMatch[2]}`;
        }
    }

    const nextPage = $('.pagination > li:last-child > a').attr('href') !== undefined;

    return {
        total,
        totalPage,
        range,
        nextPage,
    };
};