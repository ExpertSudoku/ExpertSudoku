#!/usr/bin/env node
// Generates + grades Sudoku puzzles ahead of time and writes a D1-idempotent
// seed.sql file. Run with `npm run seed:generate -- --start 2026-07-20 --days 3`
// then apply with `npm run seed:local` / `npm run seed:remote`.
//
// Usage: node scripts/generate-puzzles.mjs --start YYYY-MM-DD --days N [--out seed.sql]
//
// Generation strategy: build a full solved grid, then carve givens out one
// cell at a time (in random order), checking after every successful removal
// (a) whether the grid still has a unique solution (brute force, bounded
// timeout - a timeout is treated as "not proven unique" and the cell is put
// back) and (b) how shared/rater.js currently rates it. The rater is
// authoritative for difficulty - a single carve pass naturally sweeps
// through medium -> expert -> hell as clues are removed, so one pass often
// yields checkpoints for more than one difficulty; the best (fewest-clue)
// checkpoint seen for each difficulty is kept. Repeat with fresh solved
// grids, accumulating checkpoints, until every difficulty needed for the
// day has one.

import { writeFileSync } from 'node:fs';
import { findSolutions, tryCandidates } from '../shared/solver.js';
import { ratePuzzle } from '../shared/rater.js';
import { DIFFICULTIES } from '../shared/difficulties.js';

// Solver timeouts are capped hard: a single uniqueness check almost never
// legitimately needs more than a fraction of a second; anything slower is
// worth aborting and moving on rather than letting one unlucky check blow
// the whole run's time budget.
const SOLVE_GRID_TIMEOUT_MS = 500;
const UNIQUENESS_CHECK_TIMEOUT_MS = 150;
const MAX_GRID_ATTEMPTS_PER_DAY = 80;

// Clue-count targets are only a *preference* for picking among
// same-difficulty checkpoints (nicer for players - e.g. a 'medium' puzzle
// that still looks reasonably full) - the rater's classification is what
// actually decides the difficulty label, per the plan.
const CLUE_TARGETS = {
    medium: { min: 34, max: 40 },
    expert: { min: 28, max: 32 },
    hell: { min: 22, max: 26 },
};

function clueCountScore(difficulty, clueCount) {
    const { min, max } = CLUE_TARGETS[difficulty];
    if (clueCount >= min && clueCount <= max) {
        return 0;
    }
    return clueCount < min ? (min - clueCount) : (clueCount - max);
}

function parseArgs(argv) {
    const args = { days: 1, out: 'seed.sql' };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--start') {
            args.start = argv[++i];
        } else if (a === '--days') {
            args.days = parseInt(argv[++i], 10);
        } else if (a === '--out') {
            args.out = argv[++i];
        }
    }
    if (!args.start) {
        args.start = new Date().toISOString().slice(0, 10);
    }
    return args;
}

function addDays(dayString, n) {
    const d = new Date(dayString + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
}

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function generateSolvedGrid() {
    // Random-order backtracking from an empty grid finds a full solution
    // almost immediately in practice; a couple of retries is cheap
    // insurance against an unlucky timeout.
    for (let attempt = 0; attempt < 5; attempt++) {
        const digits = new Array(81).fill('0');
        const state = {
            findAll: false,
            shuffle: true,
            solutions: [],
            iterations: 0,
            maxTime: Date.now() + SOLVE_GRID_TIMEOUT_MS,
        };
        tryCandidates(digits, state, 0);
        if (state.solutions.length > 0) {
            return state.solutions[0].split('');
        }
    }
    throw new Error('Failed to generate a solved grid (unexpected - please retry)');
}

// Carves one solved grid down cell-by-cell (random order), recording the
// best (closest-to-target-clue-count, see clueCountScore) unique-solution
// checkpoint seen for a single target difficulty tier along the way.
// Returns null if that tier was never reached, or {givens, clueCount, ratingInfo}.
function carveForDifficulty(solution, targetDifficulty) {
    const digits = [...solution];
    const order = shuffle([...Array(81).keys()]);
    let best = null;
    let clueCount = 81;

    for (const i of order) {
        const removed = digits[i];
        digits[i] = '0';
        const result = findSolutions(digits, { timeout: UNIQUENESS_CHECK_TIMEOUT_MS });
        if (!result.uniqueSolution) {
            digits[i] = removed;
            continue;
        }
        clueCount -= 1;
        const givens = digits.join('');
        const rating = ratePuzzle(givens);
        if (rating.difficulty !== targetDifficulty) {
            continue;
        }
        const newScore = clueCountScore(targetDifficulty, clueCount);
        if (!best || newScore < clueCountScore(targetDifficulty, best.clueCount)) {
            best = { givens, clueCount, ratingInfo: rating };
        }
    }
    return best;
}

// One puzzle per difficulty for a single day. Each difficulty is generated
// from its own independent solved grids (never shared with another
// difficulty's search) so that, e.g., a player who solves the day's
// 'medium' puzzle doesn't thereby learn the day's 'hell' solution.
function generateDayPuzzles(neededDifficulties) {
    const found = {};
    let totalAttempts = 0;
    for (const difficulty of neededDifficulties) {
        let attempts = 0;
        while (!found[difficulty] && attempts < MAX_GRID_ATTEMPTS_PER_DAY) {
            attempts++;
            totalAttempts++;
            const solution = generateSolvedGrid();
            const candidate = carveForDifficulty(solution, difficulty);
            if (candidate) {
                found[difficulty] = { ...candidate, solution: solution.join('') };
            }
        }
        if (!found[difficulty]) {
            throw new Error(
                `Could not generate a '${difficulty}' puzzle after ${MAX_GRID_ATTEMPTS_PER_DAY} `
                + `solved-grid attempts. Try running again (generation is randomized) - this should be rare.`
            );
        }
    }
    return { found, attempts: totalAttempts };
}

function sqlEscape(str) {
    return str.replace(/'/g, "''");
}

function main() {
    const args = parseArgs(process.argv.slice(2));
    const lines = [];
    lines.push(`-- Generated by scripts/generate-puzzles.mjs`);
    lines.push(`-- start=${args.start} days=${args.days}`);
    lines.push('');

    for (let dayOffset = 0; dayOffset < args.days; dayOffset++) {
        const day = addDays(args.start, dayOffset);
        const t0 = Date.now();
        const { found, attempts } = generateDayPuzzles(DIFFICULTIES);
        for (const difficulty of DIFFICULTIES) {
            const { givens, solution, clueCount, ratingInfo } = found[difficulty];
            process.stderr.write(
                `${day} / ${difficulty}: ${clueCount} givens, techniques=[${ratingInfo.techniques.join(',')}]\n`
            );
            const ratingJson = sqlEscape(JSON.stringify(ratingInfo));
            lines.push(
                `INSERT OR IGNORE INTO puzzles (day, difficulty, givens, solution, rating_info) VALUES `
                + `('${day}', '${difficulty}', '${givens}', '${solution}', '${ratingJson}');`
            );
        }
        process.stderr.write(`${day}: done in ${Date.now() - t0}ms (${attempts} solved-grid attempts)\n`);
    }

    writeFileSync(args.out, lines.join('\n') + '\n');
    process.stderr.write(`Wrote ${args.out}\n`);
}

main();
