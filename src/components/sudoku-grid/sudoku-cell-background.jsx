function cellHasPencilledDigit(cell, d, simplePencilMarking) {
    return cell.get('innerPencils').includes(d) || (!simplePencilMarking && cell.get('outerPencils').includes(d));
}

export default function SudokuCellBackground({cell, dim, cellSize, cellInset, cellRadius, matchDigit, simplePencilMarking}) {
    const bgColorCode = cell.get('colorCode');
    const bgClasses = [ 'cell-bg' ];
    if (cell.get('isGiven')) {
        bgClasses.push('given');
    }
    if (cell.get('isSelected')) {
        bgClasses.push('selected');
    }
    if (cell.get('errorMessage') !== undefined) {
        bgClasses.push('error');
    }
    const digit = cell.get('digit')
    if (matchDigit !== '0') {
        if (digit === matchDigit || (cellHasPencilledDigit(cell, matchDigit, simplePencilMarking))) {
            bgClasses.push('matched');
        }
    }
    // Rounded, inset rects: cells read as separate tiles with the page
    // colour showing through the gaps - the same cell language as the
    // landing page mini grids and the Discord board images. The overlay
    // rect (selection/match/error fills) shares the geometry so state
    // highlights stay within the rounded tile.
    const rectProps = {
        x: dim.x + cellInset,
        y: dim.y + cellInset,
        width: cellSize - 2 * cellInset,
        height: cellSize - 2 * cellInset,
        rx: cellRadius,
    };
    return (
        <g className={bgClasses.join(' ')}
            data-cell-index={dim.index}
            data-row={dim.row}
            data-col={dim.col}
            data-box={dim.box}
            data-ring={dim.ring}
        >
            <rect className={`color-code-${bgColorCode}`} {...rectProps} />
            <rect className="cell-select-match-overlay" {...rectProps} />
        </g>
    );
}
