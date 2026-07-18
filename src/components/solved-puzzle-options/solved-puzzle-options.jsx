import { secondsAsHMS } from '../../lib/string-utils';
import DifficultyPicker from '../difficulty-picker/difficulty-picker';

import "./solved-puzzle-options.css";

export default function SolvedPuzzleOptions({elapsedTime, completed, onSwitchDifficulty}) {
    // `completed` = the just-solved difficulty + anything already completed
    // today; those rows render greyed out with a hint.
    const allDone = completed && new Set(completed).size >= 3;
    return (
        <div className="solved-puzzle-options">
            <p className="solved-time">Puzzle solved in {secondsAsHMS(elapsedTime)}</p>
            {onSwitchDifficulty
                ? <>
                    <p className="solved-next">
                        {allDone
                            ? <>That&apos;s all three for today - see you tomorrow!</>
                            : <>Fancy another one?</>}
                    </p>
                    <DifficultyPicker completed={completed} onPick={onSwitchDifficulty} />
                </>
                : null}
        </div>
    )
}
