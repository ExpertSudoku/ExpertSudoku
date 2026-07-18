// The difficulty pips motif (1/2/3 diamonds), shared by the in-game header
// wordmark and the difficulty picker rows - colouring comes from the
// caller's CSS context.
export default function Pips({ count, className, pipClassName }) {
    return (
        <span className={className} aria-hidden="true">
            {Array.from({ length: count }, (_, i) => (
                <svg key={i} viewBox="0 0 12 12" className={pipClassName}>
                    <path d="M 6 0 L 12 6 L 6 12 L 0 6 Z" />
                </svg>
            ))}
        </span>
    );
}
