import { NavLink } from './site-root.tsx';

import './legal.css';

// Content authored after the operator's goatl.ink legal pages, adapted to
// what ExpertSudoku actually does (website: no accounts, no server-side
// data; Discord Activity: Discord profile + puzzle progress for live
// messages and streaks).

const PAGES = {
    imprint: {
        title: 'Imprint',
        body: (
            <>
                <h2>Operator</h2>
                <p>
                    Linus Tebbe<br />
                    PenguinNetwork by Linus Tebbe<br />
                    Boettgerstr. 7<br />
                    45147 Essen<br />
                    Germany
                </p>
                <h2>Contact</h2>
                <p>
                    E-mail: <a href="mailto:support@expertsudoku.app">support@expertsudoku.app</a><br />
                    Website: <a href="https://expertsudoku.app">https://expertsudoku.app</a>
                </p>
                <h2>VAT</h2>
                <p>VAT-ID number per &sect; 27a UStG: DE326934606</p>
                <h2>Dispute resolution</h2>
                <p>
                    The European Commission provides a platform for online dispute resolution
                    (ODR): <a href="https://ec.europa.eu/consumers/odr/">https://ec.europa.eu/consumers/odr/</a>.
                    You can find our e-mail address above.
                </p>
                <p>
                    We are neither willing nor obliged to participate in dispute resolution
                    proceedings before a consumer arbitration board.
                </p>
            </>
        ),
    },
    privacy: {
        title: 'Privacy Policy',
        body: (
            <>
                <p>
                    This is the human-readable privacy policy for ExpertSudoku. The short
                    version: we only store what is needed to run the game, and we{' '}
                    <strong>never</strong> sell or share your data with any third party.
                </p>

                <h2>Playing on the website</h2>
                <p>
                    The website (expertsudoku.app) has no accounts and no server-side
                    tracking. Your puzzle progress, completed-puzzle record and theme
                    preference live only in your browser&apos;s local storage - they never
                    leave your device. Old puzzle saves are cleaned up automatically after
                    48 hours. There are no analytics and no cookies.
                </p>

                <h2>Playing as a Discord Activity</h2>
                <p>
                    When you launch ExpertSudoku inside Discord, you sign in with your
                    Discord account. We then store:
                </p>
                <ul>
                    <li>Your Discord user id, username, display name and avatar reference.</li>
                    <li>
                        Your puzzle progress per daily sudoku: which cells you have filled
                        (not readable as digits by other players), your elapsed time,
                        pause state and completion time.
                    </li>
                    <li>
                        The id of the Discord channel and server (guild) the Activity was
                        launched from - this is where live progress messages and streak
                        announcements are posted.
                    </li>
                </ul>
                <p>
                    This data is used for exactly three things: letting you resume a
                    puzzle later, rendering the shared live-progress image in your
                    channel, and tracking your server&apos;s daily streak.
                </p>

                <h2>What other people can see</h2>
                <p>
                    Inside the channel you play from, other members see your avatar, a
                    redacted version of your board (only <em>which</em> cells are filled -
                    never the digits), your timing, and - in streak announcements - your
                    name and completion time. Nothing is ever posted anywhere else.
                </p>

                <h2>Deleting your data</h2>
                <p>
                    Website data can be removed by clearing your browser storage. For
                    Discord-side data, use <strong>&ldquo;Delete my data&rdquo;</strong> on
                    the difficulty screen inside the Activity: being signed in there
                    proves the account is yours, and deletion is immediate and
                    irreversible. We do not store e-mail addresses, so we cannot act on
                    deletion requests sent by e-mail alone - if you can no longer access
                    Discord, contact{' '}
                    <a href="mailto:support@expertsudoku.app">support@expertsudoku.app</a>{' '}
                    and we will agree on a way to verify the account is yours before
                    deleting anything.
                </p>

                <h2>Cookies</h2>
                <p>
                    None. Local storage is used as described above; no tracking cookies of
                    any kind.
                </p>

                <h2>Third-party services</h2>
                <ul>
                    <li>
                        <strong>Cloudflare</strong> hosts the site, the game server and the
                        database. Network traffic passes through their infrastructure.
                    </li>
                    <li>
                        <strong>Discord</strong> provides sign-in inside the Activity and
                        delivers the live messages; avatars are loaded from Discord&apos;s
                        CDN. Discord&apos;s own privacy policy applies to your use of
                        Discord itself.
                    </li>
                </ul>
            </>
        ),
    },
    terms: {
        title: 'Terms of Service',
        body: (
            <>
                <h2>The service</h2>
                <p>
                    ExpertSudoku is a free daily sudoku - one puzzle per difficulty per
                    UTC day - playable on the website and as a Discord Activity. It is
                    provided as-is; we do our best to keep it running but make no
                    availability guarantees.
                </p>

                <h2>Accounts</h2>
                <p>
                    The website requires no account. Inside Discord you sign in with your
                    existing Discord account; keeping that account secure is your
                    responsibility, and Discord&apos;s own terms and age requirements
                    apply.
                </p>

                <h2>Fair play &amp; acceptable use</h2>
                <p>You agree not to:</p>
                <ul>
                    <li>
                        use automated solvers, exploits or manipulated requests to falsify
                        completion times, leaderboards or streaks;
                    </li>
                    <li>
                        attempt to disrupt the service or gain unauthorized access to it or
                        to other players&apos; data;
                    </li>
                    <li>use the Discord integration to spam or harass others.</li>
                </ul>

                <h2>Third-party platforms</h2>
                <p>
                    Playing inside Discord means Discord&apos;s Terms of Service apply
                    alongside these. The sudoku engine is free software (AGPL&nbsp;v3) -
                    see the <NavLink to="/about">About page</NavLink> for source and
                    licensing.
                </p>

                <h2>Termination</h2>
                <p>
                    We may exclude players who violate these terms from the service, and
                    may change or discontinue the service with reasonable notice.
                </p>

                <h2>Liability</h2>
                <p>
                    The service is provided without warranties of any kind. To the extent
                    permitted by law, we are not liable for damages arising from use of
                    the service, downtime, or loss of data (it&apos;s a sudoku - please
                    don&apos;t store anything important in it).
                </p>

                <h2>Changes</h2>
                <p>
                    We may update these terms; continued use of the service after changes
                    means you accept them.
                </p>
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
