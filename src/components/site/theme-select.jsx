import { useEffect, useState } from 'react';

import { getThemePref, setThemePref, subscribeTheme } from '../../lib/theme.js';

// Click order: both explicit choices first, then back to following the OS.
const CYCLE = ['light', 'dark', 'auto'];
const LABELS = { light: 'Light', dark: 'Dark', auto: 'Auto' };

export default function ThemeSelect() {
    const [pref, setPref] = useState(getThemePref());
    useEffect(() => subscribeTheme(() => setPref(getThemePref())), []);

    const next = CYCLE[(CYCLE.indexOf(pref) + 1) % CYCLE.length];
    return (
        <button
            type="button"
            className="theme-select"
            title={`Theme: ${LABELS[pref]} — switch to ${LABELS[next]}`}
            aria-label={`Theme: ${LABELS[pref]}. Switch to ${LABELS[next]}.`}
            onClick={() => setThemePref(next)}
        >
            {LABELS[pref]}
        </button>
    );
}
