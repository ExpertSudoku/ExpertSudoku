import { useState } from 'react';

import { deleteMyData } from '../../lib/api.ts';
import { getCompletedDifficulties } from '../../lib/completions.js';

// Self-service data deletion, shown on the Discord picker screen. Two-step
// confirm (no modal needed), then DELETE /api/me - the session token is the
// account-ownership proof. Local storage is wiped too so the client fully
// forgets the player.
export default function DeleteDataButton({ session }) {
    // 'idle' | 'confirm' | 'busy' | 'done' | 'error'
    const [state, setState] = useState('idle');

    async function run() {
        setState('busy');
        const result = await deleteMyData(session.sessionToken);
        if (result.error) {
            setState('error');
            return;
        }
        try {
            window.localStorage.clear();
        } catch {
            // storage unavailable - server side is what matters
        }
        setState('done');
    }

    if (state === 'done') {
        return (
            <p className="delete-data done">
                Your data has been deleted. Playing again will store it anew.
            </p>
        );
    }
    if (state === 'error') {
        return (
            <p className="delete-data error">
                Deletion failed - please try again or e-mail support@expertsudoku.app.
            </p>
        );
    }
    return (
        <p className="delete-data">
            {state === 'confirm'
                ? <>
                    Really delete your progress, times and profile data?{' '}
                    <button type="button" className="delete-data-confirm" disabled={state === 'busy'} onClick={run}>
                        Yes, delete everything
                    </button>{' '}
                    <button type="button" onClick={() => setState('idle')}>Cancel</button>
                </>
                : <button type="button" onClick={() => setState('confirm')}>Delete my data</button>}
        </p>
    );
}
