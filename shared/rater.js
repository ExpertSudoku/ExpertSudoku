// Technique-based Sudoku difficulty rater. Dependency-free (plain JS, no
// imports) so scripts/generate-puzzles.mjs can import it directly under
// plain Node, same as shared/solver.js.
//
// Tier 1 (naked singles + hidden singles) solves it            => 'medium'
// Tier 2 (+ naked/hidden pairs, pointing pairs, box/line claim) => 'expert'
// Neither solves it (but the puzzle is known-unique via brute   => 'hell'
//   force elsewhere, in the generator)

const DIGITS = '123456789'.split('');

function buildUnits() {
    const rowOf = [], colOf = [], boxOf = [];
    for (let i = 0; i < 81; i++) {
        const r = Math.floor(i / 9);
        const c = i % 9;
        rowOf.push(r);
        colOf.push(c);
        boxOf.push(Math.floor(r / 3) * 3 + Math.floor(c / 3));
    }
    const units = [];
    for (let r = 0; r < 9; r++) units.push(rowOf.map((v, i) => v === r ? i : -1).filter(i => i >= 0));
    for (let c = 0; c < 9; c++) units.push(colOf.map((v, i) => v === c ? i : -1).filter(i => i >= 0));
    for (let b = 0; b < 9; b++) units.push(boxOf.map((v, i) => v === b ? i : -1).filter(i => i >= 0));
    return { units, rowOf, colOf, boxOf };
}

const { units: UNITS, rowOf: ROW_OF, colOf: COL_OF, boxOf: BOX_OF } = buildUnits();
const UNITS_FOR_CELL = [];
for (let i = 0; i < 81; i++) {
    UNITS_FOR_CELL.push(UNITS.filter(u => u.includes(i)));
}

function computeCandidates(digits) {
    const cands = new Array(81);
    for (let i = 0; i < 81; i++) {
        cands[i] = digits[i] !== '0' ? null : new Set(DIGITS);
    }
    for (const unit of UNITS) {
        for (const i of unit) {
            if (digits[i] === '0') {
                continue;
            }
            for (const j of unit) {
                if (cands[j]) {
                    cands[j].delete(digits[i]);
                }
            }
        }
    }
    return cands;
}

