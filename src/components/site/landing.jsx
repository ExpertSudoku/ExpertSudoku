import { useEffect, useState } from 'react';

import DayCountdown from './day-countdown.jsx';
import DifficultyPicker from '../difficulty-picker/difficulty-picker.jsx';
import LogoMark from './logo-mark.jsx';
import ThemeSelect from './theme-select.jsx';
import { navigate, NavLink } from './site-root.tsx';
import { fetchPuzzleMeta } from '../../lib/api.ts';
import { getCompletedDifficulties } from '../../lib/completions.js';

import './landing.css';

export default function Landing() {
    const onPick = (difficulty) => navigate(`/play?difficulty=${difficulty}`);
    // Difficulties already completed today are hidden from the picker. The
    // current day comes from the server (/api/puzzle/meta) - until it loads
    // (or if it fails), everything is shown.
    const [completed, setCompleted] = useState([]);
    useEffect(() => {
        let cancelled = false;
        fetchPuzzleMeta().then((meta) => {
            if (!cancelled && !meta.error) {
                setCompleted(getCompletedDifficulties(meta.day));
            }
        });
        return () => { cancelled = true; };
    }, []);
    const allDone = completed.length >= 3;
    return (
        <div className="site-page landing">
            <div className="landing-column">
                <header className="landing-masthead">
                    <LogoMark size={22} />
                    <span className="landing-domain">expertsudoku.app</span>
                    <ThemeSelect />
                </header>

                <h1 className="su-display landing-title">
                    One grid a day.
                    <br />
                    Pick your pain.
                </h1>

                {allDone
                    ? (
                        <p className="landing-alldone">
                            All three solved for today. New puzzles in <DayCountdown /> <br />
                            see you tomorrow!
                        </p>
                    )
                    : null}

                <DifficultyPicker onPick={onPick} completed={completed} />

                <p className="landing-meta">
                    Everyone plays the same grid. Today&apos;s puzzles rotate in <DayCountdown />.
                </p>

                <p className="landing-note">
                    Playing on Discord? Launch the <strong>Activity</strong> from a channel to
                    share live (spoiler-free) progress and build a streak with your server.
                </p>

                <footer className="landing-footer">
                    <NavLink to="/about">About</NavLink>
                    <NavLink to="/imprint">Imprint</NavLink>
                    <NavLink to="/privacy">Privacy</NavLink>
                    <NavLink to="/terms">Terms</NavLink>
                </footer>
            </div>
        </div>
    );
}
