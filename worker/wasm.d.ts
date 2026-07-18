// Wasm imports are bundled as compiled-wasm modules by @cloudflare/vite-plugin
// (see "Bundling notes" in CLAUDE.md) - the default export is the compiled
// module, ready for WebAssembly.instantiate.
declare module '*.wasm' {
    const module: WebAssembly.Module;
    export default module;
}
