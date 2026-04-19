<h1 align="center">Nyaa-si</h1>

This is an unofficial API for nyaa - https://nyaa.si or https://nyaa.land or whatever domain you want to use. This allows you to search for torrents by name, category, or even user. Use at your own risk.

<div align="center">

[![npm](https://img.shields.io/npm/v/nyaa-si?style=flat-square)](https://www.npmjs.com/package/nyaa-si)
[![npm](https://img.shields.io/npm/dt/nyaa-si?style=flat-square)](https://www.npmjs.com/package/nyaa-si)
![NPM](https://img.shields.io/npm/l/nyaa-si)

</div>

## Install

```bash
npm install --save nyaa-si
yarn add nyaa-si
pnpm add nyaa-si
bun add nyaa-si
```

## Usage

```js
import Nyaa from 'nyaa-si';

const nyaa = new Nyaa({
    baseUrl: 'https://nyaa.si',
    mode: 'html',
});

const result = await nyaa.search('One Piece', {
    page: 1,
    category: 'anime',
    filter: 'no filter',
    sort: 'date',
    order: 'desc',
});

console.log(result.data);

// Or run the example:
// bun run example.ts
/**
 * {
 *     data: [{ id: 1234567, name: 'One Piece', ... }],
 *     total: 100,
 *     page: 1,
 *     totalPage: 10,
 *     perPage: 75,
 *     range: '1-75',
 *     nextPage: true,
 *     timeTaken: 150
 * }
 */
```

## API

### `search(query, options)`

Search for torrents.

#### `query`

Type: `string`

The search query.

#### `options`

Type: `object`

The search options.

```jsonc
{
    "page": 1,
    "category": "all", // all, anime, audio, literature, live-action, pictures, software, games
    "filter": "no filter", // no filter, trusted only, no remakes
    "sort": "date", // date, downloads, size, seeders, leechers, comments
    "order": "desc" // desc, asc
}
```

#### Returns

```typescript
interface SearchResult {
    data: Torrent[];
    total: number | null;
    page: number;
    totalPage: number | null;
    perPage: number;
    nextPage: boolean;
    range: string | null;
    timeTaken: number;
}

interface Torrent {
    id: number;
    name: string;
    magnet: string;
    size: string;
    category: string;
    date: Date;
    seeders: number;
    leechers: number;
    downloads: number;
    viewUrl: string;
    torrentUrl: string;
    comments: number;
}
```

### `searchByUser(username, options)`

Search for torrents by user.

#### `username`

Type: `string`

The username.

#### `options`

Type: `object`

The search options.

```jsonc
{
    "page": 1,
    "category": "all", // all, anime, audio, literature, live-action, pictures, software, games
    "filter": "no filter", // no filter, trusted only, no remakes
    "sort": "date", // date, downloads, size, seeders, leechers, comments
    "order": "desc", // desc, asc
    "query": "One Piece" // The search query
}
```

## TODO

-   [x] Add support for sorting by various fields
-   [x] Add support for searching by category
-   [x] Add support for searching by user
-   [ ] Add pagination support - still partial support (only for html and normal query)
-   [ ] Add sukebei support
-   [ ] Write tests for apis - Added partial tests

## License

[MIT ©](/LICENSE)

## Disclaimer

This is an unofficial API for nyaa. I am not affiliated with nyaa in any way. Use at your own risk.

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.
