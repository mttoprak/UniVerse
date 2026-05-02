"use client";

import { useState, useEffect } from 'react';

// made optional (?) to prevent crashes if data is missing during initial load
interface CountdownTimerProps {
    expiresAt?: string;
}

export default function CountdownTimer({ expiresAt }: CountdownTimerProps) {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        // safety check: if no date is provided yet do not attempt to calculate
        if (!expiresAt) {
            setTimeLeft("...");
            return;
        }

        const calculateTimeLeft = () => {
            const difference = new Date(expiresAt).getTime() - new Date().getTime();

            if (difference <= 0) return "SÜRE DOLDU";

            const h = Math.floor((difference / (1000 * 60 * 60)) % 24);
            const m = Math.floor((difference / 1000 / 60) % 60);
            const s = Math.floor((difference / 1000) % 60);

            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        };

        // initial calculation strictly inside useEffect
        setTimeLeft(calculateTimeLeft());

        // interval setup
        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        // cleanup function
        return () => clearInterval(timer);
    }, [expiresAt]);

    // return empty placeholder to prevent layout shifts before calculation
    if (!timeLeft) return <span className="w-16 h-6 inline-block"></span>;

    return (
        <span className="font-mono text-rose-400 font-black tracking-widest bg-rose-950/50 px-2 py-1 rounded-md border border-rose-500/30">
      {timeLeft}
    </span>
    );
}