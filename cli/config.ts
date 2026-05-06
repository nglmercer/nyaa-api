import type { Config } from './types.js';

export function getDefaultConfig(): Config {
    return {
        nyAAgent: {
            model: 'gpt-4o-mini',
            providerUrl: 'https://api.openai.com/v1/',
            anilistUrl: 'https://graphql.anilist.co',
            nyAAgentUrl: 'https://nyaa.si',
        },
        ai: {
            apiKey: '',
        },
    };
}

export function loadConfig(): Config {
    const config = getDefaultConfig();

    if (process.env.AI_MODEL) {
        config.nyAAgent.model = process.env.AI_MODEL;
    }
    if (process.env.AI_PROVIDER_URL) {
        config.nyAAgent.providerUrl = process.env.AI_PROVIDER_URL;
    }
    if (process.env.ANILIST_URL) {
        config.nyAAgent.anilistUrl = process.env.ANILIST_URL;
    }
    if (process.env.NYAA_URL) {
        config.nyAAgent.nyAAgentUrl = process.env.NYAA_URL;
    }
    if (process.env.AI_API_KEY) {
        config.ai.apiKey = process.env.AI_API_KEY;
    }

    return config;
}

export function obfuscateConfig(config: Config) {
    return {
        nyAAgent: { ...config.nyAAgent },
        ai: {
            apiKey: config.ai.apiKey ? `***${config.ai.apiKey.slice(-4)}` : '',
        },
    };
}