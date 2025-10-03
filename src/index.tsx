import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// @ts-ignore
import './index.css'
// @ts-ignore
import App from './components/app/app.jsx'
import LoginWrapper from "./components/app/login-wrapper.tsx";


const element = document.getElementById('root')
if (!element) {
    throw new Error('Element not found');
}
createRoot(element).render(
    <StrictMode>
        <LoginWrapper />
    </StrictMode>,
)
