// Rendered only in development builds (import.meta.env.DEV is statically
// false in production, so this whole component tree-shakes away). Paired
// with the `dev` class on <html> (set in index.tsx), which reserves the
// banner's height above the fixed game header via --dev-banner-h.
export default function DevBanner() {
    if (!import.meta.env.DEV) {
        return null;
    }
    return (
        <div className="dev-banner">
            DEV BUILD — solutions are sent to the client
        </div>
    );
}
