import { useEffect, useState } from 'react';

// Live HH:MM:SS countdown until the next UTC midnight - i.e. how long the
// current daily sudokus remain available. Pure client-clock math: the server
// still decides which day's puzzle is served (the countdown is cosmetic and
// merely as accurate as the visitor's clock).
function msUntilNextUtcDay(now = new Date()) {
    const nextMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
    return Math.max(0, nextMidnight - now.getTime());
}

function format(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export default function DayCountdown() {
    const [remaining, setRemaining] = useState(() => msUntilNextUtcDay());
    useEffect(() => {
        const interval = setInterval(() => setRemaining(msUntilNextUtcDay()), 1000);
        return () => clearInterval(interval);
    }, []);
    return <span className="day-countdown">{format(remaining)}</span>;
}
