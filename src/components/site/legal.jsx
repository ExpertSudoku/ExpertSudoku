import { NavLink } from './site-root.tsx';

import './legal.css';

// User-confirmed decision (planning phase): legal pages get placeholder
// operator details for now, clearly marked TODO, to be replaced with the
// real operator's information before going live.

const PAGES = {
    imprint: {
        title: 'Imprint',
        body: (
            <>
                <p className="legal-todo">TODO: replace with real operator details before launch.</p>
                <p>Operator: <strong>[TODO: Company or individual name]</strong></p>
                <p>Address: [TODO: Street, postal code, city, country]</p>
                <p>Contact: [TODO: contact@expertsudoku.app]</p>
                <p>Represented by: [TODO: name of responsible person]</p>
            </>
        ),
    },
    privacy: {
        title: 'Privacy Policy',
        body: (
            <>
                <p className="legal-todo">TODO: replace with a real privacy policy before launch.</p>
                <p>ExpertSudoku, when played as a Discord Activity, stores your Discord user id,
                username, avatar and puzzle progress to power live progress messages and streaks
                in the channel you played from. The standalone website does not send any of this
                to a server - progress is kept only in your browser&apos;s local storage.</p>
                <p>Data controller: [TODO: operator name and contact]</p>
                <p>Legal basis, retention periods and your rights: [TODO]</p>
            </>
        ),
    },
    terms: {
        title: 'Terms of Service',
        body: (
            <>
                <p className="legal-todo">TODO: replace with real terms before launch.</p>
                <p>ExpertSudoku is provided as-is, for fun. [TODO: liability, acceptable use,
                and any other terms your jurisdiction requires.]</p>
            </>
        ),
    },
};

export default function LegalPage({ page }) {
    const content = PAGES[page] || PAGES.imprint;
    return (
        <div className="site-page legal-page">
            <div className="legal-column">
                <NavLink to="/" className="legal-back-link">&larr; expertsudoku.app</NavLink>
                <h1 className="su-display">{content.title}</h1>
                {content.body}
            </div>
        </div>
    );
}
