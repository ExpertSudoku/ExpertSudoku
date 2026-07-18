import { useCallback } from 'react';

import ButtonIcon from '../svg-sprites/button-icon';

export default function ExitButton({onExit}) {
    const clickHandler = useCallback(
        e => {
            e.preventDefault();
            onExit();
        },
        [onExit]
    );

    return (
        <button id="exit-btn" type="button" title="Back to difficulty picker" onClick={clickHandler}>
            <ButtonIcon name="exit" />
        </button>
    )
}
