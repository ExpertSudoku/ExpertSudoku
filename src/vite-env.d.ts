/// <reference types="vite/client" />

// Typed env vars (only the VITE_-prefixed ones ever reach the client
// bundle - see the secrets section in README.md / CLAUDE.md).
interface ViteTypeOptions {
    strictImportMetaEnv: unknown;
}

interface ImportMetaEnv {
    // The Discord application id (public - it appears in the OAuth URL).
    readonly VITE_CLIENT_ID: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
