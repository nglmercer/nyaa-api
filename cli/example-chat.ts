#!/usr/bin/env bun
import { ConversationalAgent } from './conversation.js';
import { createUser } from './user.js';

async function main() {
    // Create a test user
    const user = await createUser('TestUser');

    // Create conversational agent
    const agent = new ConversationalAgent(user);

    // Example conversations
    const examples = [
        'list current airing anime',
        'search for One Piece torrents',
        'set my preference quality to 1080p',
    ];

    console.log('Testing conversational AI...\n');

    for (const example of examples) {
        console.log(`User: ${example}`);
        const response = await agent.chat(example);
        console.log(`AI: ${response}\n`);
    }
}

main().catch(console.error);
