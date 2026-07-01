"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
    ChevronLeft, Heart, Share2, MessageSquare, MapPin, Calendar,
    User, ShieldCheck, Tag, Info, Loader2, Eye, AlertTriangle,
    Star, Send, Navigation, BookOpen, Briefcase, Link as LinkIcon,
    ListPlus, Clock, GraduationCap, Bookmark, Folder, Plus, Check, X
} from 'lucide-react';

const TYPE_MAP: Record<string, string> = {
    secondhand: 'İkinci El Satış',
    roommate: 'Ev/Oda Arkadaşı',
    carpooling: 'Yol Arkadaşı',
    course: 'Özel Ders',
    job: 'İş / Staj',
    scholarship: 'Burs'
};

const fixEncodingAndFormat = (text: any) => {
    if (typeof text !== 'string') return text;
    let str = text;
    try {
        if (/[ÄÃÅ]/.test(str)) {
            str = decodeURIComponent(escape(str));
        }
    } catch (e) {}

    return str
        .replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toLocaleUpperCase('tr-TR') + word.slice(1).toLocaleLowerCase('tr-TR'))
        .join(' ');
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://universe-1-vdkr.onrender.com';

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

    if (!response.ok) {
        throw new Error(`API Hatası: ${response.status}`);
    }

    const result = await response.json();
    if (result.errors) {
        throw new Error(result.errors[0].message);
    }
    return result.data;
}

// --- GRAPHQL SORGULARI ---
// 5 Ayrı REST isteğini TEK bir sorguda birleştirdik!
const GET_LISTING_PAGE_DATA = `#graphql
    query GetListingPageData($id: ID!) {
        getListing(id: $id) {
            _id: id title description price location type status features criteria photos views save_count is_deleted expires
            condition category subcategory origin destination departure_date available_seats subject format application_url deadline amount
            createdAt
            owner {
                _id: id username profile_photo account_type is_verified university
            }
        }
        getFavoriteListings {
            _id: id
        }
        getSavedListings
        getListingComments(listingId: $id, limit: 50) {
            comments {
                _id: id content rating createdAt
                author { username profile_photo }
            }
        }
        checkListingAgreement(listingId: $id) {
            hasAgreement
        }
    }
`;

const TOGGLE_FAVORITE = `#graphql
    mutation ToggleFavorite($listingId: ID!) {
        toggleFavorite(listingId: $listingId) { favorited }
    }
`;

const ADD_TO_SAVED = `#graphql
    mutation AddToSaved($input: AddToSavedInput!) {
        addToSaved(input: $input) { saved_listings }
    }
`;

const REMOVE_FROM_SAVED = `#graphql
    mutation RemoveFromSaved($input: RemoveFromSavedInput!) {
        removeFromSaved(input: $input) { saved_listings }
    }
`;

const CREATE_COMMENT = `#graphql
    mutation CreateComment($input: CreateCommentInput!) {
        createComment(input: $input) {
            _id: id content rating createdAt
            author { username profile_photo }
        }
    }
`;

const APPLY_TO_LISTING = `#graphql
    mutation ApplyToListing($listingId: ID!) {
        applyToListing(listingId: $listingId) { id }
    }
`;

