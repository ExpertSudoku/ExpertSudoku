// Canonical difficulty vocabulary shared between client, worker and the seed script.
// Keep this file dependency-free (plain JS, no imports) so it can be used from
// Node (seed script), the Vite client bundle, and the Cloudflare Worker alike.

export const DIFFICULTIES = ['medium', 'expert', 'hell'];

export function isDifficulty(value) {
    return DIFFICULTIES.includes(value);
}
