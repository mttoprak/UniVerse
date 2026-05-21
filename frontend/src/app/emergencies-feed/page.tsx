"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, MapPin, Clock, ArrowRight, Eye } from 'lucide-react';
import CountdownTimer from '@/components/CountdownTimer';

interface Emergency {
    _id: string;
    title: string;
    description: string;
    location: string;
    createdAt: string;
    expiresAt?: string;
    views?: number;
    category?: string;
    is_urgent: boolean;
}

export default function EmergenciesPage() {
    const router = useRouter();

    // State management for emergencies
    const [emergencies, setEmergencies] = useState<Emergency[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch active emergencies from the backend
    useEffect(() => {
        const fetchEmergencies = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const token = localStorage.getItem('accessToken');
                if (!token) {
                    router.push('/login');
                    return;
                }

                const API_URL = "http://localhost:5000/api/listing?is_urgent=true";

                const response = await fetch(API_URL, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                const text = await response.text();
                let data;

                try {
                    data = JSON.parse(text);
                } catch (e) {
                    let extractedError = "Bağlantı Hatası: HTML döndü.";
                    if (text.includes("Cannot GET")) {
                        const match = text.match(/Cannot GET \/[a-zA-Z0-9/_-]+/);
                        if (match) extractedError = match[0];
                    }
                    throw new Error(`Sunucu Hatası: ${extractedError}`);
                }

                if (!response.ok) {
                    throw new Error(data.message || 'Acil ilanlar çekilirken bir hata oluştu.');
                }

                const allListings = data.listings || [];

                const urgentListings = allListings.filter((ad: Emergency) => ad.is_urgent === true);

                setEmergencies(urgentListings);

            } catch (err: any) {
                console.error("API Error:", err);
                setError(err.message || "Acil ilanlar yüklenirken bir hata oluştu.");
                setEmergencies([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchEmergencies();
    }, [router]);

    const formatDate = (dateString: string) => {
        const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString('tr-TR', options);
    };

    return (
        <div className="relative min-h-screen pt-24 pb-12 px-4 md:px-8">

            {/* Pulse Animation */}
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
                <div className="w-[120rem] h-[120rem] bg-rose-600/20 rounded-full blur-[500px] mix-blend-screen animate-slow-breathe flex-shrink-0"></div>
            </div>

            <div className="max-w-7xl mx-auto z-10 relative">

                {/* Page Header */}
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
                            Kampüsteki anlık yardımlaşma ağı. Acil ihtiyaçlarınızı veya yardım çağrılarınızı buradan duyurabilirsiniz.
                        </p>
                    </div>

                    <button
                        onClick={() => router.push('/create-listing')}
                        className="flex items-center justify-center space-x-2 bg-rose-600/20 hover:bg-rose-600/40 border border-rose-500/50 text-rose-300 px-6 py-3 rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(244,63,94,0.15)] hover:shadow-[0_0_25px_rgba(244,63,94,0.3)]"
                    >
                        <span>Yeni Acil İlan Ver</span>
                        <ArrowRight size={18} />
                    </button>
                </div>

                {/* Loading and Error States */}
                {isLoading && (
                    <div className="w-full py-20 flex flex-col items-center justify-center space-y-4">
                        <div className="w-10 h-10 border-4 border-rose-500/30 border-t-rose-500 rounded-full animate-spin"></div>
                        <p className="text-rose-400/70 font-medium animate-pulse">Sinyaller taranıyor...</p>
                    </div>
                )}

                {error && !isLoading && (
                    <div className="w-full p-4 mb-6 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-center text-sm">
                        {error}
                    </div>
                )}

                {!isLoading && !error && emergencies.length === 0 && (
                    <div className="w-full py-20 flex flex-col items-center justify-center border border-dashed border-rose-500/20 rounded-3xl">
                        <AlertTriangle size={48} className="text-rose-500/50 mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">Şu An Acil Durum Yok</h3>
                        <p className="text-gray-400 text-sm">Her şey yolunda görünüyor. Yardıma ihtiyacın olursa ilan verebilirsin.</p>
                    </div>
                )}

                {/* Emergency Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {!isLoading && emergencies.map((emergency) => (
                        <div
                            key={emergency._id}
                            onClick={() => router.push(`/listings/${emergency._id}`)} // Tıklanınca İlan Detayına Git
                            className="group cursor-pointer bg-black/40 backdrop-blur-xl border border-rose-500/20 hover:border-rose-500/50 rounded-2xl p-6 transition-all hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(244,63,94,0.15)] flex flex-col relative overflow-hidden"
                        >

                            {/* Subtle pulsing background effect for each card */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-600/10 rounded-full blur-[50px] group-hover:bg-rose-600/20 transition-colors"></div>

                            {/* Card Header */}
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <div className="flex items-center space-x-2 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg">
                                    <AlertTriangle size={14} className="text-rose-400" />
                                    <span className="text-xs font-bold text-rose-300 uppercase tracking-wider">{emergency.category || 'ACİL YARDIM'}</span>
                                </div>

                                {/* Eğer backend expiresAt yolluyorsa sayaç göster, yollamıyorsa izlenme göster */}
                                {emergency.expiresAt ? (
                                    <CountdownTimer expiresAt={emergency.expiresAt} />
                                ) : (
                                    <div className="flex items-center space-x-1 text-gray-500 text-xs">
                                        <Eye size={14} />
                                        <span>{emergency.views || 0}</span>
                                    </div>
                                )}
                            </div>

                            {/* Card Title and Description */}
                            <div className="mb-6 relative z-10 flex-1">
                                <h2 className="text-xl font-black text-white mb-2 leading-tight group-hover:text-rose-300 transition-colors">
                                    {emergency.title}
                                </h2>
                                <p className="text-sm text-gray-400 line-clamp-3">
                                    {emergency.description}
                                </p>
                            </div>

                            {/* Card Footer */}
                            <div className="pt-4 border-t border-rose-500/10 flex justify-between items-center relative z-10">
                                <div className="flex items-center text-gray-400 text-xs">
                                    <MapPin size={14} className="mr-1.5 text-rose-400" />
                                    <span className="truncate max-w-[120px]">{emergency.location || 'Konum Belirtilmemiş'}</span>
                                </div>
                                <div className="flex items-center text-gray-500 text-xs">
                                    <Clock size={14} className="mr-1.5" />
                                    <span>{emergency.createdAt ? formatDate(emergency.createdAt) : 'Tarih Yok'}</span>
                                </div>
                            </div>

                        </div>
                    ))}
                </div>

            </div>
        </div>
    );
}