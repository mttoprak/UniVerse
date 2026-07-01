"use client";

import { useEffect, useState } from 'react';
import { Radio, X } from 'lucide-react';
import { getWsClient } from '../utils/graphqlWs'; // Yolunu kendi klasör yapına göre düzelt

const parseSafeDate = (dateStr: string | null | undefined): Date | null => {
    if (!dateStr) return null;
    const parsedDate = /^\d+$/.test(dateStr) ? new Date(Number(dateStr)) : new Date(dateStr);
    return !isNaN(parsedDate.getTime()) ? parsedDate : null;
};

const SYSTEM_ANNOUNCEMENT_SUBSCRIPTION = `
    subscription {
        systemAnnouncement {
            title
            message
            createdAt
        }
    }
`;

export default function SystemAnnouncement() {
    const [announcement, setAnnouncement] = useState<any>(null);

    useEffect(() => {
        const client = getWsClient();
        if (!client) return;

        let timer: NodeJS.Timeout;

        const unsubscribe = client.subscribe(
            { query: SYSTEM_ANNOUNCEMENT_SUBSCRIPTION },
            {
                next: (data: any) => {
                    const result = data?.data?.systemAnnouncement;
                    if (result) {
                        setAnnouncement(result);

                        if (timer) clearTimeout(timer);
                        timer = setTimeout(() => setAnnouncement(null), 15000);
                    }
                },
                error: (err) => console.log("📢 Abonelik Hatası:", err),
                complete: () => console.log("📢 Abonelik sonlandı"),
            }
        );

        return () => {
            if (timer) clearTimeout(timer);
            // SADECE abonelikten çıkıyoruz, client.dispose() KULLANMIYORUZ!
            unsubscribe();
        };
    }, []);

    if (!announcement) return null;

    const annDate = parseSafeDate(announcement.createdAt);

    return (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] w-[90%] max-w-lg bg-gradient-to-r from-[#1b0a11] to-[#0B0F19] border-2 border-rose-500/50 backdrop-blur-2xl rounded-3xl p-6 shadow-[0_0_50px_rgba(225,29,72,0.4)] animate-in slide-in-from-top-10 fade-in zoom-in-95 duration-500">
            <button
                onClick={() => setAnnouncement(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 p-1.5 rounded-full transition-colors"
            >
                <X size={18} />
            </button>

            <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/50 flex items-center justify-center flex-shrink-0 animate-pulse">
                    <Radio size={24} className="text-rose-500" />
                </div>
                <div className="pr-6">
                    <h3 className="text-sm font-black text-rose-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                        Sistem Duyurusu
                    </h3>
                    <h4 className="text-xl font-bold text-white mb-2 leading-tight">
                        {announcement.title}
                    </h4>
                    <p className="text-sm text-gray-300 leading-relaxed">
                        {announcement.message}
                    </p>
                    <div className="mt-3 text-[10px] text-gray-500 font-mono">
                        {annDate ? annDate.toLocaleTimeString('tr-TR') : 'Şimdi'} itibarıyla iletildi
                    </div>
                </div>
            </div>
        </div>
    );
}