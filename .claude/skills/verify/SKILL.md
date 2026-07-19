---
name: verify
description: Build/launch/drive recipe for verifying UI changes in this repo (website path, headless Chrome over CDP)
---

# Verifying changes in this repo

## Launch

- `npm run dev` (background) → Vite dev server on **port 3000**, serves client AND worker. Ready in ~2s; `curl -s localhost:3000` to confirm.
- The **website path** (`localhost:3000/`, `/play?difficulty=medium|expert|hell`) needs no Discord handshake and reaches almost all UI: landing, pickers, the full game + header. The Discord path (`?frame_id=...`) needs a real Discord iframe — don't try to fake the handshake; verify shared components on the website path instead.
- Dev builds show an amber DEV BUILD banner + SOLVE chip — expected, not a bug.

## Drive (no Playwright installed)

System `google-chrome` + Node 22 (global `WebSocket`) → raw CDP works well:

1. `google-chrome --headless=new --remote-debugging-port=9222 --user-data-dir=<scratch> --no-first-run about:blank`
2. `fetch('http://127.0.0.1:9222/json')` → find `type: 'page'` → connect `new WebSocket(webSocketDebuggerUrl)`
3. Speak `{id, method, params}`: `Page.enable`, `Page.navigate` (then sleep ~1.5s; no load event wiring needed), `Runtime.evaluate` (`returnByValue: true`) to click/read DOM/localStorage, `Emulation.setDeviceMetricsOverride` for mobile widths (390×844), `Page.captureScreenshot` → base64 PNG.

A working driver from a past session: theme-button verification script pattern — navigate, JSON-dump DOM state, click via `Runtime.evaluate`, screenshot between steps.

## Gotchas

- Headless Chrome's `prefers-color-scheme` is **light**, so theme `auto` renders light.
- `?theme=light|dark` URL param forces a theme without persisting (built for screenshot verification).
- Mobile header breakpoint is `max-width: 52rem` in status-bar.css.
- Working tree files may use CRLF (WSL); git prints LF/CRLF warnings — harmless.
