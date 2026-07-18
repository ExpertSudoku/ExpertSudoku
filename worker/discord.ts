import { ButtonStyle, ComponentType, RouteBases, Routes } from 'discord-api-types/v10';
import { fetchAndRetry } from './utils';

export async function discordApi(env: Env, route: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bot ${env.DISCORD_BOT_TOKEN}`);
    return fetchAndRetry(`${RouteBases.api}${route}`, { ...init, headers });
}

// Discord message component (action row of buttons) - see
// https://discord.com/developers/docs/interactions/message-components
export type MessageComponent = {
    type: ComponentType.ActionRow;
    components: {
        type: ComponentType.Button;
        style: ButtonStyle;
        label: string;
        custom_id: string;
    }[];
};

// Multipart body for a message whose image is (re)uploaded as files[0].
function imageMessageForm(
    payload: Record<string, unknown>,
    png: Uint8Array,
    filename: string
): FormData {
    const form = new FormData();
    form.set('payload_json', JSON.stringify(payload));
    form.set('files[0]', new Blob([png as unknown as BlobPart], { type: 'image/png' }), filename);
    return form;
}

export type SendResult = { ok: true; messageId: string } | { ok: false; status: number };

export async function sendImageMessage(
    env: Env,
    channelId: string,
    content: string,
    png: Uint8Array,
    filename = 'board.png',
    components?: MessageComponent[]
): Promise<SendResult> {
    const response = await discordApi(env, Routes.channelMessages(channelId), {
        method: 'POST',
        body: imageMessageForm({ content, components }, png, filename),
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
    // `attachments: [{id: 0, filename}]` is REQUIRED to replace the old
    // image - omitting it keeps the stale attachment instead of swapping it.
    const response = await discordApi(env, Routes.channelMessage(channelId, messageId), {
        method: 'PATCH',
        body: imageMessageForm({ content, attachments: [{ id: 0, filename }], components }, png, filename),
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
