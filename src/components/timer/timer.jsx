import { useState, useEffect } from 'react';

import { secondsAsHMS } from '../../lib/string-utils';

import './timer.css';

import PauseButton from '../buttons/pause-button';

function ElapsedTime ({intervalStartTime, endTime, pausedAt}) {
    const [tickNow, setTickNow] = useState(Date.now());

    useEffect(() => {
        if (!endTime) {
            const timer = setTimeout(() => {
                setTickNow(Date.now());
            }, 1001 - (Date.now() % 1000));
            return () => { clearTimeout(timer); }
        }
    });

    const seconds = Math.floor(((endTime || pausedAt || tickNow) - intervalStartTime) / 1000);

    return (
        <span className="elapsed-time">{secondsAsHMS(seconds)}</span>
    );
}

function Timer({startTime, intervalStartTime, endTime, pausedAt, onPause, onResume}) {
    if (!startTime) {
        return null;
    }
    const pauseButton = (onPause && onResume && !endTime)
        ? <PauseButton isPaused={!!pausedAt} onPause={onPause} onResume={onResume} />
        : null;
    return <div id="timer">
        <ElapsedTime intervalStartTime={intervalStartTime} endTime={endTime} pausedAt={pausedAt} />
        {pauseButton}
    </div>;
}

export default Timer;
