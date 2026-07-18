import projectPackageJson from '../../../package.json';
import { NavLink } from './site-root.tsx';

// Reuses the legal pages' layout/styles - same column, same card language.
import './legal.css';

const appVersion = projectPackageJson.version || 'unknown';

export default function AboutPage() {
    const thisYear = (new Date()).getFullYear();
    return (
        <div className="site-page legal-page">
            <div className="legal-column">
                <NavLink to="/" className="legal-back-link">&larr; expertsudoku.app</NavLink>
                <h1 className="su-display">About</h1>
                <p>ExpertSudoku is a daily Sudoku game with three difficulties (Medium, Expert,
                Hell), available as a Discord Activity and as a standalone website.</p>
                <p>It is built on the Sudoku engine from <a href="https://sudokuexchange.com/"
                >SudokuExchange.com</a> by <a href="https://grantm.github.io/">Grant McLean</a>, which is{' '}
                <a href="https://www.fsf.org/about/what-is-free-software">free software</a>{' '}
                you can use, copy, modify and share under the terms of the
                GNU Affero General Public License version 3 (<a href="https://opensource.org/licenses/AGPL-3.0"
                >AGPLV3</a>). The original source code is available at:<br />
                <a href="https://github.com/grantm/sudoku-web-app">https://github.com/grantm/sudoku-web-app</a>.</p>
                <p>Application version: {appVersion}</p>
                <p>Copyright © 2020{`-${thisYear}`} Grant McLean and the ExpertSudoku contributors</p>
            </div>
        </div>
    );
}
