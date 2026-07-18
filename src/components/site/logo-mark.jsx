// The ExpertSudoku mark (concept 1): a 3x3 block of the app's rounded tiles
// with the diagonal escalating through the three difficulty colours.
// Inline JSX twin of src/svg/logos/expertsudoku-concept1-mark.svg - keep the
// two in sync. `size` is the rendered width/height in px.
export default function LogoMark({ size = 20 }) {
    return (
        <svg viewBox="0 0 74 74" width={size} height={size} aria-hidden="true">
            <rect x="0" y="0" width="22" height="22" rx="5" fill="#23a55a" />
            <rect x="26" y="0" width="22" height="22" rx="5" fill="var(--su-cell)" />
            <rect x="52" y="0" width="22" height="22" rx="5" fill="var(--su-cell)" />
            <rect x="0" y="26" width="22" height="22" rx="5" fill="var(--su-cell)" />
            <rect x="26" y="26" width="22" height="22" rx="5" fill="#f0b232" />
            <rect x="52" y="26" width="22" height="22" rx="5" fill="var(--su-cell)" />
            <rect x="0" y="52" width="22" height="22" rx="5" fill="var(--su-cell)" />
            <rect x="26" y="52" width="22" height="22" rx="5" fill="var(--su-cell)" />
            <rect x="52" y="52" width="22" height="22" rx="5" fill="#f23f43" />
        </svg>
    );
}
