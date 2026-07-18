import { useCallback } from 'react';

// Opens the game instructions (the help page modal).
export default function HelpButton ({menuHandler}) {
    const clickHandler = useCallback(
        e => {
            e.preventDefault();
            menuHandler('show-help-page');
        },
        [menuHandler]
    );

    return (
        <button type="button" title="How to play" onClick={clickHandler}>
            <span className="help-qmark" aria-hidden="true">?</span>
            <span className="visually-hidden">How to play</span>
        </button>
    )
}
