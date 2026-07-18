import './loading-page.css';

// The brand mark's tile layout (see logo-mark.jsx): difficulty-colour
// diagonal, plain cells everywhere else.
const TILE_COLORS = [
    'var(--su-medium)', 'var(--su-cell)', 'var(--su-cell)',
    'var(--su-cell)', 'var(--su-expert)', 'var(--su-cell)',
    'var(--su-cell)', 'var(--su-cell)', 'var(--su-hell)',
];

// Branded loading page: the logo's 3x3 tile block breathing in a diagonal
// wave, centred on a shell page. Used everywhere the app waits (Discord
// handshake, puzzle/progress fetches).
export default function LoadingPage({ label = 'Loading…' }) {
    return (
        <div className="site-page loading-page" role="status" aria-live="polite" aria-label={label}>
            <div className="loading-tiles" aria-hidden="true">
                {TILE_COLORS.map((color, i) => (
                    <span
                        key={i}
                        style={{
                            background: color,
                            animationDelay: `${(Math.floor(i / 3) + (i % 3)) * 90}ms`,
                        }}
                    />
                ))}
            </div>
            <p className="loading-label" aria-hidden="true">{label}</p>
        </div>
    );
}
