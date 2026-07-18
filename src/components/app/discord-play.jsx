import { useEffect, useMemo, useState } from 'react';

import App from './app.jsx';
import Spinner from '../spinner/spinner.tsx';
import DifficultyPicker from '../difficulty-picker/difficulty-picker.jsx';
import { fetchTodayPuzzle, fetchProgress } from '../../lib/api.ts';
import { createServerAdapter } from '../../lib/save-adapter.js';
import { recordCompletion, getCompletedDifficulties } from '../../lib/completions.js';

// Each difficulty is its own daily brand, matching the picker rows and the
// board images posted to Discord.
const NAMES = {
    medium: 'MediumSudoku',
    expert: 'ExpertSudoku',
    hell: 'HellSudoku',
};

function formatMMSS(totalSeconds) {
    const m = Math.floor(totalSeconds / 60);
    const s = Math.floor(totalSeconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
}

export default function DiscordPlay({ difficulty, session, onExit, onSwitchDifficulty }) {
    // null = loading, {puzzle, progress} = loaded, {error} = failed
    const [data, setData] = useState(null);
    // null = not completed; {seconds} once solved (either restored from the
    // server on rejoin, or detected live via the save adapter below) - the
    // SAME completion screen shows in both cases.
    const [completed, setCompleted] = useState(null);

    useEffect(() => {
        let cancelled = false;
        setData(null);
        setCompleted(null);
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
                    const seconds = progress.completionSeconds
                        ?? Math.floor((progress.state?.elapsedTime ?? 0) / 1000);
                    setCompleted({ seconds });
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
                // Live completion detection: swap to the completion screen
                // (the same one shown on rejoin) as soon as the grid solves.
                if (grid.get('solved')) {
                    setCompleted((prev) => prev ?? { seconds: Math.floor((puzzleState.elapsedTime ?? 0) / 1000) });
                }
            },
            destroy: () => adapter.destroy(),
        };
    }, [session.sessionToken, difficulty]);
    useEffect(() => () => stateAdapter.destroy(), [stateAdapter]);

    // Mirror completions into the client-side record (src/lib/completions.js)
    // so difficulty pickers can hide already-finished difficulties without a
    // server round-trip.
    const day = (data && !data.error) ? data.puzzle.day : null;
    useEffect(() => {
        if (completed && day) {
            recordCompletion(day, difficulty);
        }
    }, [completed, day, difficulty]);

    if (data === null) {
        return (<div className="site-page"><Spinner /></div>);
    }
    if (data.error === 'no-puzzle') {
        return (
            <div className="site-page">
                <div className="web-play-message">
                    No puzzle available for today yet - check back soon!
                </div>
            </div>
        );
    }
    if (data.error) {
        return (
            <div className="site-page">
                <div className="web-play-message">
                    Something went wrong loading today&apos;s puzzle. Please try again shortly.
                </div>
            </div>
        );
    }

    if (completed) {
        return (
            <div className="site-page completion-screen">
                <div className="completion-card">
                    <p className="completion-eyebrow">Solved</p>
                    <h1 className="completion-title">
                        {NAMES[difficulty] ?? difficulty}
                        {completed.seconds
                            ? <> in <span className="completion-time">{formatMMSS(completed.seconds)}</span></>
                            : null}
                    </h1>
                    <p className="completion-next">Fancy another one?</p>
                    <DifficultyPicker
                        completed={[difficulty, ...getCompletedDifficulties(day)]}
                        onPick={onSwitchDifficulty ?? onExit}
                    />
                </div>
            </div>
        );
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
