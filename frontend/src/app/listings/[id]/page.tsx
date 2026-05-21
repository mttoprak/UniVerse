"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Heart, Share2, MessageSquare, MapPin, Calendar, User, ShieldCheck, Tag, Info, Loader2, Eye, AlertTriangle } from 'lucide-react';

// --- BACKEND ÇÖKERSE VEYA İLAN YOKSA GÖSTERİLECEK MOCK DATA ---
const MOCK_AD = {
    _id: "mock-123",
    title: "Test İlanı",
    description: "⚠️ DİKKAT: Bu bir test ilanıdır. Sunucuya bağlanılamadığı için örnek veri gösteriliyor.\n\nKlavye 3 ay kullanıldı, tüm tuşları ve RGB ışıkları sorunsuz çalışıyor. Yeni modele geçtiğim için satıyorum. Kutusu ve faturası tam. Sadece elden teslim.",
    price: 1250,
    category: "Elektronik",
    type: "secondhand",
    location: "Merkez Kampüs",
    condition: "Yeni Gibi",
    createdAt: new Date().toISOString(),
    views: 1337,
    photos: [
        "https://images.unsplash.com/photo-1595225476474-87563907a212?w=800&q=80",
        "https://images.unsplash.com/photo-1511556820780-d912e42b4980?w=800&q=80"
    ],
    seller: {
        username: "ahmetemingenc",
        edu_email: "ahmet@ogr.university.edu.tr",
        university: "Ege Üniversitesi",
        profile_photo: ""
    }
};

