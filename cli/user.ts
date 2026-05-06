import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import type { User } from './types.js';

const USER_DB = './users.json';

export async function loadUsers(): Promise<User[]> {
    if (!existsSync(USER_DB)) return [];
    const data = await readFile(USER_DB, 'utf-8');
    return JSON.parse(data) as User[];
}

export async function saveUsers(users: User[]): Promise<void> {
    await writeFile(USER_DB, JSON.stringify(users, null, 2));
}

export async function getUser(userId: string): Promise<User | null> {
    const users = await loadUsers();
    return users.find(u => u.id === userId) || null;
}

export async function createUser(name: string, id?: string): Promise<User> {
    const users = await loadUsers();
    const user: User = {
        id: id || `user_${Date.now()}`,
        name,
        preferences: {},
    };
    users.push(user);
    await saveUsers(users);
    return user;
}

export async function updateUserPreferences(
    userId: string,
    prefs: Partial<User['preferences']>,
): Promise<User | null> {
    const users = await loadUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) return null;

    users[idx].preferences = { ...users[idx].preferences, ...prefs };
    await saveUsers(users);
    return users[idx];
}
