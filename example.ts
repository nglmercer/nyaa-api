import Nyaa from './src';

async function main() {
    const nyaa = new Nyaa({
        baseUrl: 'https://nyaa.si',
        mode: 'html',
    });

    console.log('Search for torrents:');
    const result = await nyaa.search('One Piece', {
        page: 1,
        category: 'anime',
        filter: 'no filter',
        sort: 'date',
        order: 'desc',
    });

    console.log(`Found ${result.total} torrents (page ${result.page}/${result.totalPage})`);
    console.log(`Time taken: ${result.timeTaken}ms\n`);

    for (const torrent of result.data.slice(0, 3)) {
        console.log(`- ${torrent.name}`);
        console.log(`  Size: ${torrent.size} | Seeders: ${torrent.seeders} | Leechers: ${torrent.leechers}`);
        console.log(`  View URL: https://nyaa.si${torrent.viewUrl}`);
        console.log(`  Torrent URL: https://nyaa.si${torrent.torrentUrl}`);
        console.log(`  Comments: ${torrent.comments}\n`);
    }

    console.log('Search by user:');
    const userResult = await nyaa.searchByUser('Fan-Kai', {
        query: 'One Piece',
        category: 'anime',
    });

    console.log(`Found ${userResult.length} torrents from Fan-Kai`);
    if (userResult.length > 0) {
        console.log(`First result: ${userResult[0].name}`);
    }

    console.log('\nUsing RSS mode:');
    const rssNyaa = new Nyaa({
        baseUrl: 'https://nyaa.land',
        mode: 'rss',
    });

    const rssResult = await rssNyaa.search('Anime');
    console.log(`RSS mode returned ${rssResult.data.length} torrents`);
}

main();
