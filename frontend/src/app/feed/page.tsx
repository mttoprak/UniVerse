"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, Filter, Clock, ChevronDown, ImageIcon, AlertCircle } from 'lucide-react';

interface Advert {
    _id: string;
    title: string;
    price: number | string;
    category: string;
    type: string;
    location: string;
    createdAt: string;
    photos?: string[];
    is_urgent?: boolean;
}

export default function FeedPage() {
    const router = useRouter();

    // State management for filters, data and UI
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [adverts, setAdverts] = useState<Advert[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Sorting states
    const [sortBy, setSortBy] = useState('newest');
    const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);

    const sortOptions = [
        { id: 'newest', label: 'En Yeni' },
        { id: 'price_asc', label: 'Fiyat (Artan)' },
        { id: 'price_desc', label: 'Fiyat (Azalan)' },
        { id: 'popular', label: 'En Popüler' }
    ];

    // Backend'deki 7 Ana Kategori (Type bazlı veya alt kategori)
    const categoryOptions = [
        { id: 'secondhand', label: 'İkinci El Eşya' },
        { id: 'roommate', label: 'Ev / Oda Arkadaşı' },
        { id: 'job', label: 'İş / Staj' },
        { id: 'scholarship', label: 'Burs' },
        { id: 'carpooling', label: 'Yol Arkadaşı' },
        { id: 'course', label: 'Özel Ders' },
        { id: 'textbooks_and_notes', label: 'Ders Notu / Kitap' }
    ];

    const handleCategoryToggle = (categoryId: string) => {
        setSelectedCategories(prev =>
            prev.includes(categoryId)
                ? prev.filter(c => c !== categoryId)
                : [...prev, categoryId]
        );
    };

    const fetchAdverts = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                router.push('/login');
                return;
            }

            const queryParams = new URLSearchParams();

            let API_URL = 'http://localhost:5000/api/listing';

            // Parametreleri Ekle
            if (searchQuery) queryParams.append('q', searchQuery);

            // Eğer kategori veya type seçildiyse (backend'in okuma mantığına göre tek string olarak)
            if (selectedCategories.length > 0) {
                queryParams.append('type', selectedCategories.join(','));
            }

            if (minPrice) queryParams.append('min_price', minPrice);
            if (maxPrice) queryParams.append('max_price', maxPrice);
            queryParams.append('sort', sortBy);

            API_URL = `${API_URL}?${queryParams.toString()}`;

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
                setError(`Sunucu Hatası: ${extractedError}`);
                setAdverts([]);
                setIsLoading(false);
                return;
            }

            if (!response.ok) {
                setError(data.message || 'İlanlar çekilirken bir hata oluştu.');
                setAdverts([]);
                setIsLoading(false);
                return;
            }

            const allListings = data.listings || [];

            // FRONTEND GÜVENLİK FİLTRESİ: Acil ilanları GÖSTERME (!ad.is_urgent)
            const standardListings = allListings.filter((ad: Advert) => !ad.is_urgent);

            setAdverts(standardListings);

        } catch (err: any) {
            console.error("Fetch Hatası:", err);
            setError(err.message || "İlanlar yüklenemedi.");
            setAdverts([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Filtreler değiştiğinde tetikleme (Debounce)
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchAdverts();
        }, 500); // Fiyat veya arama yazarken fazla istek gitmemesi için gecikme

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery, sortBy, selectedCategories]);

    const formatDate = (dateString: string) => {
        const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString('tr-TR', options);
    };

    // Kategori ismini okunabilir hale getiren yardımcı fonksiyon
    const getCategoryName = (advert: Advert) => {
        const found = categoryOptions.find(opt => opt.id === advert.type || opt.id === advert.category);
        return found ? found.label : (advert.category || advert.type || 'İlan');
    };

    return (
        <div className="relative min-h-screen pt-24 pb-12 px-4 md:px-8">

            {/* Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 flex items-center justify-center">
                <div className="w-[60rem] h-[60rem] bg-cyan-600/10 rounded-full blur-[200px] mix-blend-screen flex-shrink-0"></div>
            </div>

            <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">

                {/* Left Sidebar: Filters */}
                <aside className="w-full lg:w-72 flex-shrink-0 space-y-6">
                    <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 shadow-[0_0_30px_rgba(0,0,0,0.5)] sticky top-28">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-black text-white tracking-tight">Filtreler</h2>
                            <Filter size={20} className="text-cyan-400" />
                        </div>

                        {/* Search Input */}
                        <div className="relative mb-6">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                            <input
                                type="text"
                                placeholder="Ne aramıştınız?"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 focus:border-cyan-500/50 outline-none text-gray-200 text-sm transition-all"
                            />
                        </div>

                        {/* Categories (7 MVP Categories) */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Kategoriler</h3>
                            {categoryOptions.map((cat) => (
                                <label key={cat.id} className="flex items-center space-x-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={selectedCategories.includes(cat.id)}
                                        onChange={() => handleCategoryToggle(cat.id)}
                                        className="form-checkbox w-4 h-4 bg-black/50 border-white/20 rounded accent-cyan-500 cursor-pointer"
                                    />
                                    <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                                        {cat.label}
                                    </span>
                                </label>
                            ))}
                        </div>

                        {/* Price Filter */}
                        <div className="mt-6 mb-6">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Fiyat Aralığı</h3>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="number"
                                    placeholder="Min ₺"
                                    value={minPrice}
                                    onChange={(e) => setMinPrice(e.target.value)}
                                    className="w-1/2 bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm text-gray-200 outline-none focus:border-cyan-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <span className="text-gray-500">-</span>
                                <input
                                    type="number"
                                    placeholder="Max ₺"
                                    value={maxPrice}
                                    onChange={(e) => setMaxPrice(e.target.value)}
                                    className="w-1/2 bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm text-gray-200 outline-none focus:border-cyan-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                            </div>
                        </div>

                        <div className="h-px w-full bg-white/5 my-6"></div>

                        {/* Apply Filters Button */}
                        <button
                            onClick={() => fetchAdverts()}
                            className="w-full py-3 bg-cyan-600/20 hover:bg-cyan-600/40 border border-cyan-500/30 rounded-xl text-cyan-300 font-bold transition-all shadow-[0_0_15px_rgba(34,211,238,0.1)] hover:shadow-[0_0_20px_rgba(34,211,238,0.2)]"
                        >
                            Fiyatı Uygula
                        </button>
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1">

                    {/* Top Bar for Sorting */}
                    <div className="flex items-center justify-between mb-6 bg-black/20 backdrop-blur-md border border-white/5 rounded-2xl p-4 relative z-30">
                        <p className="text-sm text-gray-400">
                            {isLoading ? 'Yükleniyor...' : `${adverts.length} ilan bulundu`}
                        </p>

                        {/* Sort Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
                                className="flex items-center space-x-2 text-sm text-gray-300 hover:text-white transition-colors focus:outline-none"
                            >
                                <span>Sırala: <span className="font-bold text-cyan-400">{sortOptions.find(opt => opt.id === sortBy)?.label}</span></span>
                                <ChevronDown size={16} className={`transition-transform ${isSortMenuOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Dropdown Menu */}
                            {isSortMenuOpen && (
                                <div className="absolute right-0 mt-3 w-48 bg-[#0B0F19] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-20">
                                    {sortOptions.map((option) => (
                                        <button
                                            key={option.id}
                                            onClick={() => {
                                                setSortBy(option.id);
                                                setIsSortMenuOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-3 text-sm transition-colors hover:bg-white/5 ${sortBy === option.id ? 'text-cyan-400 font-bold bg-cyan-500/10' : 'text-gray-300'}`}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="w-full p-4 mb-6 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3 text-rose-400 text-sm font-medium">
                            <AlertCircle size={18} />
                            {error}
                        </div>
                    )}

                    {/* Advert Grid  */}
                    {!isLoading && adverts.length === 0 && !error ? (
                        <div className="w-full py-20 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-3xl bg-black/20">
                            <Search size={48} className="text-gray-600 mb-4" />
                            <h3 className="text-xl font-bold text-white mb-2">İlan Bulunamadı</h3>
                            <p className="text-gray-400 text-sm">Filtreleri değiştirerek tekrar deneyin.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {adverts.map((advert) => (
                                <div
                                    key={advert._id}
                                    onClick={() => router.push(`/listings/${advert._id}`)}
                                    className={`group bg-white/5 backdrop-blur-md border border-white/10 hover:border-cyan-500/30 rounded-2xl overflow-hidden transition-all hover:transform hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(34,211,238,0.1)] flex flex-col cursor-pointer relative`}
                                >

                                    {/* Image Container */}
                                    <div className="w-full h-48 bg-black/40 relative overflow-hidden flex items-center justify-center border-b border-white/5">
                                        {advert.photos && advert.photos.length > 0 ? (
                                            <img
                                                src={advert.photos[0]}
                                                alt={advert.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center text-white/20">
                                                <ImageIcon size={40} strokeWidth={1} />
                                                <span className="text-xs mt-2 uppercase tracking-widest">Görsel Yok</span>
                                            </div>
                                        )}

                                        {/* Category Badge overlayed on image */}
                                        <div className="absolute top-3 left-3">
                                            <span className="px-3 py-1.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg text-[10px] font-black uppercase tracking-wider text-cyan-400 shadow-xl">
                                                {getCategoryName(advert)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Card Content Area */}
                                    <div className="p-5 flex-1 flex flex-col justify-between">
                                        <div>
                                            <div className="flex justify-between items-start mb-3">
                                                <h2 className="text-base font-bold text-gray-100 leading-tight group-hover:text-cyan-300 transition-colors line-clamp-2">
                                                    {advert.title}
                                                </h2>
                                            </div>
                                            <h3 className="text-xl font-black text-emerald-400 mb-4">
                                                {advert.price ? `${Number(advert.price).toLocaleString('tr-TR')} ₺` : 'Ücretsiz'}
                                            </h3>
                                        </div>

                                        {/* Card Footer */}
                                        <div className="pt-4 border-t border-white/5 flex flex-col space-y-2">
                                            <div className="flex items-center text-gray-400 text-xs">
                                                <MapPin size={14} className="mr-1.5 text-cyan-400" />
                                                <span className="truncate">{advert.location || "Kampüs İçi"}</span>
                                            </div>
                                            <div className="flex items-center text-gray-500 text-xs">
                                                <Clock size={14} className="mr-1.5" />
                                                <span>{advert.createdAt ? formatDate(advert.createdAt) : 'Tarih Yok'}</span>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            ))}
                        </div>
                    )}

                </main>
            </div>
        </div>
    );
}