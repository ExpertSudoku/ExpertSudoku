import { useEffect, useState } from 'react';

import { getDiscordSdk } from '../../discordSdk.ts';

// One-time card shown to guild admins (server-decided, /api/token's
// suggest_bot_install) offering to add the bot to the server. Shown once
// per guild - the localStorage flag is written on first render, so
// dismissing OR ignoring it both count as "seen".
const STORAGE_KEY = 'expertsudoku-bot-prompt-seen';

function seenGuilds() {
    try {
        return JSON.parse(window.localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
        return {};
    }
}

export function wasPromptSeen(guildId) {
    return !!seenGuilds()[guildId];
}

function markPromptSeen(guildId) {
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...seenGuilds(), [guildId]: true }));
    } catch {
        // ignore storage errors
    }
}

export default function BotInstallPrompt({ guildId }) {
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        markPromptSeen(guildId);
    }, [guildId]);

    if (dismissed) {
        return null;
    }

    const addBot = () => {
        const clientId = import.meta.env.VITE_CLIENT_ID;
        // Send Messages (2048) is all the live features need.
        const url = `https://discord.com/oauth2/authorize?client_id=${clientId}&scope=bot+applications.commands&permissions=2048&guild_id=${guildId}`;
        getDiscordSdk().commands.openExternalLink({ url });
        setDismissed(true);
    };

    return (
        <div className="bot-prompt">
            <p className="bot-prompt-text">
                <strong>Get the full experience:</strong> add ExpertSudoku to this
                server to see everyone&apos;s progress race live in chat and keep a
                daily server streak with nightly leaderboards.
            </p>
            <div className="bot-prompt-actions">
                <button type="button" className="bot-prompt-add" onClick={addBot}>
                    Add to server
                </button>
                <button type="button" className="bot-prompt-dismiss" onClick={() => setDismissed(true)}>
                    No thanks
                </button>
            </div>
        </div>
    );
}
