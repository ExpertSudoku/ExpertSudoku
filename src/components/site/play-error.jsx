// Shared error screen for the play wrappers (web-play.jsx / discord-play.jsx)
// when today's puzzle (or the player's progress) can't be loaded.
export default function PlayError({ error }) {
    return (
        <div className="site-page">
            <div className="web-play-message">
                {error === 'no-puzzle'
                    ? 'No puzzle available for today yet - check back soon!'
                    : 'Something went wrong loading today’s puzzle. Please try again shortly.'}
            </div>
        </div>
    );
}
