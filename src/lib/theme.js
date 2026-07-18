// Single authority for the light/dark/auto theme, shared by the landing
// page selector and the in-game theme button.
//
// Effective theme is applied as:
//  - documentElement 'light'/'dark' class -> shell tokens (site-theme.css)
//    and the pre-hydration background (index.html sets the same class in an
//    inline head script so there is no flash before the bundle runs)
//  - body 'dark' class -> the game's `:root .dark` variable set
//
// 'auto' follows prefers-color-scheme and live-updates when the OS theme
// changes. A `?theme=` URL param overrides (without persisting) - used for
// headless screenshot verification.

const STORAGE_KEY = 'expertsudoku-theme';
const PREFS = ['light', 'dark', 'auto'];

const media = window.matchMedia('(prefers-color-scheme: dark)');
const listeners = new Set();
let urlOverride = null;

export function getThemePref() {
    if (urlOverride) {
        return urlOverride;
    }
    try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (PREFS.includes(stored)) {
            return stored;
        }
    } catch {
        // ignore storage errors
    }
    return 'auto';
}

function effectiveTheme() {
    const pref = getThemePref();
    return pref === 'auto' ? (media.matches ? 'dark' : 'light') : pref;
}

export function applyTheme() {
    const effective = effectiveTheme();
    document.documentElement.classList.toggle('light', effective === 'light');
    document.documentElement.classList.toggle('dark', effective === 'dark');
    document.body.classList.toggle('dark', effective === 'dark');
    listeners.forEach((cb) => cb());
}

export function setThemePref(pref) {
    if (!PREFS.includes(pref)) {
        return;
    }
    urlOverride = null;
    try {
        window.localStorage.setItem(STORAGE_KEY, pref);
    } catch {
        // ignore storage errors
    }
    applyTheme();
}

// Returns an unsubscribe function (usable directly as a useEffect cleanup).
export function subscribeTheme(cb) {
    listeners.add(cb);
    return () => listeners.delete(cb);
}

export function initTheme() {
    const param = new URLSearchParams(window.location.search).get('theme');
    if (PREFS.includes(param)) {
        urlOverride = param;
    }
    media.addEventListener('change', () => {
        if (getThemePref() === 'auto') {
            applyTheme();
        }
    });
    applyTheme();
}
