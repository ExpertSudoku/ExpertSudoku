import {createContext, useEffect, useState} from "react";
import {CommandResponse} from "@discord/embedded-app-sdk";
import {discordSdk} from "../../discordSdk.ts";
import Spinner from '../spinner/spinner.tsx'
import App from "./app";

export const AccessTokenContext = createContext<string>('');

export default function LoginWrapper(): any {
    type Auth = CommandResponse<'authenticate'>;
    const [auth, setAuth] = useState<Auth|null>(null)

    console.log('Discord SDK logging in');

    async function setupDiscordSdk() {
        console.log('Discord SDK logging in');
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
            }),
        });
        const { access_token } = await response.json();

        setAuth(await discordSdk.commands.authenticate({
            access_token,
        }));
    }
    useEffect(() => {
        console.log("Effect hook.");
        setupDiscordSdk();
    }, []);

    if (auth === null) {
        return (<Spinner />);
    }

    return (
        <AccessTokenContext value={auth.access_token}><App /></AccessTokenContext>
    )
}