import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// @ts-ignore
import './index.css'
// @ts-ignore
import './site-theme.css'
// @ts-ignore
import { initTheme } from './lib/theme.js'

initTheme()
import SiteRoot from "./components/site/site-root.tsx";


const element = document.getElementById('root')
if (!element) {
    throw new Error('Element not found');
}
createRoot(element).render(
    <StrictMode>
        <SiteRoot />
    </StrictMode>,
)
