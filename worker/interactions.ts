import { Hono } from 'hono';
import { InteractionResponseType, InteractionType } from 'discord-api-types/v10';
import { eq, and } from 'drizzle-orm';
import { getDb } from './db';
import { pendingLaunches } from '../db/schema';
// @ts-ignore - plain JS, dependency-free shared module
import { isDifficulty } from '../shared/difficulties.js';

// Discord interactions endpoint (portal: "Interactions Endpoint URL" must
// point at https://<domain>/api/interactions). Handles the difficulty
// buttons on live progress messages: pressing one records the chosen
// difficulty for (user, channel) and responds with LAUNCH_ACTIVITY, so
// Discord opens the activity directly; /api/token then hands the recorded
// difficulty back to the client, which skips the picker.

// Pressing a button only counts for the launch that follows promptly -
// stale rows (user pressed but never launched) are overwritten on the next
// press and ignored by /api/token after this window.
export const PENDING_LAUNCH_TTL_MS = 10 * 60 * 1000;

function hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
}

// Discord signs `timestamp + rawBody` with the app's Ed25519 key; requests
// that don't verify MUST get a 401 (Discord probes with bad signatures
// during endpoint setup and rejects endpoints that accept them).
export async function verifyDiscordSignature(
    publicKeyHex: string,
    signatureHex: string,
    timestamp: string,
    rawBody: string
): Promise<boolean> {
    try {
        const key = await crypto.subtle.importKey(
            'raw',
            hexToBytes(publicKeyHex) as unknown as BufferSource,
            { name: 'Ed25519' },
            false,
            ['verify']
        );
        const data = new TextEncoder().encode(timestamp + rawBody);
        return await crypto.subtle.verify(
            { name: 'Ed25519' },
            key,
            hexToBytes(signatureHex) as unknown as BufferSource,
            data as unknown as BufferSource
        );
    } catch {
        return false;
    }
}

type Interaction = {
    type: number;
    channel_id?: string;
    data?: { custom_id?: string; component_type?: number };
    member?: { user?: { id: string } };
    user?: { id: string };
};

export const interactionRoutes = new Hono<{ Bindings: Env }>();

// Browsers GET this when someone checks the URL by hand - the real endpoint
// is POST-only (Discord sends signed POSTs). Answer with a diagnosable hint
// instead of a 404.
interactionRoutes.get('/', (context) => {
    return context.json({
        error: 'method-not-allowed',
        hint: 'This is the Discord Interactions endpoint - it only accepts signed POST requests from Discord. Configure it in the portal as the Interactions Endpoint URL; DISCORD_PUBLIC_KEY must be set in the deployed worker or every request is rejected with 401.',
    }, 405);
});

interactionRoutes.post('/', async (context) => {
    const signature = context.req.header('X-Signature-Ed25519');
    const timestamp = context.req.header('X-Signature-Timestamp');
    const rawBody = await context.req.text();

    if (
        !signature
        || !timestamp
        || !context.env.DISCORD_PUBLIC_KEY
        || !(await verifyDiscordSignature(context.env.DISCORD_PUBLIC_KEY, signature, timestamp, rawBody))
    ) {
        return context.json({ error: 'invalid-signature' }, 401);
    }

    const interaction = JSON.parse(rawBody) as Interaction;

    if (interaction.type === InteractionType.Ping) {
        return context.json({ type: InteractionResponseType.Pong });
    }

    if (interaction.type === InteractionType.MessageComponent) {
        const customId = interaction.data?.custom_id ?? '';
        const [action, difficulty] = customId.split(':');
        const userId = interaction.member?.user?.id ?? interaction.user?.id;
        const channelId = interaction.channel_id;

        if (action === 'play' && isDifficulty(difficulty) && userId && channelId) {
            const db = getDb(context.env);
            await db
                .insert(pendingLaunches)
                .values({ userId, channelId, difficulty, createdAt: new Date() })
                .onConflictDoUpdate({
                    target: [pendingLaunches.userId, pendingLaunches.channelId],
                    set: { difficulty, createdAt: new Date() },
                });
            return context.json({ type: InteractionResponseType.LaunchActivity });
        }
        // Unknown button - still launch the activity rather than erroring in
        // the client.
        return context.json({ type: InteractionResponseType.LaunchActivity });
    }

    return context.json({ error: 'unsupported-interaction' }, 400);
});

// Called by /api/token: returns (and consumes) a fresh pending difficulty
// for this user+channel, or null.
export async function consumePendingDifficulty(
    env: Env,
    userId: string,
    channelId: string
): Promise<string | null> {
    if (!channelId) {
        return null;
    }
    const db = getDb(env);
    const rows = await db
        .select()
        .from(pendingLaunches)
        .where(and(eq(pendingLaunches.userId, userId), eq(pendingLaunches.channelId, channelId)))
        .limit(1);
    const row = rows[0];
    if (!row) {
        return null;
    }
    await db.delete(pendingLaunches).where(eq(pendingLaunches.id, row.id));
    if (Date.now() - row.createdAt.getTime() > PENDING_LAUNCH_TTL_MS) {
        return null;
    }
    return row.difficulty;
}
