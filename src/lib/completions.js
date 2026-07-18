// Client-side record of which difficulties the player has completed for the
// CURRENT puzzle day. Only one day is ever stored - the record self-resets
// on the first write for a new day, so there is no growth and no stale
// filtering after the UTC rollover. The day string always comes from the
// server (puzzle/meta API responses); the client never computes dates.

const STORAGE_KEY = 'expertsudoku-completions';

function load() {
    try {
        return JSON.parse(window.localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
        return {};
    }
}

export function recordCompletion(day, difficulty) {
    if (!day || !difficulty) {
        return;
    }
    const stored = load();
    const record = stored.day === day ? stored : { day, difficulties: {} };
    record.difficulties = { ...record.difficulties, [difficulty]: true };
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    } catch {
        // ignore storage errors
    }
}

// -> string[] of completed difficulties for the given (server-provided) day.
export function getCompletedDifficulties(day) {
    const stored = load();
    if (!day || stored.day !== day) {
        return [];
    }
    return Object.keys(stored.difficulties || {}).filter((d) => stored.difficulties[d]);
}
