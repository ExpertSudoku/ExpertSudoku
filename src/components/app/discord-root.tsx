import {createContext, useEffect, useRef, useState} from "react";
import {CommandResponse, Platform} from "@discord/embedded-app-sdk";
import {getDiscordSdk} from "../../discordSdk.ts";
// @ts-ignore - untyped .jsx/.js module
import LoadingPage from '../site/loading-page.jsx'
// @ts-ignore - untyped .jsx/.js module
import DifficultyPicker from "../difficulty-picker/difficulty-picker.jsx";
// @ts-ignore - untyped .jsx/.js module
import DiscordPlay from "./discord-play.jsx";
// @ts-ignore - untyped .jsx/.js module
import DeleteDataButton from "./delete-data-button.jsx";
// @ts-ignore - untyped .jsx/.js module
import {isDifficulty} from "../../../shared/difficulties.js";
// @ts-ignore - untyped .jsx/.js module
import {recordCompletion, getCompletedDifficulties} from "../../lib/completions.js";
import {fetchProgressSummary} from "../../lib/api.ts";
// @ts-ignore - untyped .jsx/.js module
import LogoMark from "../site/logo-mark.jsx";
// @ts-ignore - untyped .jsx/.js module
import ThemeSelect from "../site/theme-select.jsx";

export type SessionInfo = {
    sessionToken: string;
    userId: string;
};

export const SessionContext = createContext<SessionInfo | null>(null);

// Discord Activity entry point: SDK handshake -> authorize -> exchange the
// code for both a Discord access token (needed once, for `authenticate`)
// and a server-minted session token (used for every later API call, see
// worker/session.ts) -> difficulty picker -> DiscordPlay.
export default function DiscordRoot() {
    type Auth = CommandResponse<'authenticate'>;
    const [auth, setAuth] = useState<Auth | null>(null);
    const [session, setSession] = useState<SessionInfo | null>(null);
    const [difficulty, setDifficulty] = useState<string | null>(null);
    // Server-provided puzzle day, set once the completion summary has been
    // fetched - the key into the client-side completions record.
    const [puzzleDay, setPuzzleDay] = useState<string | null>(null);
    // StrictMode double-mounts effects; without this guard authorize() (and
    // the /api/token exchange) would fire twice on every dev load.
    const started = useRef(false);

    async function setupDiscordSdk() {
        const discordSdk = getDiscordSdk();
        await discordSdk.ready();
        const { code } = await discordSdk.commands.authorize({
            client_id: import.meta.env.VITE_CLIENT_ID,
            response_type: 'code',
            state: '',
            prompt: 'none',
            scope: [
                'applications.commands',
                'identify',
                'guilds',
            ],
        });

        const response = await fetch('/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                code,
                channelId: discordSdk.channelId,
                guildId: discordSdk.guildId,
            }),
        });
        const { access_token, session_token, preselected_difficulty } = await response.json();

        const authResult = await discordSdk.commands.authenticate({ access_token });
        setAuth(authResult);
        setSession({ sessionToken: session_token, userId: authResult.user.id });
        // Launches triggered by a difficulty button on a live message carry
        // the chosen difficulty - skip the picker and go straight in.
        if (isDifficulty(preselected_difficulty)) {
            setDifficulty(preselected_difficulty);
        }
    }

    useEffect(() => {
        if (started.current) {
            return;
        }
        started.current = true;
        // The SDK reads `platform` off the iframe URL at construction time.
        // On Discord mobile the layout shifts down by --discord-top-inset
        // (site-theme.css) so the header isn't covered by Discord's own
        // floating activity controls.
        if (getDiscordSdk().platform === Platform.MOBILE) {
            document.documentElement.classList.add('discord-mobile');
        }
        setupDiscordSdk();
    }, []);

    // Discord progress is server-side: ask the worker which difficulties are
    // already completed today and mirror that into the client-side record
    // (src/lib/completions.js), so the picker (and the in-game pickers) grey
    // out finished rows even when they were solved on another device.
    useEffect(() => {
        if (session === null) {
            return;
        }
        let cancelled = false;
        fetchProgressSummary(session.sessionToken).then((result) => {
            if (cancelled || 'error' in result) {
                return;
            }
            for (const finished of result.completed) {
                recordCompletion(result.day, finished);
            }
            setPuzzleDay(result.day);
        });
        return () => { cancelled = true; };
    }, [session]);

    if (auth === null || session === null) {
        return (<LoadingPage label="Connecting…" />);
    }

    if (difficulty === null) {
        return (
            <div className="site-page picker-screen">
                <div className="picker-screen-inner">
                    {/* Same Light/Auto/Dark selector as the landing masthead.
                        Discord transmits nothing about its own theme (no SDK
                        command/event/URL param), so 'auto' following
                        prefers-color-scheme is the closest automatic match,
                        and this is where players can override it. */}
                    <header className="picker-masthead">
                        <LogoMark size={22} />
                        <ThemeSelect />
                    </header>
                    <h1 className="su-display">Pick your pain.</h1>
                    {/* Read at render time: returning from a just-solved
                        puzzle picks up completions mirrored mid-session. */}
                    <DifficultyPicker
                        onPick={setDifficulty}
                        completed={puzzleDay ? getCompletedDifficulties(puzzleDay) : []}
                    />
                    <DeleteDataButton session={session} />
                </div>
            </div>
        );
    }

    return (
        <SessionContext.Provider value={session}>
            <DiscordPlay
                key={difficulty}
                difficulty={difficulty}
                session={session}
                onExit={() => setDifficulty(null)}
                onSwitchDifficulty={setDifficulty}
            />
        </SessionContext.Provider>
    );
}
