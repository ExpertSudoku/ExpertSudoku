#!/usr/bin/env node
// Renders the master logo SVG (src/svg/logos/expertsudoku-concept1-icon.svg)
// into the public/ raster assets: logo192.png, logo512.png, favicon.ico
// (a single-entry ICO wrapping a 32px PNG - valid in every modern browser),
// plus a copy of the SVG as public/favicon.svg. Re-run after changing the
// master SVG.
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Resvg, initWasm } from '@resvg/resvg-wasm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const masterPath = join(root, 'src/svg/logos/expertsudoku-concept1-icon.svg');
const avatarPath = join(root, 'src/svg/logos/expertsudoku-concept1-avatar.svg');
const publicDir = join(root, 'public');

await initWasm(readFileSync(join(root, 'node_modules/@resvg/resvg-wasm/index_bg.wasm')));

const svg = readFileSync(masterPath, 'utf8');

function renderPng(size, source = svg) {
    const resvg = new Resvg(source, {
        font: { loadSystemFonts: false },
        fitTo: { mode: 'width', value: size },
    });
    return resvg.render().asPng();
}

// ICO container with one PNG-compressed entry (supported since Vista).
function pngToIco(png, size) {
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0); // reserved
    header.writeUInt16LE(1, 2); // type: icon
    header.writeUInt16LE(1, 4); // count
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size < 256 ? size : 0, 0); // width (0 = 256)
    entry.writeUInt8(size < 256 ? size : 0, 1); // height
    entry.writeUInt8(0, 2);  // palette
    entry.writeUInt8(0, 3);  // reserved
    entry.writeUInt16LE(1, 4);  // colour planes
    entry.writeUInt16LE(32, 6); // bpp
    entry.writeUInt32LE(png.length, 8);  // data size
    entry.writeUInt32LE(22, 12); // data offset (6 + 16)
    return Buffer.concat([header, entry, Buffer.from(png)]);
}

writeFileSync(join(publicDir, 'logo192.png'), renderPng(192));
writeFileSync(join(publicDir, 'logo512.png'), renderPng(512));
writeFileSync(join(publicDir, 'favicon.ico'), pngToIco(renderPng(32), 32));
copyFileSync(masterPath, join(publicDir, 'favicon.svg'));

// Discord avatar variant (circle-crop safe, extra outer padding) - uploaded
// manually / via PATCH /users/@me, not served by the site.
const avatarSvg = readFileSync(avatarPath, 'utf8');
writeFileSync(join(root, 'src/svg/logos/discord-avatar.png'), renderPng(1024, avatarSvg));
console.log('wrote public/logo192.png, logo512.png, favicon.ico, favicon.svg, src/svg/logos/discord-avatar.png');
