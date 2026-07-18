import { postProgress } from './api.ts';

// Server-progress `stateAdapter` for the Discord path (App calls
// `stateAdapter.save(puzzleState, grid)` from onPuzzleStateChange, in
// addition to the localStorage write it always does). The website passes
// `stateAdapter: null` - it never talks to the server.
//
// Writes are debounced (trailing 2s) to avoid hammering the API on every
// keystroke, except: completion and pause-state changes flush immediately,
// and a tab going hidden flushes immediately too (via a keepalive fetch -
// not sendBeacon, since this needs an Authorization header).
export function createServerAdapter(sessionToken, difficulty) {
    let debounceTimer = null;
    let pending = null;
    let lastPaused; // undefined until the first save

    function buildBody(puzzleState, grid) {
        const currentDigits = grid.get('cells').map(c => c.get('digit')).join('');
        return {
            difficulty,
            state: puzzleState,
            currentDigits,
            elapsedMs: puzzleState.elapsedTime,
            paused: !!puzzleState.isPaused,
            completed: !!grid.get('solved'),
        };
    }

    function flush(body, init) {
        pending = null;
        if (debounceTimer) {
            clearTimeout(debounceTimer);
            debounceTimer = null;
        }
        postProgress(sessionToken, body, init).catch(() => {
            // Best-effort; the next save() call will retry with fresh state.
        });
    }

    function save(puzzleState, grid) {
        const body = buildBody(puzzleState, grid);
        pending = body;

        const pausedChanged = lastPaused !== undefined && lastPaused !== body.paused;
        lastPaused = body.paused;

        if (body.completed || pausedChanged) {
            flush(body);
            return;
        }

        if (debounceTimer) {
            clearTimeout(debounceTimer);
        }
        debounceTimer = setTimeout(() => {
            debounceTimer = null;
            if (pending) {
                flush(pending);
            }
        }, 2000);
    }

    function handleVisibilityChange() {
        if (document.visibilityState === 'hidden' && pending) {
            flush(pending, { keepalive: true });
        }
    }
    if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return {
        save,
        destroy() {
            if (typeof document !== 'undefined') {
                document.removeEventListener('visibilitychange', handleVisibilityChange);
            }
            if (debounceTimer) {
                clearTimeout(debounceTimer);
                debounceTimer = null;
            }
        },
    };
}
