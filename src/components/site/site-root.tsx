import { useEffect, useState } from 'react';
import DiscordRoot from '../app/discord-root.tsx';
// @ts-ignore
import Landing from './landing.jsx';
// @ts-ignore
import LegalPage from './legal.jsx';
// @ts-ignore
import AboutPage from './about.jsx';
// @ts-ignore
import WebPlay from '../app/web-play.jsx';

// Hand-rolled router: history.pushState + a popstate listener drives which
// page is shown. There are only 4 static routes + /play, so react-router
// would add nothing here.

function currentPath(): string {
    return window.location.pathname;
}

export function navigate(path: string): void {
    if (path !== window.location.pathname + window.location.search) {
        window.history.pushState({}, '', path);
    }
    window.dispatchEvent(new PopStateEvent('popstate'));
}

export function NavLink({ to, className, children }: { to: string; className?: string; children: React.ReactNode }) {
    return (
        <a
            href={to}
            className={className}
            onClick={(e) => {
                e.preventDefault();
                navigate(to);
            }}
        >
            {children}
        </a>
    );
}

export default function SiteRoot() {
    // Discord embeds the Activity in an iframe and appends `frame_id` (among
    // other params) to the URL - that's how we tell "running inside Discord"
    // apart from "running as a plain website" without any other signal.
    const isDiscord = new URLSearchParams(window.location.search).has('frame_id');
    const [path, setPath] = useState(currentPath());

    useEffect(() => {
        if (isDiscord) {
            return;
        }
        const onPopState = () => setPath(currentPath());
        window.addEventListener('popstate', onPopState);
        return () => window.removeEventListener('popstate', onPopState);
    }, [isDiscord]);

    if (isDiscord) {
        return <DiscordRoot />;
    }

    switch (path) {
        case '/play':
            return <WebPlay />;
        case '/imprint':
            return <LegalPage page="imprint" />;
        case '/privacy':
            return <LegalPage page="privacy" />;
        case '/terms':
            return <LegalPage page="terms" />;
        case '/about':
            return <AboutPage />;
        default:
            return <Landing />;
    }
}
