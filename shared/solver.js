// Pure, dependency-free Sudoku solver shared between the client (sudoku-model.js),
// the seed-generation script (scripts/generate-puzzles.mjs, run under plain Node)
// and the rater (shared/rater.js). No imports here on purpose: this file must be
// importable from Node without pulling in any browser or Immutable-ish machinery.
//
// `digits` is always a plain array (or array-like) of 81 single-character strings
// '0'..'9' ('0' = empty).

const [cellSet] = initCellSets();

function initCellSets() {
    const row = {}, col = {}, box = {};
    for (let i = 1; i <= 9; i++) {
        row[i] = [];
        col[i] = [];
        box[i] = [];
    }
    const cellProp = [];
    for (let i = 0; i < 81; i++) {
        const r = Math.floor(i / 9) + 1;
        const c = (i % 9) + 1;
        const b = Math.floor((r - 1) / 3) * 3 + Math.floor((c - 1) / 3) + 1;
        cellProp[i] = { row: r, col: c, box: b };
        row[r].push(i);
        col[c].push(i);
        box[b].push(i);
    }
    return [ {row, col, box}, cellProp ];
}

export function findCandidatesForCell(digits, i) {
    const candidates = '0123456789'.split('');
    const digitBase = '0'.charCodeAt(0);
    const r = Math.floor(i / 9) + 1;
    const c = (i % 9) + 1;
    const b = Math.floor((r - 1) / 3) * 3 + Math.floor((c - 1) / 3) + 1;
    [ cellSet.row[r], cellSet.col[c], cellSet.box[b] ].flat().forEach(j => {
        const d = digits[j] || '0';
        if (d !== '0') {
            const index = d.charCodeAt(0) - digitBase;
            candidates[index] = '0';
        }
    });
    return candidates.filter(d => d !== '0');
}

function shuffleArray(arr) {
    // Fisher-Yates
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

export function tryCandidates(digits, state, cellIndex) {
    state.iterations++;
    if (cellIndex === 81) {
        state.solutions.push(digits.join(''));
        return;
    }
    if (state.timedOut) {
        return;
    }
    if ((state.iterations % 10000) === 0) {
        if (Date.now() > state.maxTime) {
            state.timedOut = true;
            return;
        }
    }
    if (digits[cellIndex] !== '0') {
        tryCandidates(digits, state, cellIndex + 1);
        return;
    }
    let candidates = findCandidatesForCell(digits, cellIndex);
    if (state.shuffle) {
        candidates = shuffleArray(candidates);
    }
    candidates.forEach(d => {
        if (!state.findAll && state.solutions.length > 1) {
            return;
        }
        digits[cellIndex] = d;
        tryCandidates(digits, state, cellIndex + 1);
    });
    digits[cellIndex] = '0';
    return;
}

export function findSolutions(digits, userOpt) {
    const opt = {findAll: false, shuffle: false, ...userOpt};
    const state = {
        findAll: opt.findAll,
        shuffle: opt.shuffle,
        solutions: [],
        iterations: 0,
        maxTime: Date.now() + (opt.timeout || 3000),
    };
    const givensCount = digits.filter(d => d !== '0').length;
    if (givensCount < 17) {
        return {
            solutions: [],
            uniqueSolution: false,
            error: 'This arrangement may not have a unique solution',
        };
    }
    tryCandidates(digits, state, 0);
    const solutions = state.solutions;
    const result = {
        solutions: solutions,
        uniqueSolution: false,
    };
    if (solutions.length === 1  && !state.timedOut) {
        result.uniqueSolution = true;
        result.finalDigits = solutions[0];
    }
    else if (solutions.length > 1 ) {
        result.error = 'This arrangement does not have a unique solution';
    }
    else if (state.timedOut) {
        result.error = 'The solver timed out while checking for a unique solution';
    }
    else {
        result.error = 'This arrangement does not have a solution';
    }
    return result;
}
