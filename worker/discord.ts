import { fetchAndRetry } from './utils';

const DISCORD_API_BASE = 'https://discord.com/api/v10';

export async function discordApi(env: Env, path: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bot ${env.DISCORD_BOT_TOKEN}`);
    return fetchAndRetry(`${DISCORD_API_BASE}${path}`, { ...init, headers });
}

// Discord message component (action row of buttons) - see
// https://discord.com/developers/docs/interactions/message-components
export type MessageComponent = {
    type: 1;
    components: {
        type: 2;
        style: number; // 1 primary (blurple), 2 secondary (grey)
        label: string;
        custom_id: string;
    }[];
};

export type SendResult = { ok: true; messageId: string } | { ok: false; status: number };

export async function sendImageMessage(
    env: Env,
    channelId: string,
    content: string,
    png: Uint8Array,
    filename = 'board.png',
    components?: MessageComponent[]
): Promise<SendResult> {
    const form = new FormData();
    form.set('payload_json', JSON.stringify({ content, components }));
    form.set('files[0]', new Blob([png as unknown as BlobPart], { type: 'image/png' }), filename);

    const response = await discordApi(env, `/channels/${channelId}/messages`, {
        method: 'POST',
        body: form,
    });
    if (!response.ok) {
        return { ok: false, status: response.status };
    }
    const body = (await response.json()) as { id: string };
    return { ok: true, messageId: body.id };
}

export type EditResult = { ok: boolean; status: number; code?: number };

export async function editImageMessage(
    env: Env,
    channelId: string,
    messageId: string,
    content: string,
    png: Uint8Array,
    filename = 'board.png',
    components?: MessageComponent[]
): Promise<EditResult> {
    const form = new FormData();
    // `attachments: [{id: 0, filename}]` is REQUIRED to replace the old
    // image - omitting it keeps the stale attachment instead of swapping it.
    form.set('payload_json', JSON.stringify({ content, attachments: [{ id: 0, filename }], components }));
    form.set('files[0]', new Blob([png as unknown as BlobPart], { type: 'image/png' }), filename);

    const response = await discordApi(env, `/channels/${channelId}/messages/${messageId}`, {
        method: 'PATCH',
        body: form,
    });
    if (response.ok) {
        return { ok: true, status: response.status };
    }
    try {
        const body = (await response.json()) as { code?: number };
        return { ok: false, status: response.status, code: body.code };
    } catch {
        return { ok: false, status: response.status };
    }
}
