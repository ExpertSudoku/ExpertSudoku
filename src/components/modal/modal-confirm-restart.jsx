export default function ModalConfirmRestart({modalHandler, solved}) {
    const cancelHandler = () => modalHandler('cancel');
    const restartHandler = () => modalHandler('restart-confirmed');
    return (
        <div className="modal confirm-restart">
            <h1>Reset the puzzle?</h1>
            {
                solved
                    ? (
                        <p>Are you sure you wish to reset the puzzle?</p>
                    )
                    : (
                        <p>This removes every digit, pencil-mark and colour
                        highlight you&apos;ve entered. There is no undo.</p>
                    )
            }
            <div className="buttons">
                <button className="cancel" onClick={cancelHandler}>Cancel</button>
                <button className="danger" onClick={restartHandler} autoFocus>Reset</button>
            </div>
        </div>
    )
}
