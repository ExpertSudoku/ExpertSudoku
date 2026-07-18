import { useEffect, useMemo, useState } from 'react';

import App from './app.jsx';
import LoadingPage from '../site/loading-page.jsx';
import PlayError from '../site/play-error.jsx';
import { fetchTodayPuzzle, fetchProgress } from '../../lib/api.ts';
import { createServerAdapter } from '../../lib/save-adapter.js';
import { recordCompletion, getCompletedDifficulties } from '../../lib/completions.js';

export default function DiscordPlay({ difficulty, session, onExit, onSwitchDifficulty }) {
    // null = loading, {puzzle, progress} = loaded, {error} = failed
    const [data, setData] = useState(null);
    // Tracked only to mirror completions into the client-side record - the
    // UI no longer branches on it: a completed puzzle renders the App with
    // the restored SOLVED BOARD (plus the post-solve panel), so players can
    // revisit their solution at any time.
    const [completed, setCompleted] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setData(null);
        setCompleted(false);
        Promise.all([
            fetchTodayPuzzle(difficulty),
            fetchProgress(session.sessionToken, difficulty),
        ]).then(([puzzle, progress]) => {
            if (cancelled) {
                return;
            }
            if (puzzle.error) {
                setData({ error: puzzle.error });
            } else if (progress.error) {
                setData({ error: progress.error });
            } else {
                setData({ puzzle, progress });
                if (progress.completedAt) {
                    setCompleted(true);
                }
            }
        });
        return () => { cancelled = true; };
    }, [difficulty, session.sessionToken]);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const stateAdapter = useMemo(() => {
        const adapter = createServerAdapter(session.sessionToken, difficulty);
        return {
            save(puzzleState, grid) {
                adapter.save(puzzleState, grid);
                if (grid.get('solved')) {
                    setCompleted(true);
                }
            },
            destroy: () => adapter.destroy(),
        };
    }, [session.sessionToken, difficulty]);
    useEffect(() => () => stateAdapter.destroy(), [stateAdapter]);

    // Mirror completions into the client-side record (src/lib/completions.js)
    // so difficulty pickers can grey out already-finished difficulties
    // without a server round-trip.
    const day = (data && !data.error) ? data.puzzle.day : null;
    useEffect(() => {
        if (completed && day) {
            recordCompletion(day, difficulty);
        }
    }, [completed, day, difficulty]);

    if (data === null) {
        return (<LoadingPage />);
    }
    if (data.error) {
        return (<PlayError error={data.error} />);
    }

    return (
        <App
            initialDigits={data.puzzle.givens}
            difficultyLevel={difficulty}
            puzzleNumber={data.puzzle.number}
            savedState={data.progress.state}
            stateAdapter={stateAdapter}
            onExit={onExit}
            onSwitchDifficulty={onSwitchDifficulty ?? onExit}
            completedDifficulties={getCompletedDifficulties(day)}
            devSolution={data.puzzle.solution}
        />
    );
}
