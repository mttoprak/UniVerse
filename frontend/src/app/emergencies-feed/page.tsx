"use client";

import { useState, useEffect } from 'react';
import { AlertTriangle, MapPin, Clock, ArrowRight } from 'lucide-react';
import CountdownTimer from '@/components/CountdownTimer';

// define the typescript interface for emergency data
interface Emergency {
    _id: string;
    title: string;
    description: string;
    location: string;
    duration: string;
    createdAt: string;
    expiresAt: string;
}

export default function EmergenciesPage() {
    // state management for emergencies
    const [emergencies, setEmergencies] = useState<Emergency[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // fetch active emergencies from the backend
    useEffect(() => {
        const fetchEmergencies = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const API_URL = "http://localhost:5000/api/emergencies";
                const response = await fetch(API_URL);

                if (!response.ok) {
                    throw new Error('Failed to fetch emergencies');
                }

                const data = await response.json();
                setEmergencies(data);
            } catch (err) {
                console.error("API Error:", err);
                setError("Acil ilanlar yüklenirken bir hata oluştu.");

                // fallback mock data if the backend is offline or not ready
                setEmergencies([
                    {
                        _id: "1",
                        title: "Kütüphaneye Acil Type-C Şarj Aleti!",
                        description: "Şarj aletimi evde unutmuşum. Ege Üniversitesi Kütüphanesinde Type-C şarj aleti olan varsa lütfen bana ulaşsın, çok acil!",
                        location: "Ege Üni. Kütüphane",
                        duration: "24 Saat",
                        createdAt: "10 dakika önce",
                        expiresAt: "2026-05-03T18:25:00Z"
                    },
                    {
                        _id: "2",
                        title: "Kayıp Cüzdan!",
                        description: "Mühendislik kantininde siyah deri cüzdanımı düşürdüm. İçinde kimliğim ve kartlarım var, bulan lütfen ulaşsın.",
                        location: "Mühendislik Kantini",
                        duration: "12 Saat",
                        createdAt: "1 saat önce",
                        expiresAt: "2026-05-03T06:25:00Z"
                    },
                    {
                        _id: "3",
                        title: "Kilitli Kaldım (Yardım)",
                        description: "KYK yurdu B blok 3. kat yangın merdiveni kapısında kilitli kaldım. Görevlilere ulaşamıyorum.",
                        location: "KYK Yurdu B Blok",
                        duration: "1 Saat",
                        createdAt: "Az önce",
                        expiresAt: "2026-05-02T19:25:00Z"
                    }
                ]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchEmergencies();
    }, []);

    return (
        <div className="relative min-h-screen pt-24 pb-12 px-4 md:px-8">

            {/* pulse animation */}
            <style dangerouslySetInnerHTML={{
                __html: `
          @keyframes slow-breathe {
            0%, 100% { opacity: 0.3; transform: scale(0.9); }
            50% { opacity: 0.6; transform: scale(1.0); }
          }
          .animate-slow-breathe { animation: slow-breathe 4s infinite ease-in-out; }
        `
            }}/>
            <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 flex items-center justify-center">
                <div className="w-[70rem] h-[70rem] bg-rose-600/20 rounded-full blur-[500px] mix-blend-screen animate-slow-breathe flex-shrink-0"></div>
            </div>

            <div className="max-w-7xl mx-auto z-10 relative">

                {/* page header */}
                <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-rose-500/20 pb-6">
                    <div>
                        <div className="flex items-center space-x-3 mb-2">
                            <div className="relative flex h-5 w-5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-5 w-5 bg-rose-600 border-2 border-black"></span>
                            </div>
                            <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-rose-400 tracking-tight">
                                Acil Durum Panosu
                            </h1>
                        </div>
                        <p className="text-gray-400 text-sm md:text-base">
                            Kampüsteki anlık yardımlaşma ağı. Bu ilanlar süreleri dolduğunda otomatik olarak silinir.
                        </p>
                    </div>

                    <button className="flex items-center justify-center space-x-2 bg-rose-600/20 hover:bg-rose-600/40 border border-rose-500/50 text-rose-300 px-6 py-3 rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(244,63,94,0.15)] hover:shadow-[0_0_25px_rgba(244,63,94,0.3)]">
                        <span>Yeni Acil İlan Ver</span>
                        <ArrowRight size={18} />
                    </button>
                </div>

                {/* loading and error states */}
                {isLoading && (
                    <div className="w-full py-20 flex flex-col items-center justify-center space-y-4">
                        <div className="w-10 h-10 border-4 border-rose-500/30 border-t-rose-500 rounded-full animate-spin"></div>
                        <p className="text-rose-400/70 font-medium animate-pulse">Sinyaller taranıyor...</p>
                    </div>
                )}

                {error && !isLoading && (
                    <div className="w-full p-4 mb-6 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-center text-sm">
                        {error} - Örnek veriler gösteriliyor.
                    </div>
                )}

                {/* emergency cards grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {!isLoading && emergencies.map((emergency) => (
                        <div
                            key={emergency._id}
                            className="group bg-black/40 backdrop-blur-xl border border-rose-500/20 hover:border-rose-500/50 rounded-2xl p-6 transition-all hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(244,63,94,0.15)] flex flex-col relative overflow-hidden"
                        >

                            {/* subtle pulsing background effect for each card */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-600/10 rounded-full blur-[50px] group-hover:bg-rose-600/20 transition-colors"></div>

                            {/* card header */}
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <div className="flex items-center space-x-2 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg">
                                    <AlertTriangle size={14} className="text-rose-400" />
                                    <span className="text-xs font-bold text-rose-300 uppercase tracking-wider">Acil</span>
                                </div>

                                <CountdownTimer expiresAt={emergency.expiresAt} />
                            </div>

                            {/* card title and description */}
                            <div className="mb-6 relative z-10 flex-1">
                                <h2 className="text-xl font-black text-white mb-2 leading-tight group-hover:text-rose-300 transition-colors">
                                    {emergency.title}
                                </h2>
                                <p className="text-sm text-gray-400 line-clamp-3">
                                    {emergency.description}
                                </p>
                            </div>

                            {/* card footer */}
                            <div className="pt-4 border-t border-rose-500/10 flex justify-between items-center relative z-10">
                                <div className="flex items-center text-gray-400 text-xs">
                                    <MapPin size={14} className="mr-1.5 text-rose-400" />
                                    <span className="truncate max-w-[120px]">{emergency.location}</span>
                                </div>
                                <div className="flex items-center text-gray-500 text-xs">
                                    <Clock size={14} className="mr-1.5" />
                                    <span>{emergency.createdAt}</span>
                                </div>
                            </div>

                        </div>
                    ))}
                </div>

            </div>
        </div>
    );
}