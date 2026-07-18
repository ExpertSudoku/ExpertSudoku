// `?inline` forces Vite to inline the TTF as a base64 data: URI at build
// time (see ttf.d.ts) - a plain `.ttf` import would just give us a static
// asset URL rather than usable bytes. Shared by every image that draws text
// (leaderboard rows, board timing column).
import interMediumDataUri from './fonts/Inter-Medium.ttf?inline';

function dataUriToBytes(dataUri: string): Uint8Array {
    const base64 = dataUri.slice(dataUri.indexOf(',') + 1);
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

let cached: Uint8Array | undefined;

export function interFontBytes(): Uint8Array {
    return (cached ??= dataUriToBytes(interMediumDataUri));
}
