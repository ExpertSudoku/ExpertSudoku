import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// @ts-ignore
import './index.css'
// @ts-ignore
import './site-theme.css'
// @ts-ignore
import { initTheme } from './lib/theme.js'
// @ts-ignore
import { cleanupExpiredPuzzleSaves } from './lib/storage-cleanup.js'
import SiteRoot from "./components/site/site-root.tsx";
// @ts-ignore
import DevBanner from "./components/site/dev-banner.jsx";

initTheme()
cleanupExpiredPuzzleSaves()

// Development builds get a banner above everything and layout room for it
// (--dev-banner-h activates via the `dev` root class).
if (import.meta.env.DEV) {
    document.documentElement.classList.add('dev')
}

const element = document.getElementById('root')
if (!element) {
    throw new Error('Element not found');
}
createRoot(element).render(
    <StrictMode>
        <DevBanner />
        <SiteRoot />
    </StrictMode>,
)
