#!/usr/bin/env node
// Signs a session JWT (matching worker/session.ts's mintSession/requireSession,
// i.e. plain HS256 with SESSION_SECRET) so the session-authed API routes can
// be curled directly during local development, without needing a full
// Discord OAuth handshake (which requires real Discord app secrets).
//
// Usage:
//   node scripts/mint-dev-token.mjs --sub 123456789012345678 [--chan 111] [--guild 222] [--ttl 86400]
//
// Reads SESSION_SECRET from .dev.vars in the repo root.

import { readFileSync } from 'node:fs';
import { createHmac } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function readDevVars() {
    const path = join(__dirname, '..', '.dev.vars');
    const text = readFileSync(path, 'utf8');
    const vars = {};
    for (const line of text.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
            continue;
        }
        const eq = trimmed.indexOf('=');
        if (eq === -1) {
            continue;
        }
        vars[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
    }
    return vars;
}

function parseArgs(argv) {
    const args = { sub: '111111111111111111', chan: '222222222222222222', guild: null, ttl: 86400 };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--sub') {
            args.sub = argv[++i];
        } else if (a === '--chan') {
            args.chan = argv[++i];
        } else if (a === '--guild') {
            args.guild = argv[++i];
        } else if (a === '--ttl') {
            args.ttl = parseInt(argv[++i], 10);
        }
    }
    return args;
}

function base64url(input) {
    return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function signHs256(payload, secret) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const encodedHeader = base64url(JSON.stringify(header));
    const encodedPayload = base64url(JSON.stringify(payload));
    const signingInput = `${encodedHeader}.${encodedPayload}`;
    const signature = createHmac('sha256', secret).update(signingInput).digest('base64')
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return `${signingInput}.${signature}`;
}

function main() {
    const args = parseArgs(process.argv.slice(2));
    const devVars = readDevVars();
    const secret = devVars.SESSION_SECRET;
    if (!secret) {
        console.error('SESSION_SECRET not found in .dev.vars');
        process.exit(1);
    }
    const now = Math.floor(Date.now() / 1000);
    const payload = {
        sub: args.sub,
        chan: args.chan,
        guild: args.guild,
        iat: now,
        exp: now + args.ttl,
    };
    const token = signHs256(payload, secret);
    console.log(token);
}

main();
