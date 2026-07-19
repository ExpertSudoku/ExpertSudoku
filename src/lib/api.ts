// Thin client for the worker's JSON API. Kept dependency-free and framework
// agnostic so both the website (web-play.jsx) and the Discord path
// (discord-play.jsx, added in Phase 4) can share it.

export type Difficulty = 'medium' | 'expert' | 'hell';

export type ApiError = {
    error: string;
};

// Shared fetch -> JSON -> {error} mapping used by every endpoint helper.
async function request<T>(path: string, init?: RequestInit): Promise<T | ApiError> {
    const response = await fetch(path, init);
    const body = await response.json();
    if (!response.ok) {
        return { error: (body as ApiError | null)?.error || `http-${response.status}` };
    }
    return body as T;
}

function sessionHeaders(sessionToken: string, extra: Record<string, string> = {}): Record<string, string> {
    return { Authorization: `Bearer ${sessionToken}`, ...extra };
}

export type TodayPuzzle = {
    day: string;
    difficulty: Difficulty;
    givens: string;
    // Absolute daily puzzle number (No. N since the launch epoch).
    number: number;
    // Development builds only - the worker never sends this in production.
    solution?: string;
};

export type PuzzleMeta = {
    day: string;
    number: number;
    // difficulty -> 81-char givens string for today (absent if not seeded).
    givens: Partial<Record<Difficulty, string>>;
};

export function fetchPuzzleMeta(): Promise<PuzzleMeta | ApiError> {
    return request<PuzzleMeta>('/api/puzzle/meta');
}

export function fetchTodayPuzzle(difficulty: string): Promise<TodayPuzzle | ApiError> {
    return request<TodayPuzzle>(`/api/puzzle/today?difficulty=${encodeURIComponent(difficulty)}`);
}

export type ProgressState = {
    // puzzleState|null - the shape modelHelpers.exportPuzzleState builds.
    state: Record<string, unknown> | null;
    completedAt: number | null;
};

export function fetchProgress(sessionToken: string, difficulty: string): Promise<ProgressState | ApiError> {
    return request<ProgressState>(`/api/progress?difficulty=${encodeURIComponent(difficulty)}`, {
        headers: sessionHeaders(sessionToken),
    });
}

export type ProgressSummary = {
    day: string;
    completed: Difficulty[];
};

// Which of today's difficulties the session's player has completed - server
// truth, so the Discord picker shows completions made on other devices too.
export function fetchProgressSummary(sessionToken: string): Promise<ProgressSummary | ApiError> {
    return request<ProgressSummary>('/api/progress/summary', {
        headers: sessionHeaders(sessionToken),
    });
}

export type PostProgressBody = {
    difficulty: string;
    state: Record<string, unknown>;
    currentDigits: string;
    elapsedMs: number;
    paused: boolean;
    completed: boolean;
};

export function postProgress(
    sessionToken: string,
    body: PostProgressBody,
    init?: RequestInit
): Promise<{ ok: true; completedAt: number | null } | ApiError> {
    return request('/api/progress', {
        method: 'POST',
        headers: sessionHeaders(sessionToken, { 'Content-Type': 'application/json' }),
        body: JSON.stringify(body),
        ...init,
    });
}

// Self-service data deletion (Discord path only) - the session token is the
// ownership proof, see worker/me.ts.
export function deleteMyData(sessionToken: string): Promise<{ ok: true } | ApiError> {
    return request('/api/me', {
        method: 'DELETE',
        headers: sessionHeaders(sessionToken),
    });
}
