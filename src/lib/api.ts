// Thin client for the worker's JSON API. Kept dependency-free and framework
// agnostic so both the website (web-play.jsx) and the Discord path
// (discord-play.jsx, added in Phase 4) can share it.

export type Difficulty = 'medium' | 'expert' | 'hell';

export type TodayPuzzle = {
    day: string;
    difficulty: Difficulty;
    givens: string;
    // Absolute daily puzzle number (#N since the launch epoch).
    number: number;
    // Development builds only - the worker never sends this in production.
    solution?: string;
};

export type PuzzleMeta = {
    day: string;
    number: number;
};

export async function fetchPuzzleMeta(): Promise<PuzzleMeta | ApiError> {
    const response = await fetch('/api/puzzle/meta');
    const body = await response.json();
    if (!response.ok) {
        return { error: body?.error || `http-${response.status}` };
    }
    return body as PuzzleMeta;
}

export type ApiError = {
    error: string;
};

export async function fetchTodayPuzzle(difficulty: string): Promise<TodayPuzzle | ApiError> {
    const response = await fetch(`/api/puzzle/today?difficulty=${encodeURIComponent(difficulty)}`);
    const body = await response.json();
    if (!response.ok) {
        return { error: body?.error || `http-${response.status}` };
    }
    return body as TodayPuzzle;
}

export type ProgressState = {
    // puzzleState|null - the shape modelHelpers.exportPuzzleState builds.
    state: Record<string, unknown> | null;
    completedAt: number | null;
};

export async function fetchProgress(sessionToken: string, difficulty: string): Promise<ProgressState | ApiError> {
    const response = await fetch(`/api/progress?difficulty=${encodeURIComponent(difficulty)}`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
    });
    const body = await response.json();
    if (!response.ok) {
        return { error: body?.error || `http-${response.status}` };
    }
    return body as ProgressState;
}

export type PostProgressBody = {
    difficulty: string;
    state: Record<string, unknown>;
    currentDigits: string;
    elapsedMs: number;
    paused: boolean;
    completed: boolean;
};

export async function postProgress(
    sessionToken: string,
    body: PostProgressBody,
    init?: RequestInit
): Promise<{ ok: true; completedAt: number | null } | ApiError> {
    const response = await fetch('/api/progress', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify(body),
        ...init,
    });
    const responseBody = await response.json();
    if (!response.ok) {
        return { error: responseBody?.error || `http-${response.status}` };
    }
    return responseBody;
}

// Self-service data deletion (Discord path only) - the session token is the
// ownership proof, see worker/me.ts.
export async function deleteMyData(sessionToken: string): Promise<{ ok: true } | ApiError> {
    const response = await fetch('/api/me', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${sessionToken}` },
    });
    const body = await response.json();
    if (!response.ok) {
        return { error: body?.error || `http-${response.status}` };
    }
    return body;
}