export default function AdDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [ad, setAd] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isMockData, setIsMockData] = useState(false);
    const [isFavorite, setIsFavorite] = useState(false);
    const [activeImage, setActiveImage] = useState(0);

    const [canComment, setCanComment] = useState(false);
    const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
    const [isApplying, setIsApplying] = useState(false);

    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');
    const [rating, setRating] = useState(0);
    const [hoveredStar, setHoveredStar] = useState(0);
    const [commentLoading, setCommentLoading] = useState(false);
    const [commentError, setCommentError] = useState<string | null>(null);
    const [commentSuccess, setCommentSuccess] = useState<string | null>(null);

    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [userSavedLists, setUserSavedLists] = useState<Record<string, any[]>>({});
    const [newListName, setNewListName] = useState('');
    const [saveLoading, setSaveLoading] = useState(false);

    // Güvenli Tarih Formatlayıcı
    const parseSafeDate = (dateStr: string | null | undefined): Date | null => {
        if (!dateStr) return null;
        const parsedDate = /^\d+$/.test(dateStr) ? new Date(Number(dateStr)) : new Date(dateStr);
        return !isNaN(parsedDate.getTime()) ? parsedDate : null;
    };

    useEffect(() => {
        const fetchAllData = async () => {
            if (!id) return;
            try {
                setIsLoading(true);
                setIsMockData(false);

                const token = localStorage.getItem('accessToken');
                if (!token) {
                    router.push('/login');
                    return;
                }

                // Tek bir GraphQL isteği ile tüm sayfanın verisini çekiyoruz
                const data = await fetchGraphQL(GET_LISTING_PAGE_DATA, { id });

                if (!data.getListing) throw new Error("İlan bulunamadı.");

                // Acil ilan güvenlik yönlendirmesi
                if (data.getListing.type === 'urgent') {
                    router.replace(`/emergencies/${id}`);
                    return;
                }

                setAd(data.getListing);

                // Favoriler
                const favoritesArray = data.getFavoriteListings || [];
                setIsFavorite(favoritesArray.some((fav: any) => fav._id === id));

                // Koleksiyonlar
                setUserSavedLists(data.getSavedListings || {});

                // Yorumlar
                setComments(data.getListingComments?.comments || []);

                // Anlaşma Durumu (Yorum yetkisi)
                setCanComment(data.checkListingAgreement?.hasAgreement || false);

            } catch (err: any) {
                console.warn(err);
                setIsMockData(true);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAllData();
    }, [id, router]);

    const handlePrimaryAction = () => {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            router.push('/login');
            return;
        }

        if (ad.type === 'job' || ad.type === 'scholarship') {
            if (ad.application_url) {
                setIsApplyModalOpen(true);
            } else {
                alert("Bu ilan için başvuru linki bulunmamaktadır. Lütfen mesaj yoluyla iletişime geçin.");
                router.push(`/messages?listingId=${id}`);
            }
        } else {
            router.push(`/messages?listingId=${id}`);
        }
    };

    const handleToggleFavorite = async () => {
        const previousState = isFavorite;
        setIsFavorite(!isFavorite);
        try {
            await fetchGraphQL(TOGGLE_FAVORITE, { listingId: id });
        } catch (error) {
            setIsFavorite(previousState);
        }
    };

    const handleToggleSaveList = async (listName: string) => {
        setSaveLoading(true);
        try {
            const isSavedHere = userSavedLists[listName]?.some((item: any) => item._id === id);

            // Koleksiyonda varsa çıkar, yoksa ekle
            const mutationToCall = isSavedHere ? REMOVE_FROM_SAVED : ADD_TO_SAVED;
            const data = await fetchGraphQL(mutationToCall, {
                input: { listingId: id, listName }
            });

            const updatedLists = isSavedHere ? data.removeFromSaved.saved_listings : data.addToSaved.saved_listings;
            setUserSavedLists(updatedLists || {});
            setNewListName('');
        } catch (error) {
            console.log(error);
        } finally {
            setSaveLoading(false);
        }
    };

    const handleSubmitComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (rating === 0) return setCommentError("Lütfen bir yıldız puanı seçin.");
        if (newComment.trim().length < 2) return setCommentError("Yorumunuz çok kısa.");

        setCommentLoading(true); setCommentError(null); setCommentSuccess(null);

        try {
            const data = await fetchGraphQL(CREATE_COMMENT, {
                input: {
                    listingId: id,
                    content: newComment,
                    rating: rating
                }
            });

            setCommentSuccess("Değerlendirmeniz başarıyla gönderildi!");
            setNewComment(''); setRating(0);

            if (data.createComment) {
                setComments(prev => [data.createComment, ...prev]);
            }

            setTimeout(() => setCommentSuccess(null), 3000);
        } catch (err: any) {
            setCommentError(err.message || 'Yorum gönderilemedi.');
        } finally {
            setCommentLoading(false);
        }
    };

    const handleTrackedApplication = async () => {
        setIsApplying(true);
        try {
            await fetchGraphQL(APPLY_TO_LISTING, { listingId: ad._id });
            setIsApplyModalOpen(false);
            window.open(ad.application_url, '_blank', 'noopener,noreferrer');
        } catch (error: any) {
            // Eğer backend "Zaten başvurdunuz" hatası dönüyorsa, linki açmasına yine de izin veriyoruz.
            if (error.message.toLowerCase().includes('already') || error.message.toLowerCase().includes('zaten')) {
                setIsApplyModalOpen(false);
                window.open(ad.application_url, '_blank', 'noopener,noreferrer');
            } else {
                alert(error.message);
            }
        } finally {
            setIsApplying(false);
        }
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

    const displayImages = ad.photos && ad.photos.length > 0 ? ad.photos : ["https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80"];
    const seller = ad.owner || ad.seller;

    const renderDynamicRecord = (title: string, Icon: any, record: Record<string, string>, colorTheme: 'teal' | 'violet') => {
        if (!record || Object.keys(record).length === 0) return null;
        return (
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
                <h3 className={`text-xl font-black uppercase tracking-tight flex items-center space-x-2 mb-6 ${colorTheme === 'teal' ? 'text-teal-400' : 'text-violet-400'}`}>
                    <Icon size={20} /> <span>{title}</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(record).map(([key, value]) => (
                        <div key={key} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col justify-center">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">{fixEncodingAndFormat(key)}</span>
                            <span className="text-sm font-medium text-gray-200">{String(value)}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderCategorySpecificDetails = () => {
        switch (ad.type) {
            case 'carpooling':
                return (
                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-3xl p-8 shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
                        <h3 className="text-xl font-black text-emerald-400 uppercase tracking-tight flex items-center space-x-2 mb-6">
                            <Navigation size={20} /> <span>Yolculuk Detayları</span>
                        </h3>
                        <div className="grid grid-cols-2 gap-6">
                            <div><span className="text-xs text-gray-500 uppercase block mb-1">Nereden</span><span className="text-white font-bold">{fixEncodingAndFormat(ad.origin)}</span></div>
                            <div><span className="text-xs text-gray-500 uppercase block mb-1">Nereye</span><span className="text-white font-bold">{fixEncodingAndFormat(ad.destination)}</span></div>
                            <div><span className="text-xs text-gray-500 uppercase block mb-1">Kalkış Tarihi</span><span className="text-white font-bold">{ad.departure_date ? new Date(Number(ad.departure_date) || ad.departure_date).toLocaleString('tr-TR') : '-'}</span></div>
                            <div><span className="text-xs text-gray-500 uppercase block mb-1">Boş Koltuk</span><span className="text-white font-bold">{ad.available_seats} Kişi</span></div>
                        </div>
                    </div>
                );
            case 'course':
                return (
                    <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-3xl p-8 shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
                        <h3 className="text-xl font-black text-indigo-400 uppercase tracking-tight flex items-center space-x-2 mb-6">
                            <BookOpen size={20} /> <span>Ders Detayları</span>
                        </h3>
                        <div className="grid grid-cols-2 gap-6">
                            <div><span className="text-xs text-gray-500 uppercase block mb-1">Ders Konusu</span><span className="text-white font-bold">{fixEncodingAndFormat(ad.subject)}</span></div>
                            <div><span className="text-xs text-gray-500 uppercase block mb-1">Eğitim Formatı</span><span className="text-white font-bold">{ad.format === 'online' ? 'Online Eğitim' : 'Yüz Yüze'}</span></div>
                        </div>
                    </div>
                );
            case 'job':
            case 'scholarship':
                return (
                    <div className="bg-blue-500/5 border border-blue-500/20 rounded-3xl p-8 shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
                        <h3 className="text-xl font-black text-blue-400 uppercase tracking-tight flex items-center space-x-2 mb-6">
                            <Briefcase size={20} /> <span>Başvuru Detayları</span>
                        </h3>
                        <div className="grid grid-cols-2 gap-6">
                            {ad.amount && (
                                <div><span className="text-xs text-gray-500 uppercase block mb-1">Miktar</span><span className="text-white font-bold">{ad.amount} ₺</span></div>
                            )}
                            {ad.deadline && (
                                <div><span className="text-xs text-gray-500 uppercase block mb-1">Son Başvuru</span><span className="text-white font-bold">{new Date(Number(ad.deadline) || ad.deadline).toLocaleDateString('tr-TR')}</span></div>
                            )}
                            {ad.application_url && (
                                <div className="col-span-2">
                                    <span className="text-xs text-gray-500 uppercase block mb-1">Başvuru Linki</span>
                                    <a href={ad.application_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 font-bold flex items-center gap-2">
                                        <LinkIcon size={16} /> Linke Git
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                );
            case 'secondhand':
                return (
                    <div className="bg-rose-500/5 border border-rose-500/20 rounded-3xl p-8 shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
                        <h3 className="text-xl font-black text-rose-400 uppercase tracking-tight flex items-center space-x-2 mb-6">
                            <ShieldCheck size={20} /> <span>Ürün Durumu</span>
                        </h3>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <span className="text-xs text-gray-500 uppercase block mb-1">Kullanım Durumu</span>
                                <span className="text-white font-bold">
                                    {ad.condition === 'new' ? 'Sıfır' : ad.condition === 'like_new' ? 'Yeni Gibi' : ad.condition === 'good' ? 'İyi Durumda' : 'Hasarlı/Eski'}
                                </span>
                            </div>
                            {ad.subcategory && (
                                <div><span className="text-xs text-gray-500 uppercase block mb-1">Alt Kategori</span><span className="text-white font-bold">{fixEncodingAndFormat(ad.subcategory)}</span></div>
                            )}
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen pt-28 pb-12 px-4 relative">
            {isApplyModalOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#0B0F19] border border-cyan-500/30 rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-center mb-4">
                            <div className="p-4 bg-cyan-500/10 rounded-full border border-cyan-500/20">
                                <LinkIcon size={32} className="text-cyan-500" />
                            </div>
                        </div>
                        <h3 className="text-xl font-black text-white text-center mb-3">Başvuruyu Kaydet</h3>
                        <p className="text-gray-400 text-sm text-center mb-8">
                            Bu ilana başvurmak için harici bir siteye yönlendirileceksiniz. Yaptığınız başvurunun profilinizdeki <strong>"Başvurularım"</strong> sekmesinde görünmesini (sisteme kaydedilmesini) ister misiniz?
                        </p>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={handleTrackedApplication}
                                disabled={isApplying}
                                className="w-full py-3.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-black font-bold transition-all shadow-[0_0_15px_rgba(34,211,238,0.2)] disabled:opacity-50 flex justify-center items-center gap-2"
                            >
                                {isApplying ? <Loader2 size={18} className="animate-spin" /> : 'Sisteme Kaydet ve Linke Git'}
                            </button>
                            <button
                                onClick={() => {
                                    setIsApplyModalOpen(false);
                                    window.open(ad.application_url, '_blank', 'noopener,noreferrer');
                                }}
                                disabled={isApplying}
                                className="w-full py-3.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-medium transition-all"
                            >
                                Sadece Linke Git (Kaydetme)
                            </button>
                            <button
                                onClick={() => setIsApplyModalOpen(false)}
                                disabled={isApplying}
                                className="w-full py-3 rounded-xl bg-transparent text-gray-500 hover:text-rose-400 transition-all mt-2 font-medium"
                            >
                                İptal
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isSaveModalOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#0B0F19] border border-blue-500/30 rounded-3xl w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/5 shrink-0">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2"><Bookmark size={20} className="text-blue-400"/> Koleksiyona Kaydet</h3>
                            <button onClick={() => setIsSaveModalOpen(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
                        </div>

                        <div className="p-5 overflow-y-auto flex-1 space-y-2 custom-scrollbar">
                            {Object.keys(userSavedLists).length === 0 ? (
                                <p className="text-sm text-gray-500 text-center py-4">Henüz bir koleksiyonunuz yok.</p>
                            ) : (
                                Object.entries(userSavedLists).map(([listName, items]) => {
                                    const isSavedHere = items.some((item: any) => item._id === id);
                                    return (
                                        <button
                                            key={listName}
                                            onClick={() => handleToggleSaveList(listName)}
                                            disabled={saveLoading}
                                            className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-colors text-left group disabled:opacity-50"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Folder size={18} className="text-gray-400 group-hover:text-blue-400 transition-colors" />
                                                <span className="text-gray-200 font-medium text-sm">{listName}</span>
                                            </div>
                                            {isSavedHere ? <Check size={18} className="text-blue-500" /> : <Plus size={18} className="text-gray-600 opacity-0 group-hover:opacity-100" />}
                                        </button>
                                    );
                                })
                            )}
                        </div>

                        <div className="p-5 border-t border-white/10 bg-black/40 shrink-0">
                            <label className="block text-xs font-semibold text-gray-400 mb-2">YENİ KOLEKSİYON OLUŞTUR</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newListName}
                                    onChange={(e) => setNewListName(e.target.value)}
                                    placeholder="Örn: Ev Eşyaları..."
                                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-blue-500/50 transition-colors"
                                    onKeyDown={(e) => { if(e.key === 'Enter' && newListName.trim()) handleToggleSaveList(newListName.trim()) }}
                                />
                                <button
                                    onClick={() => handleToggleSaveList(newListName.trim())}
                                    disabled={saveLoading || !newListName.trim()}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm disabled:opacity-50 transition-colors"
                                >
                                    Ekle
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
                        <button onClick={handleToggleFavorite} className={`flex items-center space-x-2 transition-colors ${isFavorite ? 'text-rose-500' : 'text-gray-400 hover:text-rose-400'}`}>
                            <Heart size={18} className={`transition-all ${isFavorite ? "fill-rose-500 scale-110" : ""}`} />
                            <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">Favori</span>
                        </button>
                        <button onClick={() => setIsSaveModalOpen(true)} className={`flex items-center space-x-2 transition-colors text-gray-400 hover:text-blue-400`}>
                            <Bookmark size={18} className={`transition-all ${Object.values(userSavedLists).some(list => list.some(l => l._id === id)) ? "fill-blue-500 text-blue-500" : ""}`} />
                            <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">Kaydet</span>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden p-2">
                            <div className="aspect-[4/3] w-full rounded-2xl overflow-hidden bg-[#0B0F19] relative group flex items-center justify-center">
                                <img src={displayImages[activeImage]} alt={ad.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                            </div>

                            {displayImages.length > 1 && (
                                <div className="flex items-center gap-3 mt-3 px-2 pb-2 overflow-x-auto">
                                    {displayImages.map((img: string, idx: number) => (
                                        <button key={idx} onClick={() => setActiveImage(idx)} className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${activeImage === idx ? 'border-cyan-500 opacity-100' : 'border-transparent opacity-50 hover:opacity-100'}`}>
                                            <img src={img} alt="" className="w-full h-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
                            <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center space-x-2 mb-6">
                                <Info size={20} className="text-cyan-500" />
                                <span>İlan Açıklaması</span>
                            </h3>
                            <p className="text-gray-300 leading-relaxed text-sm whitespace-pre-wrap">{ad.description}</p>
                        </div>

                        {renderCategorySpecificDetails()}

                        {!(ad.type === 'secondhand' || ad.type === 'roommate') && renderDynamicRecord('Fiziksel Özellikler', Tag, ad.features, 'teal')}
                        {renderDynamicRecord('Kriterler / Beklentiler', ListPlus, ad.criteria, 'violet')}

                        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
                            <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center space-x-2 mb-6 border-b border-white/10 pb-4">
                                <MessageSquare size={20} className="text-emerald-500" />
                                <span>Değerlendirmeler ({comments.length})</span>
                            </h3>

                            {canComment ? (
                                <form onSubmit={handleSubmitComment} className="mb-10 bg-white/5 border border-white/10 rounded-2xl p-5 animate-in fade-in duration-300">
                                    <h4 className="text-sm font-bold text-gray-300 mb-3">Bu işlemi değerlendir:</h4>
                                    <div className="flex items-center space-x-2 mb-4">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button key={star} type="button" onClick={() => setRating(star)} onMouseEnter={() => setHoveredStar(star)} onMouseLeave={() => setHoveredStar(0)} className="focus:outline-none transition-transform hover:scale-110">
                                                <Star size={24} className={`transition-colors ${star <= (hoveredStar || rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-600'}`} />
                                            </button>
                                        ))}
                                    </div>
                                    <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Satıcı ve işlem hakkındaki düşüncelerini paylaş..." className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 focus:border-emerald-500/50 outline-none text-gray-200 resize-none text-sm mb-3" rows={3}></textarea>

                                    {commentError && <div className="mb-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-xs font-medium flex items-start gap-2"><AlertTriangle size={14} className="flex-shrink-0 mt-0.5" /><span>{commentError}</span></div>}
                                    {commentSuccess && <div className="mb-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs font-medium flex items-center gap-2"><ShieldCheck size={14} className="flex-shrink-0" /><span>{commentSuccess}</span></div>}

                                    <div className="flex justify-end">
                                        <button type="submit" disabled={commentLoading} className="py-2.5 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#0B0F19] font-black text-sm transition-all shadow-[0_5px_15px_rgba(16,185,129,0.2)] disabled:opacity-50 flex items-center gap-2">
                                            {commentLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} <span>Gönder</span>
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="mb-10 bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                                    <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-3 border border-amber-500/20">
                                        <ShieldCheck size={24} className="text-amber-500" />
                                    </div>
                                    <h4 className="text-sm font-bold text-gray-200 mb-1">Değerlendirme Kapalı</h4>
                                    <p className="text-xs text-gray-400 max-w-sm mx-auto">
                                        Bu ilana yorum yapabilmek ve puan verebilmek için satıcı ile aranızda kabul edilmiş bir anlaşma olması gerekmektedir.
                                    </p>
                                </div>
                            )}

                            <div className="space-y-4">
                                {comments.length === 0 ? (
                                    <p className="text-gray-500 text-sm text-center py-4 italic">Henüz değerlendirme yapılmamış.</p>
                                ) : (
                                    comments.map((comment: any) => {
                                        const cDate = parseSafeDate(comment.createdAt);
                                        return (
                                            <div key={comment._id} className="bg-white/5 border border-white/5 rounded-2xl p-5 hover:bg-white/10 transition-colors">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold uppercase overflow-hidden border border-emerald-500/30">
                                                            {comment.author?.profile_photo ? <img src={comment.author.profile_photo} alt="" className="w-full h-full object-cover" /> : comment.author?.username?.substring(0, 2) || "U"}
                                                        </div>
                                                        <div>
                                                            <h4 className="text-white text-sm font-bold">@{comment.author?.username || 'Kullanıcı'}</h4>
                                                            <span className="text-xs text-gray-500">{cDate ? cDate.toLocaleDateString('tr-TR') : ''}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
                                                        <Star size={12} className="fill-amber-400 text-amber-400 mr-1" />
                                                        <span className="text-amber-400 text-xs font-bold">{comment.rating || 5}.0</span>
                                                    </div>
                                                </div>
                                                <p className="text-gray-300 text-sm mt-3 ml-13 whitespace-pre-wrap pl-13">{comment.content}</p>
                                            </div>
                                        )
                                    })
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
                                        <span>{TYPE_MAP[ad.type] || ad.category || 'İlan'}</span>
                                    </div>

                                    <div className="flex items-center space-x-1.5 text-gray-500 text-xs font-bold" title="Görüntülenme">
                                        <Eye size={14} /><span>{ad.views || 1}</span>
                                    </div>
                                </div>

                                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight mb-4">{ad.title}</h1>
                                <div className="text-4xl font-black text-emerald-400 tracking-tighter">
                                    {ad.price ? `${ad.price.toLocaleString('tr-TR')} ₺` : 'Ücretsiz'}
                                </div>
                            </div>

                            <div className="space-y-4 mb-8 pt-6 border-t border-white/10">
                                <div className="flex items-center text-sm text-gray-400">
                                    <MapPin size={16} className="mr-3 text-cyan-500" />
                                    <span className="font-medium">{fixEncodingAndFormat(ad.location) || 'Konum Belirtilmemiş'}</span>
                                </div>
                                <div className="flex items-center text-sm text-gray-400">
                                    <Calendar size={16} className="mr-3 text-cyan-500" />
                                    <span className="font-medium">İlan Tarihi: {ad.createdAt ? (parseSafeDate(ad.createdAt)?.toLocaleDateString('tr-TR') || 'Tarih Yok') : 'Tarih Yok'}</span>
                                </div>
                                {ad.expires && (
                                    <div className="flex items-center text-sm text-amber-400/80">
                                        <Clock size={16} className="mr-3 text-amber-500" />
                                        <span className="font-medium">
                                            Geçerlilik: {parseSafeDate(ad.expires)?.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }) || ''}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {(ad.type === 'secondhand' || ad.type === 'roommate') && ad.features && Object.keys(ad.features).length > 0 && (
                                <div className="mb-6 pt-6 border-t border-white/10">
                                    <h4 className="flex items-center text-white text-sm font-bold uppercase tracking-widest mb-4">
                                        <Tag size={16} className="text-cyan-500 mr-2" /> Fiziksel Bilgiler
                                    </h4>
                                    <div className="flex flex-col space-y-3">
                                        {Object.entries(ad.features).map(([key, value]) => (
                                            <div key={key} className="flex justify-between items-center text-sm border-b border-white/5 pb-2 cursor-default group hover:bg-white/5 rounded px-2 -mx-2 transition-colors">
                                                <span className="text-gray-400 font-medium group-hover:text-gray-300 transition-colors">
                                                    {fixEncodingAndFormat(key)}
                                                </span>
                                                <span className="text-gray-200 font-bold text-right ml-4 max-w-[60%] truncate">
                                                    {typeof value === 'string' ? fixEncodingAndFormat(value) : String(value)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {seller && (
                                <div
                                    onClick={() => router.push(`/users/${seller._id || seller.id}`)}
                                    className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6 flex items-center space-x-4 cursor-pointer hover:bg-white/10 hover:border-cyan-500/50 transition-all group"
                                >
                                    <div className="w-12 h-12 rounded-full overflow-hidden bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center flex-shrink-0">
                                        {seller.avatar || seller.profile_photo ? (
                                            <img src={seller.avatar || seller.profile_photo} alt={seller.username} className="w-full h-full object-cover" />
                                        ) : (
                                            <User size={20} className="text-cyan-400" />
                                        )}
                                    </div>
                                    <div>
                                        <div className="flex items-center space-x-2">
                                            <h4 className="text-white font-bold text-sm group-hover:text-cyan-400 transition-colors">@{seller.username || 'Kullanıcı'}</h4>

                                            {seller.account_type === 'student' ? (
                                                seller.is_verified ? (
                                                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-wider border border-blue-500/30">
                                                        <GraduationCap size={12} /> Onaylı Öğrenci
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 text-[10px] font-black uppercase tracking-wider border border-blue-500/20">
                                                        <GraduationCap size={12} /> Öğrenci (Onaysız)
                                                    </span>
                                                )
                                            ) : (
                                                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-500/20 text-gray-400 text-[10px] font-black uppercase tracking-wider border border-gray-500/30">
                                                    <User size={12} /> Sivil
                                                </span>
                                            )}
                                        </div>
                                        {seller.university && <p className="text-xs text-gray-500 mt-0.5">{fixEncodingAndFormat(seller.university)}</p>}
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={handlePrimaryAction}
                                className="w-full py-4 rounded-2xl font-bold transition-all bg-cyan-500 text-black hover:bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                                {ad.type === 'job' || ad.type === 'scholarship' ? 'Hemen Başvur' : 'Mesaj Gönder'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}