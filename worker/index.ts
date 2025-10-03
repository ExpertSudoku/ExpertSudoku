import { Hono } from "hono";
import {fetchAndRetry} from "./utils";
const app = new Hono<{ Bindings: Env }>();

app.post("/api/token", async (context) => {
    const request = await context.req.json()
    const response = await fetchAndRetry('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            client_id: context.env.VITE_CLIENT_ID,
            client_secret: context.env.CLIENT_SECRET,
            grant_type: 'authorization_code',
            code: request.code,
        }),
    });

    const { access_token } = (await response.json()) as {
        access_token: string;
    };

    return context.json({ access_token });
});
app.post('/api/save', async (context) => {
    const request = await context.req.json()

    console.log(request)

    return context.json(request);
})

export default app;