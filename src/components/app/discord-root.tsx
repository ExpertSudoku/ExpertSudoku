import {createContext, useEffect, useRef, useState} from "react";
import {CommandResponse} from "@discord/embedded-app-sdk";
import {getDiscordSdk} from "../../discordSdk.ts";
import Spinner from '../spinner/spinner.tsx'
// @ts-ignore
import DifficultyPicker from "../difficulty-picker/difficulty-picker.jsx";
// @ts-ignore
import DiscordPlay from "./discord-play.jsx";
// @ts-ignore
import DeleteDataButton from "./delete-data-button.jsx";
// @ts-ignore
import {isDifficulty} from "../../../shared/difficulties.js";

export type SessionInfo = {
    sessionToken: string;
    userId: string;
};

export const SessionContext = createContext<SessionInfo | null>(null);

// Discord Activity entry point: SDK handshake -> authorize -> exchange the
// code for both a Discord access token (needed once, for `authenticate`)
// and a server-minted session token (used for every later API call, see
// worker/session.ts) -> difficulty picker -> DiscordPlay.
export default function DiscordRoot(): any {
    type Auth = CommandResponse<'authenticate'>;
    const [auth, setAuth] = useState<Auth | null>(null);
    const [session, setSession] = useState<SessionInfo | null>(null);
    const [difficulty, setDifficulty] = useState<string | null>(null);
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
        setupDiscordSdk();
    }, []);

    if (auth === null || session === null) {
        return (<div className="site-page"><Spinner /></div>);
    }

    if (difficulty === null) {
        return (
            <div className="site-page picker-screen">
                <div className="picker-screen-inner">
                    <h1 className="su-display">Pick your pain.</h1>
                    <DifficultyPicker onPick={setDifficulty} />
                    <DeleteDataButton session={session} />
                </div>
            </div>
        );
    }

    return (
        <SessionContext.Provider value={session}>
            <DiscordPlay
                difficulty={difficulty}
                session={session}
                onExit={() => setDifficulty(null)}
                onSwitchDifficulty={setDifficulty}
            />
        </SessionContext.Provider>
    );
}
