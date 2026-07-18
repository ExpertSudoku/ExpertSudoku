import { useCallback } from 'react';

import ButtonIcon from '../svg-sprites/button-icon';

export default function PauseButton({isPaused, onPause, onResume}) {
    const clickHandler = useCallback(
        e => {
            e.preventDefault();
            if (isPaused) {
                onResume();
            }
            else {
                onPause();
            }
        },
        [isPaused, onPause, onResume]
    );

    return (
        <button id="pause-btn" type="button" title={isPaused ? 'Resume' : 'Pause'} onClick={clickHandler}>
            <ButtonIcon name={isPaused ? 'play' : 'pause'} />
        </button>
    )
}
