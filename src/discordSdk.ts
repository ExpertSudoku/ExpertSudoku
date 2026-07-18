import { DiscordSDK } from '@discord/embedded-app-sdk';

// The DiscordSDK constructor reads `frame_id` off the URL and throws
// synchronously if it's missing. Since this module is reachable (via
// discord-root.tsx) from the site root's static import graph even on the
// plain website (which never has a `frame_id`), the SDK must be constructed
// lazily - only once we already know we're running inside the Discord
// iframe - rather than at module load time.
let instance: DiscordSDK | null = null;

export function getDiscordSdk(): DiscordSDK {
    if (!instance) {
        instance = new DiscordSDK(import.meta.env.VITE_CLIENT_ID);
    }
    return instance;
}
