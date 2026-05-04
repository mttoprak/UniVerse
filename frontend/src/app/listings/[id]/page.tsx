"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronLeft, Heart, Share2, MessageSquare, MapPin, Calendar, User, ShieldCheck, Tag, Info, Loader2, AlertCircle } from 'lucide-react';

export default function AdDetailPage() {
    const params = useParams();
    const id = params.id;

    // State Management for Data, Loading, and Errors
    const [ad, setAd] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // UI States
    const [isFavorite, setIsFavorite] = useState(false);
    const [activeImage, setActiveImage] = useState(0);

    // Fetch ad details when the component mounts or ID changes
    useEffect(() => {
        const fetchAdDetails = async () => {
            if (!id) return;

            try {
                setIsLoading(true);
                setError(null);

                const response = await fetch(`http://localhost:5000/api/adverts/${id}`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'İlan bulunamadı veya silinmiş olabilir.');
                }

                setAd(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAdDetails();
    }, [id]);

    // Loading State UI
    if (isLoading) {
        return (
            <div className="min-h-screen pt-28 flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mb-4" />
                <p className="text-cyan-400 font-bold uppercase tracking-widest animate-pulse">İlan Verileri Yükleniyor...</p>
            </div>
        );
    }

    // Error State UI (If ad is not found or server is down)
    if (error || !ad) {
        return (
            <div className="min-h-screen pt-28 px-4 flex flex-col items-center justify-center">
                <div className="bg-rose-500/10 border border-rose-500/30 p-8 rounded-3xl max-w-md text-center">
                    <AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-black text-white mb-2">Hata Oluştu</h2>
                    <p className="text-rose-400 text-sm mb-6">{error || 'İlan bulunamadı.'}</p>
                    <Link href="/listings" className="inline-block px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-colors">
                        İlanlara Dön
                    </Link>
                </div>
            </div>
        );
    }

    // Default image if backend sends an empty array or no images
    const displayImages = ad.images && ad.images.length > 0
        ? ad.images
        : ["https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80"]; // Placeholder fallback

    return (
        <div className="min-h-screen pt-28 pb-12 px-4">

            {/* Background Ambient Glow Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-500/10 blur-[150px] rounded-full mix-blend-screen"></div>
                <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-emerald-500/10 blur-[150px] rounded-full mix-blend-screen"></div>
            </div>

            <div className="max-w-6xl mx-auto">

                {/* Top Navigation Bar - Back & Actions */}
                <div className="flex items-center justify-between mb-8">
                    <Link href="/listings" className="flex items-center space-x-2 text-gray-400 hover:text-cyan-400 transition-colors group">
                        <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-cyan-500/50 transition-colors">
                            <ChevronLeft size={18} />
                        </div>
                        <span className="text-sm font-bold uppercase tracking-wider">İlanlara Dön</span>
                    </Link>

                    <div className="flex items-center space-x-4">
                        <button className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors">
                            <Share2 size={18} />
                            <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">Paylaş</span>
                        </button>
                        <button
                            onClick={() => setIsFavorite(!isFavorite)}
                            className={`flex items-center space-x-2 transition-colors ${isFavorite ? 'text-rose-500' : 'text-gray-400 hover:text-rose-400'}`}
                        >
                            <Heart size={18} className={isFavorite ? "fill-rose-500" : ""} />
                            <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">Favori</span>
                        </button>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* LEFT COLUMN: Image Gallery and Description */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Image Gallery Viewer */}
                        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden p-2">
                            <div className="aspect-[4/3] w-full rounded-2xl overflow-hidden bg-[#0B0F19] relative group flex items-center justify-center">
                                <img
                                    src={displayImages[activeImage]}
                                    alt={ad.title}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                            </div>

                            {/* Thumbnail Selector List */}
                            {displayImages.length > 1 && (
                                <div className="flex items-center gap-3 mt-3 px-2 pb-2 overflow-x-auto">
                                    {displayImages.map((img: string, idx: number) => (
                                        <button
                                            key={idx}
                                            onClick={() => setActiveImage(idx)}
                                            className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${activeImage === idx ? 'border-cyan-500 opacity-100' : 'border-transparent opacity-50 hover:opacity-100'}`}
                                        >
                                            <img src={img} alt="" className="w-full h-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Description Box */}
                        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
                            <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center space-x-2 mb-6">
                                <Info size={20} className="text-cyan-500" />
                                <span>İlan Detayları</span>
                            </h3>
                            <p className="text-gray-300 leading-relaxed text-sm whitespace-pre-wrap">
                                {ad.description}
                            </p>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Pricing, Details, and Seller Info */}
                    <div className="space-y-6">

                        {/* Sticky Action Panel */}
                        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-[0_10px_30px_rgba(0,0,0,0.2)] sticky top-28">

                            {/* Header & Price */}
                            <div className="mb-6">
                                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-black uppercase tracking-widest mb-4">
                                    <Tag size={12} />
                                    <span>{ad.category || 'Diğer'}</span>
                                </div>
                                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight mb-4">
                                    {ad.title}
                                </h1>
                                <div className="text-4xl font-black text-emerald-400 tracking-tighter">
                                    {/* Format the price safely */}
                                    {ad.price ? `${ad.price.toLocaleString('tr-TR')} ₺` : 'Fiyat Belirtilmemiş'}
                                </div>
                            </div>

                            {/* Quick Info Items */}
                            <div className="space-y-4 mb-8 pt-6 border-t border-white/10">
                                <div className="flex items-center text-sm text-gray-400">
                                    <MapPin size={16} className="mr-3 text-gray-500" />
                                    <span className="font-medium">{ad.location || 'Kampüs İçi'}</span>
                                </div>
                                <div className="flex items-center text-sm text-gray-400">
                                    <Calendar size={16} className="mr-3 text-gray-500" />
                                    <span className="font-medium">
                                        {/* Simple date formatting if backend sends an ISO string */}
                                        {ad.createdAt ? new Date(ad.createdAt).toLocaleDateString('tr-TR') : 'Tarih Yok'}
                                    </span>
                                </div>
                                <div className="flex items-center text-sm text-gray-400">
                                    <ShieldCheck size={16} className="mr-3 text-gray-500" />
                                    <span className="font-medium">{ad.condition || 'Belirtilmemiş'}</span>
                                </div>
                            </div>

                            {/* Seller Summary Card - Safety check for nested objects */}
                            {ad.seller && (
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6 flex items-center space-x-4">
                                    <div className="w-12 h-12 rounded-full bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center flex-shrink-0">
                                        <User size={20} className="text-cyan-400" />
                                    </div>
                                    <div>
                                        <div className="flex items-center space-x-2">
                                            <h4 className="text-white font-bold text-sm">@{ad.seller.username}</h4>
                                            {/* Only render this if the seller actually verified an edu mail */}
                                            {ad.seller.edu_email && (
                                                <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[8px] font-black uppercase tracking-wider">
                                                    Onaylı Öğrenci
                                                </span>
                                            )}
                                        </div>
                                        {ad.seller.university && (
                                            <p className="text-xs text-gray-500 mt-0.5">{ad.seller.university}</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Main Call to Action Button */}
                            <button className="w-full flex items-center justify-center space-x-2 bg-cyan-600 hover:bg-cyan-500 text-[#0B0F19] py-4 rounded-xl font-black uppercase tracking-widest transition-all shadow-[0_10px_20px_rgba(34,211,238,0.2)]">
                                <MessageSquare size={18} />
                                <span>Satıcıya Mesaj At</span>
                            </button>

                            <p className="text-[10px] text-gray-600 text-center mt-4 uppercase tracking-wider">
                                Güvenliğiniz için kampüs içi teslimat tercih edin.
                            </p>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
}