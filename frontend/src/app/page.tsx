"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    Search, PlusCircle, Flame, TrendingUp,
    MapPin, Clock, ImageIcon, ChevronRight
} from 'lucide-react';

interface Advert {
    _id: string;
    title: string;
    price: number | string;
    category: string;
    location: string;
    createdAt: string;
    photos?: string[];
    is_urgent?: boolean;
}

const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    });
};

export default function Home() {
    const [urgentListings, setUrgentListings] = useState<Advert[]>([]);
    const [popularListings, setPopularListings] = useState<Advert[]>([]);

    useEffect(() => {
        const fetchListings = async () => {
            const token = localStorage.getItem('accessToken');
            const headers = {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            };

            try {
                const baseRes = await fetch('http://localhost:5000/api/listing', { headers });
                const baseData = await baseRes.json();
                const allListings: Advert[] = baseData.listings || [];

                const trueUrgent = allListings.filter(l => l.is_urgent);
                setUrgentListings(trueUrgent.length > 0 ? trueUrgent.slice(0, 6) : allListings.slice(0, 3));

                const remaining = allListings.filter(l => !l.is_urgent);
                setPopularListings(remaining.length > 0 ? remaining.slice(0, 6) : allListings.slice(3, 9));

            } catch (error) {
                console.error('İlanlar çekilirken hata:', error);
            }
        };

        fetchListings();
    }, []);

    return (
        <>
            {/* GLOBAL ARKAPLAN (Ekrandan asla dışarı taşmaz veya kesilmez) */}
            <div
                className="fixed inset-0 w-full h-full -z-50 pointer-events-none"
                style={{
                    backgroundColor: '#050505',
                    backgroundImage: `
                        radial-gradient(ellipse at 15% 40%, rgba(225, 29, 72, 0.08) 0%, transparent 50%),
                        radial-gradient(ellipse at 85% 70%, rgba(124, 58, 237, 0.08) 0%, transparent 60%),
                        radial-gradient(circle at 50% 10%, rgba(8, 145, 178, 0.05) 0%, transparent 40%),
                        linear-gradient(to bottom, #050505, #0B0B10)
                    `
                }}
            />

            {/* ANA İÇERİK */}
            <div className="flex flex-col items-center w-full min-h-screen pb-24">

                {/* 1. HERO ALANI */}
                <div className="relative w-full flex flex-col items-center text-center mt-20 mb-40 px-4">
                    <h1 className="text-6xl md:text-7xl font-black tracking-tight text-white leading-tight max-w-4xl mx-auto">
                        Kampüsün <span className="bg-gradient-to-r from-cyan-400 via-violet-500 to-fuchsia-500 text-transparent bg-clip-text drop-shadow-[0_0_15px_rgba(124,58,237,0.5)]">Ekosistemi</span>
                    </h1>
                    <p className="mt-8 text-xl text-gray-400 font-medium max-w-2xl mx-auto">
                        Kullanmadığın eşyaları sat, ev arkadaşı bul veya yeteneklerini takas et. Sadece doğrulanmış üniversite öğrencileri için.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-12 z-10">
                        <Link href="/create-listing" className="group relative flex items-center justify-center space-x-2 px-8 py-4 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold text-lg transition-all hover:scale-105 shadow-[0_0_30px_rgba(124,58,237,0.5)] hover:shadow-[0_0_50px_rgba(124,58,237,0.8)]">
                            <PlusCircle size={24} className="group-hover:rotate-90 transition-transform duration-300" />
                            <span>Hemen İlan Ver</span>
                        </Link>
                        <Link href="/feed" className="group flex items-center space-x-2 px-8 py-4 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-gray-200 font-bold text-lg hover:bg-white/10 hover:border-cyan-500/50 transition-all hover:shadow-[0_0_30px_rgba(34,211,238,0.2)]">
                            <Search size={22} className="text-cyan-400 group-hover:scale-110 transition-transform" />
                            <span>İlanları Keşfet</span>
                        </Link>
                    </div>
                </div>

                <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 flex flex-col gap-40 relative z-10">

                    {/* 2. ACİL İLANLAR VİTRİNİ */}
                    {urgentListings.length > 0 && (
                        <section className="w-full">
                            <div className="flex items-end justify-between mb-10">
                                <div>
                                    <div className="flex items-center space-x-3 mb-2">
                                        <span className="relative flex h-4 w-4">
                                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                          <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500"></span>
                                        </span>
                                        <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-orange-500 flex items-center gap-3">
                                            Acil İlanlar
                                        </h2>
                                    </div>
                                    <p className="text-gray-400 font-medium ml-7">Zaman daralıyor, hemen değerlendir!</p>
                                </div>
                                <Link href="/emergencies-feed" className="hidden sm:flex items-center text-rose-400 hover:text-rose-300 font-bold group transition-colors">
                                    Tümünü Gör <ChevronRight size={20} className="ml-1 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {urgentListings.map((item) => (
                                    <div onClick={() => window.location.href=`/listings/${item._id}`} key={item._id} className="group bg-black/40 backdrop-blur-xl border border-rose-500/20 hover:border-rose-500/50 rounded-3xl overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(225,29,72,0.15)] flex flex-col cursor-pointer">
                                        <div className="h-48 bg-gradient-to-br from-gray-900 to-black relative flex items-center justify-center overflow-hidden border-b border-rose-500/10">
                                            {item.photos && item.photos.length > 0 ? (
                                                <img src={item.photos[0]} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                            ) : (
                                                <ImageIcon size={48} className="text-white/10 group-hover:scale-110 transition-transform duration-500" />
                                            )}
                                            <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-rose-500/90 backdrop-blur-md text-white text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-lg shadow-lg shadow-rose-500/30">
                                                <Flame size={14} /> Acil
                                            </div>
                                        </div>
                                        <div className="p-6">
                                            <h3 className="text-lg font-bold text-gray-100 leading-tight group-hover:text-rose-300 transition-colors line-clamp-2 mb-3">
                                                {item.title}
                                            </h3>
                                            <div className="text-2xl font-black text-white mb-4">
                                                {item.price ? `${item.price} ₺` : 'Ücretsiz'}
                                            </div>
                                            <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
                                                <div className="flex items-center bg-transparent border border-white/10 px-2.5 py-1.5 rounded-md truncate max-w-[60%]">
                                                    <MapPin size={14} className="mr-1.5 text-rose-500 flex-shrink-0" /> <span className="truncate text-gray-300">{item.location || 'Kampüs'}</span>
                                                </div>
                                                <div className="flex items-center flex-shrink-0">
                                                    <Clock size={14} className="mr-1 text-gray-600" /> {item.createdAt ? formatTime(item.createdAt) : 'Yeni'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* 3. POPÜLER İLANLAR VİTRİNİ */}
                    {popularListings.length > 0 && (
                        <section className="w-full">
                            <div className="flex items-end justify-between mb-10">
                                <div>
                                    <div className="flex items-center space-x-3 mb-2">
                                        <TrendingUp size={36} className="text-cyan-400" />
                                        <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-500">
                                            Popüler İlanlar
                                        </h2>
                                    </div>
                                    <p className="text-gray-400 font-medium ml-12">Kampüste şu an en çok incelenenler</p>
                                </div>
                                <Link href="/feed?sort=popular" className="hidden sm:flex items-center text-cyan-400 hover:text-cyan-300 font-bold group transition-colors">
                                    Tümünü Gör <ChevronRight size={20} className="ml-1 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {popularListings.map((item) => (
                                    <div onClick={() => window.location.href=`/listings/${item._id}`} key={item._id} className="group bg-black/40 backdrop-blur-xl border border-white/5 hover:border-cyan-500/40 rounded-3xl overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(34,211,238,0.15)] flex flex-col cursor-pointer">
                                        <div className="h-48 bg-gradient-to-br from-gray-900 to-black relative flex items-center justify-center overflow-hidden border-b border-white/5 group-hover:border-cyan-500/20 transition-colors">
                                            {item.photos && item.photos.length > 0 ? (
                                                <img src={item.photos[0]} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                            ) : (
                                                <ImageIcon size={48} className="text-white/10 group-hover:scale-110 transition-transform duration-500" />
                                            )}
                                            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md border border-white/10 text-cyan-400 text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-lg shadow-xl">
                                                {item.category === 'textbooks_and_notes' ? 'Not/Kitap' : item.category || 'Kategori'}
                                            </div>
                                        </div>
                                        <div className="p-6">
                                            <h3 className="text-lg font-bold text-gray-100 leading-tight group-hover:text-cyan-300 transition-colors line-clamp-2 mb-3">
                                                {item.title}
                                            </h3>
                                            <div className="text-2xl font-black text-white mb-4">
                                                {item.price ? `${item.price} ₺` : 'Ücretsiz'}
                                            </div>
                                            <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
                                                <div className="flex items-center bg-transparent border border-white/10 px-2.5 py-1.5 rounded-md truncate max-w-[60%]">
                                                    <MapPin size={14} className="mr-1.5 text-cyan-400 flex-shrink-0" /> <span className="truncate text-gray-300">{item.location || 'Kampüs'}</span>
                                                </div>
                                                <div className="flex items-center flex-shrink-0">
                                                    <Clock size={14} className="mr-1 text-gray-600" /> {item.createdAt ? formatTime(item.createdAt) : 'Yeni'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                </div>
            </div>
        </>
    );
}