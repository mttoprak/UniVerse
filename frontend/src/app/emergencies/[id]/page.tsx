"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, MapPin, Clock, User, Loader2, AlertTriangle, Send, Zap, GraduationCap } from 'lucide-react';
import CountdownTimer from "@/components/CountdownTimer";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

async function fetchGraphQL(query: string, variables: any = {}) {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_URL}/graphql`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ query, variables })
    });

    if (!response.ok) throw new Error(`API Hatası: ${response.status}`);
    const result = await response.json();
    if (result.errors) throw new Error(result.errors[0].message);
    return result.data;
}

const GET_EMERGENCY_DETAIL = `#graphql
query GetEmergencyDetail($id: ID!) {
    getListing(id: $id) {
        _id: id
        title
        description
        location
        createdAt
        expires
        type
        owner {
            _id: id
            username
            profile_photo
            account_type
        }
    }
}
`;

export default function EmergencyDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [ad, setAd] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchEmergencyDetails = async () => {
            if (!id) return;
            try {
                setIsLoading(true);
                const token = localStorage.getItem('accessToken');
                if (!token) {
                    router.push('/login');
                    return;
                }

                const data = await fetchGraphQL(GET_EMERGENCY_DETAIL, { id });
                const listingData = data.getListing;

                if (!listingData) throw new Error('Acil ilan bulunamadı.');

                if (listingData.type !== 'urgent') {
                    router.replace(`/listings/${id}`);
                    return;
                }

                setAd(listingData);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchEmergencyDetails();
    }, [id, router]);

    const handlePrimaryAction = () => {
        router.push(`/messages?listingId=${id}`);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen pt-28 flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-rose-500 animate-spin mb-4" />
                <p className="text-rose-400 font-bold uppercase tracking-widest animate-pulse">Acil Durum Yükleniyor...</p>
            </div>
        );
    }

    if (error || !ad) {
        return (
            <div className="min-h-screen pt-28 flex flex-col items-center justify-center px-4 text-center">
                <AlertTriangle size={64} className="text-rose-500 mb-4 opacity-50" />
                <h2 className="text-2xl font-black text-white mb-2">İlan Bulunamadı</h2>
                <p className="text-gray-400 mb-6">{error || "Bu ilan silinmiş veya süresi dolmuş olabilir."}</p>
                <Link href="/emergencies-feed" className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white transition-colors">
                    Panoya Dön
                </Link>
            </div>
        );
    }

    const seller = ad.owner;
    // ARTIK HESAPLAMA YOK: Direkt veritabanındaki ISO string'i sayaca veriyoruz
    const expiresAt = ad.expires;

    return (
        <div className="min-h-screen pt-28 pb-12 px-4 relative">
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes heartbeat { 0%, 100% { opacity: 0.15; transform: scale(1); } 50% { opacity: 0.25; transform: scale(1.05); } }
                .animate-heartbeat { animation: heartbeat 3s infinite ease-in-out; }
            `}}/>
            <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 flex items-center justify-center">
                <div className="w-[80rem] h-[80rem] bg-rose-600/30 rounded-full blur-[400px] mix-blend-screen animate-heartbeat flex-shrink-0"></div>
            </div>

            <div className="max-w-3xl mx-auto mt-4">
                <div className="flex items-center justify-between mb-8">
                    <Link href="/emergencies-feed" className="flex items-center space-x-2 text-gray-400 hover:text-rose-400 transition-colors group">
                        <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-rose-500/50 transition-colors">
                            <ChevronLeft size={18} />
                        </div>
                        <span className="text-sm font-bold uppercase tracking-wider">Panoya Dön</span>
                    </Link>
                </div>

                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-rose-500/10 border border-rose-500/30 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between shadow-[0_0_40px_rgba(244,63,94,0.15)] relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/20 blur-3xl"></div>
                        <div className="flex items-center gap-5 mb-6 md:mb-0 relative z-10">
                            <div className="p-4 bg-rose-500 rounded-2xl text-black animate-pulse shadow-[0_0_20px_rgba(244,63,94,0.5)] flex-shrink-0">
                                <Zap size={36} fill="currentColor" />
                            </div>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">ACİL YARDIM ÇAĞRISI</h1>
                                <p className="text-rose-300 text-sm mt-1">Bu ilan kampüste anlık bir ihtiyacı belirtir. Lütfen hızlı aksiyon alın.</p>
                            </div>
                        </div>
                        <div className="text-center md:text-right relative z-10 bg-black/40 px-4 py-3 rounded-2xl border border-rose-500/20">
                            <p className="text-gray-400 text-[10px] uppercase font-black tracking-widest mb-1.5">Kalan Süre</p>
                            {expiresAt ? (
                                <CountdownTimer expiresAt={expiresAt} onComplete={() => router.push('/emergencies-feed')} />
                            ) : (
                                <span className="text-gray-500 text-sm">Bilinmiyor</span>
                            )}
                        </div>
                    </div>

                    <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
                        <h2 className="text-3xl font-black text-white leading-tight mb-6">{ad.title}</h2>

                        <div className="flex flex-wrap items-center gap-6 mb-8 pt-6 border-t border-white/10">
                            <div className="flex items-center text-sm text-gray-300 bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                                <MapPin size={18} className="mr-2 text-rose-500" />
                                <span className="font-bold">{ad.location || 'Konum Belirtilmemiş'}</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-400">
                                <Clock size={16} className="mr-2 text-rose-500/60" />
                                <span>{new Date(Number(ad.createdAt) || ad.createdAt).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                            </div>
                        </div>

                        {ad.description && (
                            <div className="mb-8 p-6 bg-white/5 rounded-2xl border border-white/5">
                                <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">{ad.description}</p>
                            </div>
                        )}

                        {seller && (
                            <div className="bg-gradient-to-r from-rose-950/20 to-transparent border border-rose-500/10 rounded-2xl p-4 mb-8 flex items-center space-x-4">
                                <div className="w-14 h-14 rounded-full overflow-hidden bg-rose-500/20 border border-rose-500/50 flex items-center justify-center flex-shrink-0">
                                    {seller.profile_photo ? (
                                        <img src={seller.profile_photo} alt={seller.username} className="w-full h-full object-cover" />
                                    ) : (
                                        <User size={24} className="text-rose-400" />
                                    )}
                                </div>
                                <div>
                                    <h4 className="text-white font-bold text-lg mb-1">@{seller.username || 'Kullanıcı'}</h4>
                                    {seller.account_type === 'student' ? (
                                        <span className="flex items-center gap-1 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                                            <GraduationCap size={14} /> Öğrenci
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-gray-400 text-[10px] font-black uppercase tracking-wider">
                                            <User size={14} /> Sivil
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                        <button
                            onClick={handlePrimaryAction}
                            className="w-full py-5 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3 bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_20px_rgba(225,29,72,0.4)] hover:shadow-[0_0_30px_rgba(225,29,72,0.6)] hover:-translate-y-1">
                            <Send size={24} /> Hemen Yardıma Koş
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}