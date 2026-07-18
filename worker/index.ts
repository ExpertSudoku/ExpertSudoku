import { Hono } from "hono";
import { RouteBases, OAuth2Routes, Routes } from "discord-api-types/v10";
import {fetchAndRetry} from "./utils";
import {puzzleRoutes} from "./puzzle";
import {progressRoutes} from "./progress";
import {upsertPlayer} from "./players";
import {mintSession} from "./session";
import {runDailyStreaks} from "./streaks";
import {interactionRoutes, consumePendingDifficulty} from "./interactions";
import {meRoutes} from "./me";
const app = new Hono<{ Bindings: Env }>();

app.route('/api/puzzle', puzzleRoutes);
app.route('/api/progress', progressRoutes);
app.route('/api/interactions', interactionRoutes);
app.route('/api/me', meRoutes);

app.post("/api/token", async (context) => {
    const request = await context.req.json() as {
        code: string;
        channelId?: string;
        guildId?: string | null;
    };
    const response = await fetchAndRetry(`${OAuth2Routes.tokenURL}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            client_id: context.env.VITE_CLIENT_ID,
            client_secret: context.env.CLIENT_SECRET,
            grant_type: 'authorization_code',
            code: request.code,
        }),
    });

    if (!response.ok) {
        return context.json({ error: 'discord-auth-failed' }, 401);
    }
    const { access_token } = (await response.json()) as {
        access_token: string;
    };
    if (!access_token) {
        return context.json({ error: 'discord-auth-failed' }, 401);
    }

    // Fetch the Discord profile so we can upsert `players` and mint a
    // session that carries the player id without needing to hit Discord
    // again on every later API call.
    const meResponse = await fetchAndRetry(`${RouteBases.api}${Routes.user('@me')}`, {
        headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!meResponse.ok) {
        return context.json({ error: 'discord-profile-fetch-failed' }, 502);
    }
    const me = (await meResponse.json()) as {
        id: string;
        username: string;
        global_name: string | null;
        avatar: string | null;
    };
    if (!me.id || !me.username) {
        return context.json({ error: 'discord-profile-fetch-failed' }, 502);
    }

    await upsertPlayer(context.env, {
        id: me.id,
        username: me.username,
        globalName: me.global_name ?? null,
        avatar: me.avatar ?? null,
    });

    // channelId/guildId are client-supplied (from the SDK after `ready()`) -
    // trust-on-first-use, they only scope where live progress messages go.
    const session_token = await mintSession(context.env, {
        sub: me.id,
        chan: request.channelId ?? '',
        guild: request.guildId ?? null,
    });

    // If this launch came from a difficulty button on a live message
    // (worker/interactions.ts), hand the recorded choice to the client so
    // it can skip the difficulty picker.
    const preselected_difficulty = await consumePendingDifficulty(
        context.env,
        me.id,
        request.channelId ?? ''
    );

    return context.json({ access_token, session_token, preselected_difficulty });
});

// Dev-only visual check for the live board image (gated - returns 404
// unless DEV_PREVIEW=1 is set, which only ever happens in .dev.vars):
// renders fabricated players/boards with real default avatars so the layout
// can be eyeballed without a bot token or a real channel.
app.get('/api/dev/board-preview', async (context) => {
    if ((context.env as { DEV_PREVIEW?: string }).DEV_PREVIEW !== '1') {
        return context.notFound();
    }
    const { renderBoardPng } = await import('./render/board-image');
    const { fetchAvatarPng } = await import('./render/avatars');

    const playerCount = Math.min(4, Math.max(1, Number(context.req.query('players') ?? 4)));
    const rowCount = Math.min(8, Math.max(playerCount, Number(context.req.query('rows') ?? 6)));
    // Distinct default avatars: index = (id >> 22) % 6.
    const fakeIds = Array.from({ length: rowCount }, (_, i) => String(BigInt(i + 1) << 22n));
    const avatars = await Promise.all(fakeIds.map((id) => fetchAvatarPng(context.env, id, null)));

    const randomCells = (fillRatio: number) =>
        Array.from({ length: 81 }, (_, i) =>
            i % 4 === 0 ? ('given' as const) : Math.random() < fillRatio ? ('filled' as const) : ('empty' as const));

    const boards = avatars.slice(0, playerCount).map((avatarPng, i) => ({
        cells: i === 0 ? Array.from({ length: 81 }, (_, j) => (j % 4 === 0 ? ('given' as const) : ('filled' as const))) : randomCells(0.3 + 0.15 * i),
        avatarPng,
    }));
    const entries = avatars.map((avatarPng, i) => ({
        avatarPng,
        status: i === 0 ? ('done' as const) : i === rowCount - 1 ? ('inactive' as const) : ('active' as const),
        seconds: 754 + i * 211,
    }));

    const png = await renderBoardPng({
        title: { number: 12, difficulty: String(context.req.query('difficulty') ?? 'expert') },
        boards,
        entries,
    });
    return context.body(png as unknown as ArrayBuffer, 200, { 'Content-Type': 'image/png' });
});

// Any path that isn't an API route falls through to the static asset
// handler, which (per wrangler.json's `not_found_handling: "single-page-application"`)
// serves dist/client/index.html for anything that isn't a literal static
// file - this is what lets the hand-rolled client router in
// src/components/site/site-root.tsx handle deep links/reloads on
// /play, /imprint, /privacy, /terms.
//
// EXCEPT under /api/: an unmatched API request (wrong path, or wrong METHOD
// - e.g. opening the POST-only /api/interactions in a browser) must return
// a JSON error, not silently render the index page.
app.notFound((context) => {
    const { pathname } = new URL(context.req.url);
    if (pathname === '/api' || pathname.startsWith('/api/')) {
        return context.json({ error: 'not-found', hint: `no route for ${context.req.method} ${pathname}` }, 404);
    }
    return context.env.ASSETS.fetch(context.req.raw);
});

export default {
    fetch: app.fetch,
    scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
        ctx.waitUntil(runDailyStreaks(env));
    },
} satisfies ExportedHandler<Env>;