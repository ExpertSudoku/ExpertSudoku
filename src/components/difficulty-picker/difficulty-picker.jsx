import { useEffect, useState } from 'react';

import { DIFFICULTIES } from '../../../shared/difficulties.js';
import { MINI_GRID_PATTERNS } from './mini-grid.js';
import { fetchPuzzleMeta } from '../../lib/api.ts';

import './difficulty-picker.css';

// Each difficulty is its own daily: the row is styled like that daily's
// cartridge label, matching the board images posted to Discord.
const META = {
    medium: { accent: 'Medium', pips: 1, description: 'Singles only. A clean warm-up.' },
    expert: { accent: 'Expert', pips: 2, description: 'Pairs, pointing pairs, box/line reduction.' },
    hell: { accent: 'Hell', pips: 3, description: 'Everything else. Bring coffee.' },
};

// Today's real givens per difficulty, fetched once per page load and shared
// by every picker instance (module-level cache). While loading (or if the
// fetch fails / a difficulty isn't seeded), rows fall back to the
// deterministic placeholder patterns from mini-grid.js.
let cachedGivens = null;
let cachedGivensPromise = null;
function loadTodaysGivens() {
    if (!cachedGivensPromise) {
        cachedGivensPromise = fetchPuzzleMeta().then((meta) => {
            cachedGivens = (!meta.error && meta.givens) ? meta.givens : {};
            return cachedGivens;
        }).catch(() => {
            cachedGivens = {};
            return cachedGivens;
        });
    }
    return cachedGivensPromise;
}

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

// The signature motif: a 9x9 redacted grid. With `givens` (an 81-char digit
// string) it is the SKELETON OF TODAY'S ACTUAL PUZZLE - given cells filled,
// the rest empty; without it, the deterministic placeholder pattern.
// Hovering the row "solves" the remaining cells in the difficulty's colour.
// Rendered as 3x3 blocks of 3x3 cells so the block gaps read like a real
// board.
function MiniGrid({ difficulty, givens }) {
    const fallback = MINI_GRID_PATTERNS[difficulty];
    const isGivenAt = (index) => (givens ? givens[index] !== '0' : fallback[index]);
    return (
        <span className="mini-grid" aria-hidden="true">
            {Array.from({ length: 9 }, (_, block) => (
                <span key={block} className="mini-block">
                    {Array.from({ length: 9 }, (_, cell) => {
                        const row = Math.floor(block / 3) * 3 + Math.floor(cell / 3);
                        const col = (block % 3) * 3 + (cell % 3);
                        const index = row * 9 + col;
                        const isGiven = isGivenAt(index);
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
    const [givensByDifficulty, setGivensByDifficulty] = useState(cachedGivens);
    useEffect(() => {
        let cancelled = false;
        loadTodaysGivens().then((givens) => {
            if (!cancelled) {
                setGivensByDifficulty(givens);
            }
        });
        return () => { cancelled = true; };
    }, []);
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
                                Sudoku
                            </span>
                            {isDone
                                ? <span className="difficulty-description difficulty-done-hint">Already completed today</span>
                                : <span className="difficulty-description">{meta.description}</span>}
                        </span>
                        <MiniGrid difficulty={difficulty} givens={givensByDifficulty?.[difficulty]} />
                    </button>
                );
            })}
        </div>
    );
}
