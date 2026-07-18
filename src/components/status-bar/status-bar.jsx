import Timer from '../timer/timer';

import './status-bar.css';
import ExitButton from "../buttons/exit-button";
import HelpButton from "../buttons/help-button";
// The exact same segmented Light/Auto/Dark control as the landing masthead.
import ThemeSelect from "../site/theme-select.jsx";

const stopPropagation = (e) => e.stopPropagation();

// Per-difficulty daily branding, matching the landing masthead, the picker
// rows, the completion screen and the board images posted to Discord.
const WORDMARKS = {
    medium: { accent: 'Medium', rest: 'Sudoku', pips: 1 },
    expert: { accent: 'Expert', rest: 'Sudoku', pips: 2 },
    hell: { accent: 'Hell', rest: 'Sudoku', pips: 3 },
};

function Pips ({ count }) {
    return (
        <span className="site-name-pips" aria-hidden="true">
            {Array.from({ length: count }, (_, i) => (
                <svg key={i} viewBox="0 0 12 12">
                    <path d="M 6 0 L 12 6 L 6 12 L 0 6 Z" />
                </svg>
            ))}
        </span>
    );
}

function Wordmark ({ difficulty }) {
    const mark = WORDMARKS[difficulty] ?? { accent: 'Expert', rest: 'Sudoku', pips: 2 };
    return (
        <span className={`site-name difficulty-${difficulty}`}>
            <Pips count={mark.pips} />
            <span className="site-name-accent">{mark.accent}</span>
            <span className="site-name-rest">{mark.rest}</span>
        </span>
    );
}

// Header styled like the landing masthead: wordmark on the left, a row of
// bordered chips (timer + pause, back, help, theme) on the right.
function StatusBar ({
    grid, showTimer, startTime, intervalStartTime, endTime, pausedAt, onPause, onResume, onExit, menuHandler
}) {
    const timer = showTimer
        ? (
            <Timer
                startTime={startTime}
                intervalStartTime={intervalStartTime}
                endTime={endTime}
                pausedAt={pausedAt}
                onPause={onPause}
                onResume={onResume}
            />
        )
        : null;
    const exitButton = onExit ? <ExitButton onExit={onExit} /> : null;
    return (
        <header className="status-bar" onMouseDown={stopPropagation}>
            <Wordmark difficulty={grid.get('difficultyLevel')} />
            <div className="status-bar-controls">
                {timer}
                {exitButton}
                <HelpButton menuHandler={menuHandler} />
                <ThemeSelect />
            </div>
        </header>
    );
}

export default StatusBar;
