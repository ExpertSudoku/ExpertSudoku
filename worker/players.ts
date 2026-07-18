import { getDb } from './db';
import { players } from '../db/schema';

export type DiscordUserProfile = {
    id: string;
    username: string;
    globalName: string | null;
    avatar: string | null;
};

export async function upsertPlayer(env: Env, profile: DiscordUserProfile): Promise<void> {
    const db = getDb(env);
    const now = new Date();
    await db
        .insert(players)
        .values({
            id: profile.id,
            username: profile.username,
            globalName: profile.globalName,
            avatar: profile.avatar,
            updatedAt: now,
        })
        .onConflictDoUpdate({
            target: players.id,
            set: {
                username: profile.username,
                globalName: profile.globalName,
                avatar: profile.avatar,
                updatedAt: now,
            },
        });
}
