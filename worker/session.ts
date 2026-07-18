import { sign, verify } from 'hono/jwt';
import { createMiddleware } from 'hono/factory';

// The session JWT carries just enough to authorize later API calls without
// hitting Discord again: who's playing, and which channel/guild their
// progress should be attributed to (used to scope live messages/streaks).
export type SessionClaims = {
    sub: string; // Discord user id (snowflake)
    chan: string; // channelId
    guild: string | null; // guildId, null in DMs
};

type SessionJwtPayload = SessionClaims & {
    iat: number;
    exp: number;
};

const SESSION_TTL_SECONDS = 24 * 60 * 60; // 24h

export async function mintSession(env: Env, claims: SessionClaims): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const payload: SessionJwtPayload = {
        ...claims,
        iat: now,
        exp: now + SESSION_TTL_SECONDS,
    };
    return sign(payload, env.SESSION_SECRET, 'HS256');
}

export type SessionVariables = {
    session: SessionClaims;
};

// Hono middleware: expects `Authorization: Bearer <session jwt>`, verifies it
// against SESSION_SECRET, and stashes the claims on the context as `session`.
// Responds 401 for anything else (missing header, bad signature, expired).
export const requireSession = createMiddleware<{ Bindings: Env; Variables: SessionVariables }>(
    async (context, next) => {
        const authHeader = context.req.header('Authorization') || '';
        const match = authHeader.match(/^Bearer\s+(.+)$/);
        if (!match) {
            return context.json({ error: 'unauthorized' }, 401);
        }
        try {
            // hono >= 4.12 requires the algorithm to be passed explicitly -
            // without it, verify() throws JwtAlgorithmRequired and every
            // session would be rejected as unauthorized.
            const payload = (await verify(match[1], context.env.SESSION_SECRET, 'HS256')) as unknown as SessionJwtPayload;
            context.set('session', {
                sub: payload.sub,
                chan: payload.chan,
                guild: payload.guild,
            });
        } catch {
            return context.json({ error: 'unauthorized' }, 401);
        }
        await next();
    }
);
