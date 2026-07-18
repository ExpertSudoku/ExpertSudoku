// Automatic cleanup of expired puzzle-session entries in localStorage.
//
// Every puzzle played leaves a `save-<81 givens>` entry (persistPuzzleState),
// and since puzzles are daily, three new entries appear every day and old
// ones can never become current again. Run once at boot (src/index.tsx),
// this removes any save whose `lastUpdatedTime` is older than MAX_AGE_MS -
// 48h keeps the current day's saves plus a safety margin around the UTC
// rollover - as well as entries that fail to parse.

const SAVE_KEY_RE = /^save-[0-9]{81}$/;
const MAX_AGE_MS = 48 * 60 * 60 * 1000;

export function cleanupExpiredPuzzleSaves(now = Date.now()) {
    const expired = [];
    try {
        for (let i = 0; i < window.localStorage.length; i++) {
            const key = window.localStorage.key(i);
            if (!key || !SAVE_KEY_RE.test(key)) {
                continue;
            }
            let stale = false;
            try {
                const state = JSON.parse(window.localStorage.getItem(key));
                const updated = state && state.lastUpdatedTime;
                stale = typeof updated !== 'number' || now - updated > MAX_AGE_MS;
            } catch {
                stale = true; // unparseable -> junk, delete
            }
            if (stale) {
                expired.push(key);
            }
        }
        expired.forEach((key) => window.localStorage.removeItem(key));
    } catch {
        // storage unavailable (e.g. blocked) - nothing to clean
    }
    return expired.length;
}
