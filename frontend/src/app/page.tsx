"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    Search, PlusCircle, TrendingUp,
    MapPin, Clock, ImageIcon, ChevronRight,
    HandHeart, Briefcase, FileText, AlertTriangle
} from 'lucide-react';

interface Advert {
    _id: string;
    title: string;
    price: number | string;
    category: string;
    location: string;
    createdAt: string;
    photos?: string[];
    type?: string;
}

const formatTime = (dateString: string) => {
    // GraphQL'den timestamp string'i dönebileceği için güvenli dönüştürme
    const date = new Date(Number(dateString) || dateString);
    return date.toLocaleDateString('tr-TR', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    });
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// --- GRAPHQL YARDIMCI FONKSİYONU ---
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

// --- GRAPHQL SORGULARI ---
const GET_ME = `#graphql
    query GetMeHome {
        getMe {
            account_type
        }
    }
`;

const GET_HOME_LISTINGS = `#graphql
    query GetHomeListings {
        getUrgentListings {
            _id: id
            title
            location
            createdAt
            type
        }
        getFeedListings {
            _id: id
            title
            price
            location
            createdAt
            photos
            category
            type
        }
    }
`;

export default function Home() {
    const [urgentListings, setUrgentListings] = useState<Advert[]>([]);
    const [popularListings, setPopularListings] = useState<Advert[]>([]);
    const [accountType, setAccountType] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            const rawToken = localStorage.getItem('accessToken');
            const isValidToken = rawToken && rawToken !== 'null' && rawToken !== 'undefined';

            let fetchedType = 'student'; // Varsayılan değer

            // 1. KULLANICI TİPİNİ ÇEK (Eğer giriş yapıldıysa)
            if (isValidToken) {
                try {
                    const data = await fetchGraphQL(GET_ME);
                    if (data.getMe) {
                        fetchedType = data.getMe.account_type;
                        setAccountType(fetchedType);
                    }
                } catch (userErr) {
                    console.warn("Kullanıcı bilgisi alınamadı", userErr);
                }
            }

            // 2. İLANLARI ÇEK (Eğer kurumsal hesap değilse)
            if (fetchedType !== 'external') {
                try {
                    // Tek bir GraphQL sorgusuyla iki farklı array'i de alıyoruz
                    const data = await fetchGraphQL(GET_HOME_LISTINGS);

                    if (data.getUrgentListings) {
                        setUrgentListings(data.getUrgentListings.slice(0, 6));
                    }
                    if (data.getFeedListings) {
                        setPopularListings(data.getFeedListings.slice(0, 6));
                    }
                } catch (error: any) {
                    console.log('İlanlar çekilirken hata:', error.message);
                }
            } else {
                console.log("Kurumsal hesap tespit edildi, ana akış ilanları gizlendi.");
            }
        };

        fetchData();
    }, []);

    return (
        <>
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

            <div className="flex flex-col items-center w-full min-h-screen pb-24">
                {accountType === 'external' ? (
                    <div className="relative w-full flex flex-col items-center text-center mt-20 mb-40 px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-widest mb-8">
                            <HandHeart size={14} />
                            <span>UniVerse Destek Ağı</span>
                        </div>

                        <h1 className="text-6xl md:text-7xl font-black tracking-tight text-white leading-tight max-w-4xl mx-auto">
                            Yeteneklere <span className="bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500 text-transparent bg-clip-text drop-shadow-[0_0_15px_rgba(16,185,129,0.4)]">Doğrudan Ulaşın</span>
                        </h1>
                        <p className="mt-8 text-xl text-gray-400 font-medium max-w-2xl mx-auto">
                            Bir şirketi mi temsil ediyorsunuz, yoksa öğrencilere bireysel olarak destek olmak isteyen bir hayırsever misiniz? İster bir öğrenciye burs sağlayın, ister geleceğin yeteneklerine staj ve iş imkanı sunun. İlanınızı saniyeler içinde kampüsle buluşturun.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-12 z-10">
                            <Link href="/create-listing?category=job" className="group relative flex items-center justify-center space-x-2 px-8 py-4 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 text-[#050B14] font-black text-lg transition-all hover:scale-105 shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_50px_rgba(16,185,129,0.5)]">
                                <Briefcase size={22} className="group-hover:rotate-360 transition-transform duration-300" />
                                <span>İlan Ver</span>
                            </Link>
                            <Link href="/profile" className="group flex items-center space-x-2 px-8 py-4 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-gray-200 font-bold text-lg hover:bg-white/10 hover:border-emerald-500/50 transition-all hover:shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                                <FileText size={22} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                                <span>İlanlarımı Yönet</span>
                            </Link>
                        </div>
                    </div>
                ) : (
                    // student user UI
                    <>
                        <div className="relative w-full flex flex-col items-center text-center mt-20 mb-40 px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
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
                                            <p className="text-gray-400 font-medium ml-7">Birilerinin yardıma ihtiyacı var!</p>
                                        </div>
                                        <Link href="/emergencies-feed" className="hidden sm:flex items-center text-rose-400 hover:text-rose-300 font-bold group transition-colors">
                                            Tümünü Gör <ChevronRight size={20} className="ml-1 group-hover:translate-x-1 transition-transform" />
                                        </Link>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {urgentListings.map((item) => (
                                            <div
                                                onClick={() => window.location.href=`/emergencies/${item._id}`}
                                                key={item._id}
                                                className="group relative bg-[#0B0F19]/60 backdrop-blur-xl border border-rose-500/30 hover:border-rose-500/60 rounded-3xl p-6 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(225,29,72,0.2)] flex flex-col cursor-pointer overflow-hidden"
                                            >
                                                {/* Arka plan kırmızı parlama efekti */}
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-600/10 rounded-full blur-[50px] group-hover:bg-rose-600/20 transition-colors"></div>

                                                <div className="flex items-start justify-between mb-4 relative z-10">
                                                    <div className="flex items-center space-x-2 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg">
                                                        <AlertTriangle size={14} className="text-rose-400" />
                                                        <span className="text-xs font-bold text-rose-300 uppercase tracking-wider">ACİL</span>
                                                    </div>
                                                </div>

                                                <div className="mb-6 relative z-10 flex-1">
                                                    <h3 className="text-xl font-black text-white leading-tight group-hover:text-rose-300 transition-colors line-clamp-3">
                                                        {item.title}
                                                    </h3>
                                                </div>

                                                <div className="pt-4 border-t border-rose-500/10 flex justify-between items-center relative z-10">
                                                    <div className="flex items-center text-gray-300 text-xs font-medium bg-white/5 border border-white/5 px-2 py-1 rounded-md">
                                                        <MapPin size={14} className="mr-1.5 text-rose-500 flex-shrink-0" />
                                                        <span className="truncate max-w-[140px]">{item.location || 'Kampüs'}</span>
                                                    </div>
                                                    <div className="flex items-center text-gray-500 text-xs font-medium flex-shrink-0">
                                                        <Clock size={14} className="mr-1" />
                                                        <span>{item.createdAt ? formatTime(item.createdAt) : 'Yeni'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

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
                    </>
                )}
            </div>
        </>
    );
}