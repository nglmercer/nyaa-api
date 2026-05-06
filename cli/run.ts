#!/usr/bin/env bun

import { config } from 'dotenv';
import { Command } from 'commander';
import AnimeNyAAgent from './agent.js';
import * as download from './download.js';
import * as auto from './auto.js';
import { ConversationalAgent, createUser } from './conversation.js';
import { loadUsers } from './user.js';

config();

const program = new Command();

program
    .name('nyaa-agent')
    .description(
        'Nyaa Anime Agent - Find and download torrents for airing anime',
    )
    .version('1.0.0');

program
    .command('schedule')
    .description('Show airing anime schedule')
    .option('-j, --json', 'Output as JSON')
    .action(async options => {
        const agent = new AnimeNyAAgent();
        const startTime = Date.now();

        const schedule = await agent.getAiringSchedule();

        if (options.json) {
            console.log(JSON.stringify(schedule, null, 2));
        } else {
            console.log(AnimeNyAAgent.getConfigSafe());
            console.log('');

            console.log(
                'Title               | Ep   | Format   | Airs Date     ',
            );
            console.log(
                '--------------------+------+----------+--------------',
            );

            for (const a of schedule) {
                const title = a.romajiTitle.slice(0, 18).padEnd(18);
                const ep = (a.nextEpisode || '-').toString().padStart(4);
                const format = a.format.padEnd(8);
                const date =
                    a.airingAt > 0
                        ? new Date(a.airingAt * 1000).toLocaleDateString()
                        : 'TBA';
                console.log(`${title} | ${ep} | ${format} | ${date}`);
            }

            console.log(`Total: ${schedule.length} anime`);
        }

        console.log(`  ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
    });

program
    .command('today')
    .description("Today's airing anime")
    .option('-j, --json', 'Output as JSON')
    .action(async options => {
        const startTime = Date.now();

        const todaysAnime = await auto.getTodaysAnime();

        if (options.json) {
            console.log(JSON.stringify(todaysAnime, null, 2));
        } else {
            console.log(AnimeNyAAgent.getConfigSafe());
            console.log(`\n📅 Today's anime: ${todaysAnime.length}\n`);

            for (const a of todaysAnime) {
                const title = a.romajiTitle.slice(0, 20).padEnd(20);
                const ep = (a.nextEpisode || '-').toString().padStart(4);
                const time =
                    a.airingAt > 0
                        ? new Date(a.airingAt * 1000).toLocaleTimeString()
                        : 'TBA';
                console.log(`  ${title} | Ep${ep} | ${time}`);
            }
        }

        console.log(`  ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
    });

program
    .command('search')
    .description('Search for torrents (basic)')
    .option('-n, --number <num>', 'Number of results', '10')
    .option('-j, --json', 'Output as JSON')
    .action(async options => {
        const agent = new AnimeNyAAgent();
        const startTime = Date.now();

        const result = await agent.findMissingTorrents(
            false,
            parseInt(options.number),
        );

        if (options.json) {
            console.log(JSON.stringify(result, null, 2));
        } else {
            console.log(AnimeNyAAgent.getConfigSafe());
            console.log('');

            console.log('Anime               | Ep   | Seeders | Size      ');
            console.log('--------------------+------+---------+----------');

            for (const m of result.matched) {
                const title = m.animeTitle.slice(0, 18).padEnd(18);
                const episode = (m.episode || '-').toString().padStart(4);
                const seeders = m.seeders.toString().padStart(7);
                const size = m.size.padEnd(10);
                console.log(`${title} | ${episode} | ${seeders} | ${size}`);
            }

            console.log(
                `${result.matched.length} matched | ${result.missing.length} missing`,
            );
        }

        console.log(`  ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
    });

program
    .command('ai')
    .description('Search with AI assistance')
    .option('-n, --number <num>', 'Number of results', '10')
    .option('-j, --json', 'Output as JSON')
    .action(async options => {
        const agent = new AnimeNyAAgent();
        const startTime = Date.now();

        const result = await agent.findMissingTorrents(
            true,
            parseInt(options.number),
        );

        if (options.json) {
            console.log(JSON.stringify(result, null, 2));
        } else {
            console.log(AnimeNyAAgent.getConfigSafe());
            console.log('');

            console.log('Anime               | Ep   | Seeders | Size      ');
            console.log('--------------------+------+---------+----------');

            for (const m of result.matched) {
                const title = m.animeTitle.slice(0, 18).padEnd(18);
                const episode = (m.episode || '-').toString().padStart(4);
                const seeders = m.seeders.toString().padStart(7);
                const size = m.size.padEnd(10);
                console.log(`${title} | ${episode} | ${seeders} | ${size}`);
            }

            console.log(
                `${result.matched.length} matched | ${result.missing.length} missing`,
            );
        }

        console.log(`  ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
    });

program
    .command('download')
    .description('Download matched torrents')
    .option('-n, --number <num>', 'Number of downloads', '5')
    .action(async options => {
        const agent = new AnimeNyAAgent();
        const startTime = Date.now();

        console.log(AnimeNyAAgent.getConfigSafe());
        console.log(`\n⬇️  Initializing download session...`);

        await download.initSession();
        console.log(`📁 Download path: ${download.getDownloadPath()}\n`);

        const result = await agent.findMissingTorrents(
            false,
            parseInt(options.number),
        );

        console.log(`⬇️  Downloading ${result.matched.length} torrents...\n`);

        const activeDownloads = [];
        for (const m of result.matched) {
            const dl = await download.downloadTorrent(m.animeTitle, m);
            if (dl) activeDownloads.push(dl);
        }

        console.log('Active Downloads:');
        console.log('ID   | Anime              | Status    ');
        console.log('-----+--------------------+-----------');

        for (const dl of activeDownloads) {
            const title = dl.animeTitle.slice(0, 18).padEnd(18);
            const status = dl.stats?.finished ? 'Done' : 'Downloading';
            console.log(
                `${dl.id.toString().padStart(4)} | ${title} | ${status}`,
            );
        }

        console.log(`Started: ${activeDownloads.length} downloads`);
    });

program
    .command('downloads')
    .description('Show active downloads')
    .option('-j, --json', 'Output as JSON')
    .action(async options => {
        const active = await download.getAllDownloadStats();

        if (options.json) {
            console.log(JSON.stringify(active, null, 2));
        } else {
            console.log('ID   | Anime              | Progress   | Speed     ');
            console.log('-----+--------------------+-----------+------------');

            for (const dl of active) {
                const title = dl.animeTitle.slice(0, 18).padEnd(18);
                const progress = dl.stats
                    ? `${((dl.stats.downloadedBytes / dl.stats.totalBytes) * 100).toFixed(1)}%`
                    : '0%';
                const speed = dl.stats
                    ? `${dl.stats.downloadSpeed.toFixed(2)} MiB/s`
                    : '-';
                console.log(
                    `${dl.id.toString().padStart(4)} | ${title} | ${progress.padStart(9)} | ${speed}`,
                );
            }

            console.log(`Active: ${active.length} downloads`);
        }
    });

program
    .command('auto')
    .description("Auto-download today's anime")
    .option('-n, --number <num>', 'Max downloads per run', '10')
    .option('-i, --interval <hours>', 'Hours between runs', '24')
    .action(async options => {
        await auto.runAutoDownload({
            maxPerDay: parseInt(options.number),
            intervalHours: parseInt(options.interval),
        });
    });

program
    .command('chat')
    .description('Conversational AI mode for anime downloads')
    .option('-u, --user <name>', 'User name (creates if not exists)')
    .option('-m, --message <text>', 'Send a single message (non-interactive)')
    .action(async options => {
        let user;
        const users = await loadUsers();

        if (options.user) {
            user = users.find(u => u.name === options.user);
            if (!user) {
                user = await createUser(options.user);
                console.log(`Created new user: ${options.user}`);
            }
        } else if (users.length > 0) {
            user = users[0];
        } else {
            user = await createUser('Default User');
            console.log('Created default user');
        }

        const agent = new ConversationalAgent(user);

        if (options.message) {
            const response = await agent.chat(options.message);
            console.log(response);
            return;
        }

        console.log(`\n🤖 Chat mode started for ${user.name}`);
        console.log('Examples:');
        console.log('  - "download all episodes of Attack on Titan season 3"');
        console.log('  - "find torrents for One Piece episodes 100-200"');
        console.log('  - "show my preferences"');
        console.log('  - "set quality to 1080p"');
        console.log('Type "exit" to quit\n');

        const readline = await import('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        const askQuestion = () => {
            rl.question('You: ', async input => {
                if (input.toLowerCase() === 'exit') {
                    rl.close();
                    return;
                }

                const response = await agent.chat(input);
                console.log(`AI: ${response}\n`);
                askQuestion();
            });
        };

        askQuestion();
    });

program
    .command('users')
    .description('Manage users')
    .option('-l, --list', 'List all users')
    .option('-a, --add <name>', 'Add a new user')
    .action(async options => {
        if (options.list) {
            const users = await loadUsers();
            console.log('Users:');
            users.forEach(u => console.log(`  - ${u.name} (${u.id})`));
        }
        if (options.add) {
            const user = await createUser(options.add);
            console.log(`Created user: ${user.name} (${user.id})`);
        }
    });

program.parse();