// Runs naked/hidden singles (tier 1) and, if maxTier >= 2, naked/hidden
// pairs + pointing pairs + box/line claiming, repeatedly until no further
// progress. Returns {digits, techniques, solved}.
function solveWithTechniques(givens, maxTier) {
    const digits = givens.split('');
    const techniques = new Set();
    const cands = computeCandidates(digits);

    function placeDigit(i, d) {
        digits[i] = d;
        cands[i] = null;
        for (const unit of UNITS_FOR_CELL[i]) {
            for (const j of unit) {
                if (cands[j]) {
                    cands[j].delete(d);
                }
            }
        }
    }

    let progress = true;
    while (progress) {
        progress = false;

        // Tier 1a: naked singles
        for (let i = 0; i < 81; i++) {
            if (digits[i] === '0' && cands[i] && cands[i].size === 1) {
                placeDigit(i, [...cands[i]][0]);
                techniques.add('naked-single');
                progress = true;
            }
        }
        if (progress) {
            continue;
        }

        // Tier 1b: hidden singles
        for (const unit of UNITS) {
            for (const d of DIGITS) {
                const cellsWithD = unit.filter(i => digits[i] === '0' && cands[i] && cands[i].has(d));
                if (cellsWithD.length === 1) {
                    placeDigit(cellsWithD[0], d);
                    techniques.add('hidden-single');
                    progress = true;
                }
            }
        }
        if (progress || maxTier < 2) {
            continue;
        }

        // Tier 2a: naked pairs
        for (const unit of UNITS) {
            const emptyCells = unit.filter(i => digits[i] === '0');
            for (let a = 0; a < emptyCells.length; a++) {
                const ci = emptyCells[a];
                if (!cands[ci] || cands[ci].size !== 2) {
                    continue;
                }
                for (let b = a + 1; b < emptyCells.length; b++) {
                    const cj = emptyCells[b];
                    if (!cands[cj] || cands[cj].size !== 2) {
                        continue;
                    }
                    const same = [...cands[ci]].every(d => cands[cj].has(d));
                    if (!same) {
                        continue;
                    }
                    let eliminated = false;
                    for (const k of emptyCells) {
                        if (k === ci || k === cj) {
                            continue;
                        }
                        for (const d of cands[ci]) {
                            if (cands[k].has(d)) {
                                cands[k].delete(d);
                                eliminated = true;
                            }
                        }
                    }
                    if (eliminated) {
                        techniques.add('naked-pair');
                        progress = true;
                    }
                }
            }
        }

        // Tier 2b: hidden pairs
        for (const unit of UNITS) {
            const emptyCells = unit.filter(i => digits[i] === '0');
            for (let a = 0; a < DIGITS.length; a++) {
                const d1 = DIGITS[a];
                const cellsWithD1 = emptyCells.filter(i => cands[i] && cands[i].has(d1));
                if (cellsWithD1.length !== 2) {
                    continue;
                }
                for (let b = a + 1; b < DIGITS.length; b++) {
                    const d2 = DIGITS[b];
                    const cellsWithD2 = emptyCells.filter(i => cands[i] && cands[i].has(d2));
                    if (cellsWithD2.length !== 2 || cellsWithD1[0] !== cellsWithD2[0] || cellsWithD1[1] !== cellsWithD2[1]) {
                        continue;
                    }
                    let eliminated = false;
                    for (const i of cellsWithD1) {
                        for (const d of [...cands[i]]) {
                            if (d !== d1 && d !== d2) {
                                cands[i].delete(d);
                                eliminated = true;
                            }
                        }
                    }
                    if (eliminated) {
                        techniques.add('hidden-pair');
                        progress = true;
                    }
                }
            }
        }

        // Tier 2c: pointing pairs/triples (box confinement -> row/col elimination)
        for (let boxIdx = 0; boxIdx < 9; boxIdx++) {
            const boxCells = UNITS[18 + boxIdx];
            for (const d of DIGITS) {
                const cellsWithD = boxCells.filter(i => digits[i] === '0' && cands[i] && cands[i].has(d));
                if (cellsWithD.length < 2 || cellsWithD.length > 3) {
                    continue;
                }
                const rows = new Set(cellsWithD.map(i => ROW_OF[i]));
                const cols = new Set(cellsWithD.map(i => COL_OF[i]));
                if (rows.size === 1) {
                    const rowCells = UNITS[[...rows][0]];
                    let eliminated = false;
                    for (const i of rowCells) {
                        if (BOX_OF[i] !== boxIdx && digits[i] === '0' && cands[i] && cands[i].has(d)) {
                            cands[i].delete(d);
                            eliminated = true;
                        }
                    }
                    if (eliminated) {
                        techniques.add('pointing');
                        progress = true;
                    }
                }
                if (cols.size === 1) {
                    const colCells = UNITS[9 + [...cols][0]];
                    let eliminated = false;
                    for (const i of colCells) {
                        if (BOX_OF[i] !== boxIdx && digits[i] === '0' && cands[i] && cands[i].has(d)) {
                            cands[i].delete(d);
                            eliminated = true;
                        }
                    }
                    if (eliminated) {
                        techniques.add('pointing');
                        progress = true;
                    }
                }
            }
        }

        // Tier 2d: box/line claiming (row/col confinement -> box elimination)
        for (let u = 0; u < 18; u++) {
            const lineCells = UNITS[u];
            for (const d of DIGITS) {
                const cellsWithD = lineCells.filter(i => digits[i] === '0' && cands[i] && cands[i].has(d));
                if (cellsWithD.length < 2 || cellsWithD.length > 3) {
                    continue;
                }
                const boxes = new Set(cellsWithD.map(i => BOX_OF[i]));
                if (boxes.size === 1) {
                    const boxCells = UNITS[18 + [...boxes][0]];
                    let eliminated = false;
                    for (const i of boxCells) {
                        if (!lineCells.includes(i) && digits[i] === '0' && cands[i] && cands[i].has(d)) {
                            cands[i].delete(d);
                            eliminated = true;
                        }
                    }
                    if (eliminated) {
                        techniques.add('claiming');
                        progress = true;
                    }
                }
            }
        }
    }

    const solved = digits.every(d => d !== '0');
    return { digits: digits.join(''), techniques, solved };
}

export function ratePuzzle(givens) {
    const tier1 = solveWithTechniques(givens, 1);
    if (tier1.solved) {
        return { difficulty: 'medium', techniques: [...tier1.techniques] };
    }
    const tier2 = solveWithTechniques(givens, 2);
    if (tier2.solved) {
        return { difficulty: 'expert', techniques: [...tier2.techniques] };
    }
    return { difficulty: 'hell', techniques: [...tier2.techniques] };
}
