import { useEffect, useMemo, useState } from 'react';

import App from './app.jsx';
import Spinner from '../spinner/spinner.tsx';
import { modelHelpers } from '../../lib/sudoku-model.js';
import { isDifficulty } from '../../../shared/difficulties.js';
import { navigate } from '../site/site-root.tsx';
import { fetchTodayPuzzle } from '../../lib/api.ts';

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

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const savedState = useMemo(
        () => (puzzleStateKey ? modelHelpers.loadLocalPuzzleState(puzzleStateKey) : null),
        [puzzleStateKey]
    );

    if (!valid) {
        return null;
    }
    if (puzzle === null) {
        return (<div className="site-page"><Spinner /></div>);
    }
    if (puzzle.error === 'no-puzzle') {
        return (
            <div className="site-page">
                <div className="web-play-message">
                    No puzzle available for today yet - check back soon!
                </div>
            </div>
        );
    }
    if (puzzle.error) {
        return (
            <div className="site-page">
                <div className="web-play-message">
                    Something went wrong loading today&apos;s puzzle. Please try again shortly.
                </div>
            </div>
        );
    }

    return (
        <App
            initialDigits={initialDigits}
            difficultyLevel={difficulty}
            savedState={savedState}
            stateAdapter={null}
            onExit={() => navigate('/')}
        />
    );
}
