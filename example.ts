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

    console.log('result', result);

    console.log('Search by user:');
    const userResult = await nyaa.searchByUser('Fan-Kai', {
        query: 'One Piece',
        category: 'anime',
    });

    console.log(`userResult`, userResult);

    console.log('\nUsing RSS mode:');
    const rssNyaa = new Nyaa({
        baseUrl: 'https://nyaa.land',
        mode: 'rss',
    });

    const rssResult = await rssNyaa.search('Anime');
    console.log(`rssResult`, rssResult);
}

main();
