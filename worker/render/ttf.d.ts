// `?inline` forces Vite to always inline the asset as a base64 `data:` URI
// string, bypassing assetsInlineLimit - needed because a plain `.ttf` import
// is treated as a generic static asset (a URL string pointing at
// dist/client) rather than raw bytes, unlike the special-cased `.wasm`
// import handling `@resvg/resvg-wasm` relies on.
declare module '*.ttf?inline' {
    const dataUri: string;
    export default dataUri;
}
