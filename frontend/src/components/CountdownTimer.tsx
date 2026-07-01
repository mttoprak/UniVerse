"use client";

import { useState, useEffect, useRef } from 'react';

interface CountdownTimerProps {
    expiresAt?: string | number | null; // Tipini genişlettik, backend'den ne gelirse gelsin çökmesin
    onComplete?: () => void;
}

export default function CountdownTimer({ expiresAt, onComplete }: CountdownTimerProps) {
    const [timeLeft, setTimeLeft] = useState('');
    const [isFinished, setIsFinished] = useState(false);

    const onCompleteRef = useRef(onComplete);
    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    useEffect(() => {
        // Eğer veri gelmediyse veya anlamsız bir şeyse iptal et
        if (!expiresAt || expiresAt === 'null' || expiresAt === 'undefined') {
            setTimeLeft("BİLİNMİYOR");
            return;
        }

        let timer: NodeJS.Timeout;

        const updateTimer = () => {
            // YENİ: Gelen değeri güvenli bir şekilde Number'a çevir (Unix timestamp ise)
            // Değilse doğrudan string olarak bırak (ISO string ise)
            const parsedExpires = !isNaN(Number(expiresAt)) ? Number(expiresAt) : expiresAt;
            const targetDate = new Date(parsedExpires);

            // Eğer geçersiz bir tarihse (Invalid Date)
            if (isNaN(targetDate.getTime())) {
                setTimeLeft("HATA");
                clearInterval(timer);
                return;
            }

            const difference = targetDate.getTime() - new Date().getTime();

            if (difference <= 0) {
                setTimeLeft("SÜRE DOLDU");
                setIsFinished(true);

                if (onCompleteRef.current) {
                    onCompleteRef.current();
                }

                clearInterval(timer);
                return;
            }

            const h = Math.floor(difference / (1000 * 60 * 60));
            const m = Math.floor((difference / 1000 / 60) % 60);
            const s = Math.floor((difference / 1000) % 60);

            setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
        };

        updateTimer();
        timer = setInterval(updateTimer, 1000);

        return () => clearInterval(timer);
    }, [expiresAt]);

    if (!timeLeft) return <span className="w-16 h-6 inline-block animate-pulse bg-white/5 rounded-md"></span>;

    return (
        <span className={`font-mono font-black tracking-widest px-2 py-1 rounded-md border text-xs ${
            isFinished
                ? 'text-rose-600 bg-rose-500/10 border-rose-500/20'
                : 'text-rose-400 bg-rose-950/50 border-rose-500/30'
        }`}>
            {timeLeft}
        </span>
    );
}