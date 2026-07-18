import { useEffect, useMemo, useState } from 'react';

import App from './app.jsx';
import LoadingPage from '../site/loading-page.jsx';
import PlayError from '../site/play-error.jsx';
import { modelHelpers } from '../../lib/sudoku-model.js';
import { isDifficulty } from '../../../shared/difficulties.js';
import { navigate } from '../site/site-root.tsx';
import { fetchTodayPuzzle } from '../../lib/api.ts';
import { recordCompletion, getCompletedDifficulties } from '../../lib/completions.js';

export default function WebPlay() {
    const params = new URLSearchParams(window.location.search);
    const difficulty = params.get('difficulty');
    const valid = isDifficulty(difficulty);

    // null = loading, {givens,...} = loaded, {error} = failed
    const [puzzle, setPuzzle] = useState(null);

    useEffect(() => {
        if (!valid) {
            navigate('/');
            return;
        }
        let cancelled = false;
        setPuzzle(null);
        fetchTodayPuzzle(difficulty).then((result) => {
            if (!cancelled) {
                setPuzzle(result);
            }
        });
        return () => { cancelled = true; };
    }, [valid, difficulty]);

    const initialDigits = (puzzle && !puzzle.error) ? puzzle.givens : null;
    const puzzleStateKey = initialDigits ? ('save-' + initialDigits) : null;
    const day = (puzzle && !puzzle.error) ? puzzle.day : null;

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const savedState = useMemo(
        () => (puzzleStateKey ? modelHelpers.loadLocalPuzzleState(puzzleStateKey) : null),
        [puzzleStateKey]
    );

    // No server calls on the website - this adapter only maintains the
    // client-side completion record used to filter the difficulty pickers.
    const stateAdapter = useMemo(
        () => (day ? {
            save(puzzleState, grid) {
                if (grid.get('solved')) {
                    recordCompletion(day, difficulty);
                }
            },
        } : null),
        [day, difficulty]
    );

    if (!valid) {
        return null;
    }
    if (puzzle === null) {
        return (<LoadingPage />);
    }
    if (puzzle.error) {
        return (<PlayError error={puzzle.error} />);
    }

    return (
        <App
            initialDigits={initialDigits}
            difficultyLevel={difficulty}
            puzzleNumber={puzzle.number}
            savedState={savedState}
            stateAdapter={stateAdapter}
            onExit={() => navigate('/')}
            onSwitchDifficulty={(next) => navigate(`/play?difficulty=${next}`)}
            completedDifficulties={getCompletedDifficulties(day)}
            devSolution={puzzle.solution}
        />
    );
}
