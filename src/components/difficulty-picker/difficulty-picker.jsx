import { DIFFICULTIES } from '../../../shared/difficulties.js';
import { MINI_GRID_PATTERNS } from './mini-grid.js';

import './difficulty-picker.css';

// Each difficulty is its own daily: the row is styled like that daily's
// cartridge label, matching the board images posted to Discord.
const META = {
    medium: { accent: 'Medium', rest: 'Sudoku', pips: 1, description: 'Singles only. A clean warm-up.' },
    expert: { accent: 'Expert', rest: 'Sudoku', pips: 2, description: 'Pairs, pointing pairs, box/line reduction.' },
    hell: { accent: 'Hell', rest: 'Sudoku', pips: 3, description: 'Everything else. Bring coffee.' },
};

function Pips({ count }) {
    return (
        <span className="difficulty-pips" aria-hidden="true">
            {Array.from({ length: count }, (_, i) => (
                <svg key={i} viewBox="0 0 12 12" className="difficulty-pip">
                    <path d="M 6 0 L 12 6 L 6 12 L 0 6 Z" />
                </svg>
            ))}
        </span>
    );
}

// The signature motif: a 9x9 redacted grid whose given-cell density is the
// real difference between the difficulties. Hovering the row "solves" the
// remaining cells in the difficulty's colour, back-to-front stagger on
// leave. Rendered as 3x3 blocks of 3x3 cells so the block gaps read like a
// real board.
function MiniGrid({ difficulty }) {
    const pattern = MINI_GRID_PATTERNS[difficulty];
    return (
        <span className="mini-grid" aria-hidden="true">
            {Array.from({ length: 9 }, (_, block) => (
                <span key={block} className="mini-block">
                    {Array.from({ length: 9 }, (_, cell) => {
                        const row = Math.floor(block / 3) * 3 + Math.floor(cell / 3);
                        const col = (block % 3) * 3 + (cell % 3);
                        const index = row * 9 + col;
                        const isGiven = pattern[index];
                        return (
                            <span
                                key={cell}
                                className={isGiven ? 'mini-cell is-given' : 'mini-cell'}
                                style={isGiven ? undefined : { transitionDelay: `${index * 7}ms` }}
                            />
                        );
                    })}
                </span>
            ))}
        </span>
    );
}

// `completed` (optional): a difficulty or array of difficulties already
// completed today (src/lib/completions.js) - those rows stay visible but
// are greyed out, disabled, and show a "completed" hint instead of their
// description.
export default function DifficultyPicker({ onPick, completed }) {
    const done = completed ? [].concat(completed) : [];
    return (
        <div className="difficulty-picker">
            {DIFFICULTIES.map((difficulty) => {
                const meta = META[difficulty];
                const isDone = done.includes(difficulty);
                return (
                    <button
                        key={difficulty}
                        type="button"
                        className={`difficulty-row difficulty-${difficulty}${isDone ? ' is-completed' : ''}`}
                        disabled={isDone}
                        onClick={() => onPick(difficulty)}
                    >
                        <span className="difficulty-info">
                            <Pips count={meta.pips} />
                            <span className="difficulty-name">
                                <span className="difficulty-name-accent">{meta.accent}</span>
                                {meta.rest}
                            </span>
                            {isDone
                                ? <span className="difficulty-description difficulty-done-hint">Already completed today</span>
                                : <span className="difficulty-description">{meta.description}</span>}
                        </span>
                        <MiniGrid difficulty={difficulty} />
                    </button>
                );
            })}
        </div>
    );
}
