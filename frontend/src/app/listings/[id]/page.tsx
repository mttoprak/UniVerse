"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Heart, Share2, MessageSquare, MapPin, Calendar, User, ShieldCheck, Tag, Info, Loader2, Eye, AlertTriangle, Star, Send } from 'lucide-react';

export default function AdDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    // Temel İlan ve Yükleme Durumları
    const [ad, setAd] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isMockData, setIsMockData] = useState(false);

    // UI Durumları
    const [isFavorite, setIsFavorite] = useState(false);
    const [activeImage, setActiveImage] = useState(0);

    // Yorum Sistemi Durumları
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');
    const [rating, setRating] = useState(0);
    const [hoveredStar, setHoveredStar] = useState(0);
    const [commentLoading, setCommentLoading] = useState(false);
    const [commentError, setCommentError] = useState<string | null>(null);
    const [commentSuccess, setCommentSuccess] = useState<string | null>(null);

    useEffect(() => {
        const fetchAdDetailsFavoritesAndComments = async () => {
            if (!id) return;

            try {
                setIsLoading(true);
                setIsMockData(false);

                const token = localStorage.getItem('accessToken');
                if (!token) {
                    router.push('/login');
                    return;
                }

                // 1. İLAN DETAYLARINI ÇEK
                const adResponse = await fetch(`http://localhost:5000/api/listing/${id}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                const adText = await adResponse.text();
                let adData;
                try {
                    adData = JSON.parse(adText);
                } catch (e) {
                    throw new Error("Sunucu JSON yerine HTML/Hata sayfası döndürdü.");
                }

                if (!adResponse.ok) {
                    throw new Error(adData.message || 'İlan bulunamadı.');
                }

                setAd(adData.listing);

                // 2. KULLANICININ FAVORİLERİNİ ÇEK VE KONTROL ET
                try {
                    const favResponse = await fetch('http://localhost:5000/api/user/me/favorites', {
                        method: 'GET',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });

                    if (favResponse.ok) {
                        const favData = await favResponse.json();
                        const favoritesArray = favData.listings || favData || [];
                        const isAlreadyFavorite = favoritesArray.some((fav: any) => fav._id === id);
                        setIsFavorite(isAlreadyFavorite);
                    }
                } catch (favErr) {
                    console.warn("Favoriler çekilirken hata oluştu.", favErr);
                }

                // 3. İLANA AİT YORUMLARI ÇEK
                try {
                    const commentsRes = await fetch(`http://localhost:5000/api/comment/listing/${id}`, {
                        method: 'GET',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });

                    if (commentsRes.ok) {
                        const commentsData = await commentsRes.json();
                        setComments(commentsData.comments || commentsData || []);
                    }
                } catch (commentErr) {
                    console.warn("Yorumlar çekilirken hata oluştu.", commentErr);
                }

            } catch (err: any) {
                console.warn("Backend hatası yakalandı. Lütfen yeniden deneyin...", err);
                setIsMockData(true);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAdDetailsFavoritesAndComments();
    }, [id, router]);

    // Favori Ekle/Çıkar İşlemi (Optimistic UI)
    const handleToggleFavorite = async () => {
        const token = localStorage.getItem('accessToken');
        if (!token) return router.push('/login');

        const previousState = isFavorite;
        setIsFavorite(!isFavorite);

        try {
            const response = await fetch(`http://localhost:5000/api/user/me/favorites/${id}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                setIsFavorite(previousState);
            }
        } catch (error) {
            setIsFavorite(previousState);
        }
    };

    // Yeni Yorum Gönderme İşlemi
    const handleSubmitComment = async (e: React.FormEvent) => {
        e.preventDefault();

        // Frontend Validasyonları
        if (rating === 0) {
            setCommentError("Lütfen bir yıldız puanı seçin.");
            return;
        }
        if (newComment.trim().length < 2) {
            setCommentError("Yorumunuz çok kısa. En az 2 karakter olmalıdır.");
            return;
        }

        setCommentLoading(true);
        setCommentError(null);
        setCommentSuccess(null);

        const token = localStorage.getItem('accessToken');
        const sellerTargetId = ad.owner?._id || ad.owner || ad.seller?._id;

        try {
            const response = await fetch('http://localhost:5000/api/comment/', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    listing: id,
                    target: sellerTargetId,
                    content: newComment,
                    rating: rating
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Yorum gönderilemedi. (Bu işlemi yapmak için satıcı ile anlaşma sağlamış olmanız gerekebilir.)');
            }

            // Başarılı olduğunda formu temizle ve yeni yorumu listeye ekle
            setCommentSuccess("Değerlendirmeniz başarıyla gönderildi!");
            setNewComment('');
            setRating(0);

            // Backend'den dönen yeni yorumu state'e ekleyerek sayfayı yenilemeden göster
            if (data.comment || data) {
                setComments(prev => [data.comment || data, ...prev]);
            }

            // 3 saniye sonra başarı mesajını kaldır
            setTimeout(() => setCommentSuccess(null), 3000);

        } catch (err: any) {
            setCommentError(err.message);
        } finally {
            setCommentLoading(false);
        }
    };

    // MVP İletişim: E-posta Yönlendirmesi
    const handleContactSeller = () => {
        const seller = ad.owner || ad.seller;
        const targetEmail = seller?.edu_email || seller?.email || "";
        if (!targetEmail) {
            setCommentError("Satıcının iletişim adresi bulunamadı."); // Alert yerine inline state kullanıyoruz
            return;
        }
        const subject = encodeURIComponent(`UniVerse İlanı: ${ad.title}`);
        const body = encodeURIComponent(`Merhaba @${seller.username},\n\nUniVerse platformundaki "${ad.title}" başlıklı ilanınız için sizinle iletişime geçiyorum.\n\nİlan hala güncel mi?`);
        window.location.href = `mailto:${targetEmail}?subject=${subject}&body=${body}`;
    };

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
                            onClick={handleToggleFavorite}
                            className={`flex items-center space-x-2 transition-colors ${isFavorite ? 'text-rose-500' : 'text-gray-400 hover:text-rose-400'}`}
                        >
                            <Heart size={18} className={`transition-all ${isFavorite ? "fill-rose-500 scale-110" : ""}`} />
                            <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">Favori</span>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">

                        {/* Görseller */}
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

                        {/* Açıklama Alanı */}
                        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
                            <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center space-x-2 mb-6">
                                <Info size={20} className="text-cyan-500" />
                                <span>İlan Detayları</span>
                            </h3>
                            <p className="text-gray-300 leading-relaxed text-sm whitespace-pre-wrap">
                                {ad.description}
                            </p>
                        </div>

                        {/* Yorumlar ve Değerlendirmeler Modülü */}
                        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
                            <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center space-x-2 mb-6 border-b border-white/10 pb-4">
                                <MessageSquare size={20} className="text-emerald-500" />
                                <span>Değerlendirmeler ({comments.length})</span>
                            </h3>

                            {/* Yorum Yazma Formu */}
                            <form onSubmit={handleSubmitComment} className="mb-10 bg-white/5 border border-white/10 rounded-2xl p-5">
                                <h4 className="text-sm font-bold text-gray-300 mb-3">Bu işlemi değerlendir:</h4>

                                <div className="flex items-center space-x-2 mb-4">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setRating(star)}
                                            onMouseEnter={() => setHoveredStar(star)}
                                            onMouseLeave={() => setHoveredStar(0)}
                                            className="focus:outline-none transition-transform hover:scale-110"
                                        >
                                            <Star
                                                size={24}
                                                className={`transition-colors ${star <= (hoveredStar || rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-600'}`}
                                            />
                                        </button>
                                    ))}
                                </div>

                                <textarea
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder="Satıcı ve işlem hakkındaki düşüncelerini paylaş..."
                                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 focus:border-emerald-500/50 outline-none text-gray-200 resize-none text-sm mb-3"
                                    rows={3}
                                ></textarea>

                                {commentError && (
                                    <div className="mb-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-xs font-medium flex items-start gap-2">
                                        <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                                        <span>{commentError}</span>
                                    </div>
                                )}

                                {commentSuccess && (
                                    <div className="mb-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs font-medium flex items-center gap-2">
                                        <ShieldCheck size={14} className="flex-shrink-0" />
                                        <span>{commentSuccess}</span>
                                    </div>
                                )}

                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={commentLoading}
                                        className="py-2.5 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#0B0F19] font-black text-sm transition-all shadow-[0_5px_15px_rgba(16,185,129,0.2)] disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {commentLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                        <span>Gönder</span>
                                    </button>
                                </div>
                            </form>

                            {/* Yorum Listesi */}
                            <div className="space-y-4">
                                {comments.length === 0 ? (
                                    <p className="text-gray-500 text-sm text-center py-4 italic">Henüz bir değerlendirme yapılmamış. İlk yorumu sen yap!</p>
                                ) : (
                                    comments.map((comment: any) => (
                                        <div key={comment._id} className="bg-white/5 border border-white/5 rounded-2xl p-5 hover:bg-white/10 transition-colors">
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold uppercase overflow-hidden border border-emerald-500/30">
                                                        {comment.author?.profile_photo ? (
                                                            <img src={comment.author.profile_photo} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            comment.author?.username?.substring(0, 2) || "U"
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-white text-sm font-bold">@{comment.author?.username || 'Kullanıcı'}</h4>
                                                        <span className="text-xs text-gray-500">
                                                            {new Date(comment.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
                                                    <Star size={12} className="fill-amber-400 text-amber-400 mr-1" />
                                                    <span className="text-amber-400 text-xs font-bold">{comment.rating || 5}.0</span>
                                                </div>
                                            </div>
                                            <p className="text-gray-300 text-sm mt-3 ml-13 whitespace-pre-wrap pl-13">
                                                {comment.content}
                                            </p>
                                        </div>
                                    ))
                                )}
                            </div>
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