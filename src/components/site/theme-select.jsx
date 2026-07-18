import { useEffect, useState } from 'react';

import { getThemePref, setThemePref, subscribeTheme } from '../../lib/theme.js';

const OPTIONS = [
    { value: 'light', label: 'Light' },
    { value: 'auto', label: 'Auto' },
    { value: 'dark', label: 'Dark' },
];

export default function ThemeSelect() {
    const [pref, setPref] = useState(getThemePref());
    useEffect(() => subscribeTheme(() => setPref(getThemePref())), []);

    return (
        <div className="theme-select" role="group" aria-label="Theme">
            {OPTIONS.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    aria-pressed={pref === option.value}
                    onClick={() => setThemePref(option.value)}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}
