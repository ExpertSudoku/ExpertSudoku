import Timer from '../timer/timer';

import './status-bar.css';
import ExitButton from "../buttons/exit-button";
import HelpButton from "../buttons/help-button";
// The exact same segmented Light/Auto/Dark control as the landing masthead.
import ThemeSelect from "../site/theme-select.jsx";
import Pips from "../site/pips.jsx";

const stopPropagation = (e) => e.stopPropagation();

// Per-difficulty daily branding, matching the landing masthead, the picker
// rows, the completion screen and the board images posted to Discord.
const WORDMARKS = {
    medium: { accent: 'Medium', rest: 'Sudoku', pips: 1 },
    expert: { accent: 'Expert', rest: 'Sudoku', pips: 2 },
    hell: { accent: 'Hell', rest: 'Sudoku', pips: 3 },
};

function Wordmark ({ difficulty, puzzleNumber }) {
    const mark = WORDMARKS[difficulty] ?? { accent: 'Expert', rest: 'Sudoku', pips: 2 };
    return (
        <span className={`site-name difficulty-${difficulty}`}>
            <Pips count={mark.pips} className="site-name-pips" />
            <span className="site-name-accent">{mark.accent}</span>
            <span className="site-name-rest">{mark.rest}</span>
            {puzzleNumber
                ? <span className="site-name-number">No.{puzzleNumber}</span>
                : null}
        </span>
    );
}

// Header styled like the landing masthead: wordmark on the left, a row of
// bordered chips (timer + pause, back, help, theme) on the right.
function StatusBar ({
    grid, showTimer, startTime, intervalStartTime, endTime, pausedAt, onPause, onResume, onExit, menuHandler, onSolve, puzzleNumber
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
            <Wordmark difficulty={grid.get('difficultyLevel')} puzzleNumber={puzzleNumber} />
            <div className="status-bar-controls">
                {/* onSolve only exists in development builds - the server
                    never sends the solution to production clients. */}
                {onSolve
                    ? <button type="button" className="dev-solve" title="Dev only: fill in the solution" onClick={onSolve}>SOLVE</button>
                    : null}
                {timer}
                {exitButton}
                <HelpButton menuHandler={menuHandler} />
                <ThemeSelect />
            </div>
        </header>
    );
}

export default StatusBar;
