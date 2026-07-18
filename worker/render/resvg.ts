// One-time wasm init guard: `initWasm` throws if called twice in the same
// isolate, and Workers reuse isolates across requests, so the promise (not
// just a boolean) must live at module scope and be awaited by every caller -
// concurrent first-requests all await the same in-flight init instead of
// racing to call initWasm twice.
import wasm from '@resvg/resvg-wasm/index_bg.wasm';
import { initWasm, Resvg } from '@resvg/resvg-wasm';

let ready: Promise<void> | undefined;

export async function ensureResvgReady(): Promise<void> {
    ready ??= initWasm(wasm as unknown as WebAssembly.Module);
    await ready;
}

export { Resvg };