export default function AdDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id;

    // State Management for Data and Loading
    const [ad, setAd] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isMockData, setIsMockData] = useState(false);

    // UI States
    const [isFavorite, setIsFavorite] = useState(false);
    const [activeImage, setActiveImage] = useState(0);

    useEffect(() => {
        const fetchAdDetails = async () => {
            if (!id) return;

            try {
                setIsLoading(true);
                setIsMockData(false);

                const token = localStorage.getItem('accessToken');
                if (!token) {
                    router.push('/login');
                    return;
                }

                const response = await fetch(`http://localhost:5000/api/listing/${id}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                // HTML DÖNERSE DİYE GÜVENLİK KONTROLÜ
                const text = await response.text();
                let data;
                try {
                    data = JSON.parse(text);
                } catch (e) {
                    throw new Error("Sunucu JSON yerine HTML/Hata sayfası döndürdü. Backend rotasını kontrol edin.");
                }

                if (!response.ok) {
                    throw new Error(data.message || 'İlan bulunamadı.');
                }

                setAd(data.listing);
            } catch (err: any) {
                console.warn("Backend hatası yakalandı. Mock Data yükleniyor...", err);
                setAd(MOCK_AD);
                setIsMockData(true);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAdDetails();
    }, [id, router]);

    // Loading State UI
    if (isLoading) {
        return (
            <div className="min-h-screen pt-28 flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mb-4" />
                <p className="text-cyan-400 font-bold uppercase tracking-widest animate-pulse">İlan Verileri Yükleniyor...</p>
            </div>
        );
    }

    if (!ad) return null;

    const displayImages = ad.photos && ad.photos.length > 0
        ? ad.photos
        : ad.images && ad.images.length > 0
            ? ad.images
            : ["https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80"];

    const seller = ad.owner || ad.seller;

    // MVP Mesajlaşma Yöntemi: E-posta Yönlendirmesi
    const handleContactSeller = () => {
        const targetEmail = seller?.edu_email || seller?.email || "";
        if (!targetEmail) {
            alert("Satıcının iletişim adresi bulunamadı.");
            return;
        }
        const subject = encodeURIComponent(`UniVerse İlanı: ${ad.title}`);
        const body = encodeURIComponent(`Merhaba @${seller.username},\n\nUniVerse platformundaki "${ad.title}" başlıklı ilanınız için sizinle iletişime geçiyorum.\n\nİlan hala güncel mi?`);
        window.location.href = `mailto:${targetEmail}?subject=${subject}&body=${body}`;
    };

    return (
        <div className="min-h-screen pt-28 pb-12 px-4 relative">

            {isMockData && (
                <div className="absolute top-20 left-0 w-full bg-amber-500/20 border-b border-amber-500/50 py-2 z-40 flex items-center justify-center gap-2 backdrop-blur-md">
                    <AlertTriangle size={16} className="text-amber-500" />
                    <span className="text-amber-400 text-xs font-bold uppercase tracking-widest">Bağlantı Hatası: Şu an sahte (mock) ilan verisi görüntülüyorsunuz.</span>
                </div>
            )}

            <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-500/10 blur-[150px] rounded-full mix-blend-screen"></div>
                <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-emerald-500/10 blur-[150px] rounded-full mix-blend-screen"></div>
            </div>

            <div className="max-w-6xl mx-auto mt-4">

                <div className="flex items-center justify-between mb-8">
                    <Link href="/feed" className="flex items-center space-x-2 text-gray-400 hover:text-cyan-400 transition-colors group">
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

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden p-2">
                            <div className="aspect-[4/3] w-full rounded-2xl overflow-hidden bg-[#0B0F19] relative group flex items-center justify-center">
                                <img
                                    src={displayImages[activeImage]}
                                    alt={ad.title}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                            </div>

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

                    <div className="space-y-6">
                        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-[0_10px_30px_rgba(0,0,0,0.2)] sticky top-28">
                            <div className="mb-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-black uppercase tracking-widest">
                                        <Tag size={12} />
                                        <span>{ad.category || ad.type || 'Diğer'}</span>
                                    </div>

                                    <div className="flex items-center space-x-1.5 text-gray-500 text-xs font-bold" title="Görüntülenme">
                                        <Eye size={14} />
                                        <span>{ad.views || 1}</span>
                                    </div>
                                </div>

                                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight mb-4">
                                    {ad.title}
                                </h1>
                                <div className="text-4xl font-black text-emerald-400 tracking-tighter">
                                    {ad.price ? `${ad.price.toLocaleString('tr-TR')} ₺` : 'Fiyat Belirtilmemiş'}
                                </div>
                            </div>

                            <div className="space-y-4 mb-8 pt-6 border-t border-white/10">
                                <div className="flex items-center text-sm text-gray-400">
                                    <MapPin size={16} className="mr-3 text-gray-500" />
                                    <span className="font-medium">{ad.location || 'Konum Belirtilmemiş'}</span>
                                </div>
                                <div className="flex items-center text-sm text-gray-400">
                                    <Calendar size={16} className="mr-3 text-gray-500" />
                                    <span className="font-medium">
                                        {ad.createdAt ? new Date(ad.createdAt).toLocaleDateString('tr-TR') : 'Tarih Yok'}
                                    </span>
                                </div>
                                {ad.condition && (
                                    <div className="flex items-center text-sm text-gray-400">
                                        <ShieldCheck size={16} className="mr-3 text-gray-500" />
                                        <span className="font-medium">{ad.condition}</span>
                                    </div>
                                )}
                            </div>

                            {seller && (
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6 flex items-center space-x-4">
                                    <div className="w-12 h-12 rounded-full overflow-hidden bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center flex-shrink-0">
                                        {seller.avatar || seller.profile_photo ? (
                                            <img src={seller.avatar || seller.profile_photo} alt={seller.username} className="w-full h-full object-cover" />
                                        ) : (
                                            <User size={20} className="text-cyan-400" />
                                        )}
                                    </div>
                                    <div>
                                        <div className="flex items-center space-x-2">
                                            <h4 className="text-white font-bold text-sm">@{seller.username || 'Kullanıcı'}</h4>
                                            {seller.edu_email && (
                                                <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[8px] font-black uppercase tracking-wider">
                                                    Onaylı Öğrenci
                                                </span>
                                            )}
                                        </div>
                                        {seller.university && (
                                            <p className="text-xs text-gray-500 mt-0.5">{seller.university}</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* MVP İletişim Butonu */}
                            <button
                                onClick={handleContactSeller}
                                className="w-full flex items-center justify-center space-x-2 bg-cyan-600 hover:bg-cyan-500 text-[#0B0F19] py-4 rounded-xl font-black uppercase tracking-widest transition-all shadow-[0_10px_20px_rgba(34,211,238,0.2)]"
                            >
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