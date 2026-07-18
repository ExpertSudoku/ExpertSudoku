import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { getDb } from './db';
import { players, progress, pendingLaunches } from '../db/schema';
import { requireSession, SessionVariables } from './session';

export const meRoutes = new Hono<{ Bindings: Env; Variables: SessionVariables }>();

meRoutes.use('*', requireSession);

// DELETE /api/me - self-service data deletion. The session token proves the
// caller owns the Discord account (it is only ever minted after a real
// OAuth exchange), so no manual identity verification is needed - this is
// the mechanism the privacy policy points at. Removes the player row and
// everything referencing it. Already-posted channel messages (live boards,
// streak announcements) are Discord messages and remain; a new player row
// is created automatically if the user ever signs in again.
meRoutes.delete('/', async (context) => {
    const session = context.get('session');
    const db = getDb(context.env);

    // Order matters: progress has a foreign key on players.
    await db.delete(progress).where(eq(progress.playerId, session.sub));
    await db.delete(pendingLaunches).where(eq(pendingLaunches.userId, session.sub));
    await db.delete(players).where(eq(players.id, session.sub));

    return context.json({ ok: true, deleted: session.sub });
});
