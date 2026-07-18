// Fetches a Discord avatar (or the default avatar for a null hash) and
// returns it as a base64 string, ready to embed as a data: URI in an <image>
// element (see board-image.ts / leaderboard-image.ts).

// btoa(String.fromCharCode(...bytes)) blows the call stack for anything but
// tiny arrays (spread turns into that many arguments) - chunking avoids it.
const BASE64_CHUNK_SIZE = 8192;

function toBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.length; i += BASE64_CHUNK_SIZE) {
        const chunk = bytes.subarray(i, i + BASE64_CHUNK_SIZE);
        binary += String.fromCharCode(...chunk);
    }
    return btoa(binary);
}

function defaultAvatarIndex(userId: string): bigint {
    // Discord's default-avatar formula for the new username system.
    return (BigInt(userId) >> 22n) % 6n;
}

function avatarUrl(userId: string, avatarHash: string | null): string {
    if (avatarHash) {
        return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.png?size=64`;
    }
    return `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex(userId)}.png`;
}

export async function fetchAvatarPng(_env: Env, userId: string, avatarHash: string | null): Promise<string> {
    const url = avatarUrl(userId, avatarHash);
    const cache = caches.default;
    const cacheKey = new Request(url);

    let response = await cache.match(cacheKey);
    if (!response) {
        const fetched = await fetch(url);
        if (fetched.ok) {
            const headers = new Headers(fetched.headers);
            headers.set('Cache-Control', 'public, max-age=3600');
            const cacheable = new Response(fetched.clone().body, { status: fetched.status, headers });
            response = fetched;
            // Don't block the caller on the cache write.
            await cache.put(cacheKey, cacheable);
        } else {
            response = fetched;
        }
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    return toBase64(bytes);
}
