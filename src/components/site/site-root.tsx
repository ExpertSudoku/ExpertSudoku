import { useSyncExternalStore } from 'react';
import DiscordRoot from '../app/discord-root.tsx';
// @ts-ignore - untyped .jsx/.js module
import Landing from './landing.jsx';
// @ts-ignore - untyped .jsx/.js module
import LegalPage from './legal.jsx';
// @ts-ignore - untyped .jsx/.js module
import AboutPage from './about.jsx';
// @ts-ignore - untyped .jsx/.js module
import WebPlay from '../app/web-play.jsx';

// Hand-rolled router: history.pushState + a popstate listener drives which
// page is shown. There are only 4 static routes + /play, so react-router
// would add nothing here.

// Includes the query string: navigating /play?difficulty=expert ->
// /play?difficulty=hell must produce a new state value or React bails on
// the re-render (the pathname alone doesn't change).
function currentPath(): string {
    return window.location.pathname + window.location.search;
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

function subscribeToPath(callback: () => void): () => void {
    window.addEventListener('popstate', callback);
    return () => window.removeEventListener('popstate', callback);
}

export default function SiteRoot() {
    // Discord embeds the Activity in an iframe and appends `frame_id` (among
    // other params) to the URL - that's how we tell "running inside Discord"
    // apart from "running as a plain website" without any other signal.
    const isDiscord = new URLSearchParams(window.location.search).has('frame_id');
    // useSyncExternalStore (not useState + useEffect): child effects run
    // before the parent's, so a child that calls navigate() from its mount
    // effect (e.g. WebPlay redirecting /play-without-difficulty to /) fires
    // popstate before a parent-effect listener would exist - the event is
    // lost and the router state goes stale, rendering a blank page. The
    // store re-reads the snapshot when the subscription attaches, so a
    // navigation that happened during mount is picked up.
    const path = useSyncExternalStore(subscribeToPath, currentPath);

    if (isDiscord) {
        return <DiscordRoot />;
    }

    switch (path.split('?')[0]) {
        case '/play':
            // Keyed by path: play->play navigation (difficulty switch)
            // remounts with fresh state instead of resetting in an effect.
            return <WebPlay key={path} />;
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
