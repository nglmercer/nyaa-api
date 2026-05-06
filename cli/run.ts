#!/usr/bin/env bun

import { config } from 'dotenv';
import { Command } from 'commander';
import AnimeNyAAgent from './agent.js';

config();

const program = new Command();

program
    .name('nyaa-agent')
    .description('Nyaa Anime Agent - Find torrents for airing anime')
    .version('1.0.0');

program
    .command('schedule')
    .description('Show airing anime schedule')
    .option('-j, --json', 'Output as JSON')
    .action(async (options) => {
        const agent = new AnimeNyAAgent();
        const startTime = Date.now();
        
        const schedule = await agent.getAiringSchedule();
        
        if (options.json) {
            console.log(JSON.stringify(schedule, null, 2));
        } else {
            console.log(AnimeNyAAgent.getConfigSafe());
            console.log('');
            
            console.log('Title               | Ep   | Format   | Airs Date     ');
            console.log('--------------------+------+----------+--------------');
            
            for (const a of schedule) {
                const title = a.romajiTitle.slice(0, 18).padEnd(18);
                const ep = (a.nextEpisode || '-').toString().padStart(4);
                const format = a.format.padEnd(8);
                const date = a.airingAt > 0 
                    ? new Date(a.airingAt * 1000).toLocaleDateString() 
                    : 'TBA';
                console.log(`${title} | ${ep} | ${format} | ${date}`);
            }
            
            console.log(`\n📊 Total: ${schedule.length} anime`);
        }
        
        console.log(`\n⏱️  ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
    });

program
    .command('search')
    .description('Search for torrents (basic)')
    .option('-n, --number <num>', 'Number of results', '10')
    .option('-j, --json', 'Output as JSON')
    .action(async (options) => {
        const agent = new AnimeNyAAgent();
        const startTime = Date.now();
        
        const result = await agent.findMissingTorrents(false, parseInt(options.number));
        
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
            
            console.log(`\n📊 ${result.matched.length} matched | ${result.missing.length} missing`);
        }
        
        console.log(`\n⏱️  ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
    });

program
    .command('ai')
    .description('Search with AI assistance')
    .option('-n, --number <num>', 'Number of results', '10')
    .option('-j, --json', 'Output as JSON')
    .action(async (options) => {
        const agent = new AnimeNyAAgent();
        const startTime = Date.now();
        
        const result = await agent.findMissingTorrents(true, parseInt(options.number));
        
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
            
            console.log(`\n📊 ${result.matched.length} matched | ${result.missing.length} missing`);
        }
        
        console.log(`\n⏱️  ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
    });

program
    .command('daemon')
    .description('Run scheduler daemon')
    .option('-h, --hours <num>', 'Hours interval', '1')
    .action(async (options) => {
        const agent = new AnimeNyAAgent();
        
        console.log(AnimeNyAAgent.getConfigSafe());
        console.log(`\n⏰ Scheduler: every ${options.hours}h | Press Ctrl+C to stop\n`);
        
        agent.startScheduler(parseInt(options.hours));
    });

program.parse();