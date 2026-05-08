"use client";

import { useState, useEffect } from 'react';
import { Search, MapPin, Filter, Tag, Clock, ChevronDown, ImageIcon } from 'lucide-react';

// 1. define the typescript interface for our advert data
interface Advert {
    _id: string;
    title: string;
    price: string;
    category: string;
    location: string;
    createdAt: string;
    photos?: string;
}

export default function FeedPage() {
    // 2. state management for filters, data and UI
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [adverts, setAdverts] = useState<Advert[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // sorting states
    const [sortBy, setSortBy] = useState('newest');
    const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);

    const sortOptions = [
        { id: 'newest', label: 'En Yeni' },
        { id: 'price_asc', label: 'Fiyat (Artan)' },
        { id: 'price_desc', label: 'Fiyat (Azalan)' }
    ];

    const handleCategoryToggle = (category: string) => {
        setSelectedCategories(prev =>
            prev.includes(category)
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    };


    // 3. fetch adverts from backend
    useEffect(() => {
        const fetchAdverts = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const queryParams = new URLSearchParams();
                if (searchQuery) queryParams.append('search', searchQuery);
                queryParams.append('sort', sortBy);

                if (selectedCategories.length > 0) {
                    queryParams.append('category', selectedCategories.join(','));
                }
                if (minPrice) queryParams.append('min_price', minPrice);
                if (maxPrice) queryParams.append('max_price', maxPrice);

                const API_URL = `http://localhost:5000/api/listing/feed`;
                const response = await fetch(API_URL);

                if (!response.ok) {
                    throw new Error('Failed to fetch adverts');
                }

                const data = await response.json();
                setAdverts(data.listings || []);
            } catch (err) {
                console.error("Error fetching data:", err);
                setError("İlanlar yüklenirken bir hata oluştu.");

                // fallback mock data if backend is not ready yet
                setAdverts([
                    { _id: '1', title: "Matematik 1 Notları (Tüm Dönem)", price: "₺150", category: "Notlar", location: "Mühendislik Fakültesi", createdAt: "2 saat önce", photos: "https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=500&q=60" },
                    { _id: '2', title: "MacBook Air M1 (Sıfıra Yakın)", price: "₺18000", category: "İkinci El", location: "Merkez Kütüphane", createdAt: "2 gün önce", photos: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=500&q=60" },
                    { _id: '3', title: "Cuma günü İstanbul'a Yol Arkadaşı", price: "₺400", category: "Yol Arkadaşı", location: "Kampüs Ana Giriş", createdAt: "5 saat önce" }
                ]);
            } finally {
                setIsLoading(false);
            }
        };

        // use a small delay for searching so we don't spam the server on every keystroke
        const delayDebounceFn = setTimeout(() => {
            fetchAdverts();
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery, sortBy, selectedCategories, minPrice, maxPrice]); // re-run effect when search or sort changes

    return (
        <div className="relative min-h-screen pt-24 pb-12 px-4 md:px-8">

            {/* fixed background with 60x60 rem light ball */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 flex items-center justify-center">
                <div className="w-[60rem] h-[60rem] bg-cyan-600/10 rounded-full blur-[200px] mix-blend-screen flex-shrink-0"></div>
            </div>

            <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">

                {/* left sidebar: filters */}
                <aside className="w-full lg:w-72 flex-shrink-0 space-y-6">
                    <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-black text-white tracking-tight">Filtreler</h2>
                            <Filter size={20} className="text-cyan-400" />
                        </div>

                        {/* search input */}
                        <div className="relative mb-6">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                            <input
                                type="text"
                                placeholder="İlanlarda ara..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 focus:border-cyan-500/50 outline-none text-gray-200 text-sm transition-all"
                            />
                        </div>

                        {/* categories */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Kategoriler</h3>
                            {['İkinci El', 'Notlar', 'Yol Arkadaşı', 'Ev Arkadaşı', 'Özel Ders'].map((cat) => (
                                <label key={cat} className="flex items-center space-x-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={selectedCategories.includes(cat)}
                                        onChange={() => handleCategoryToggle(cat)}
                                        className="form-checkbox bg-black/50 border-white/20 rounded text-cyan-500 focus:ring-cyan-500/30"
                                    />
                                    <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{cat}</span>
                                </label>
                            ))}
                        </div>

                        {/* price filter */}
                        <div className="mt-6 mb-6">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Fiyat Aralığı</h3>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="number"
                                    placeholder="Min ₺"
                                    value={minPrice}
                                    onChange={(e) => setMinPrice(e.target.value)}
                                    className="w-1/2 bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm text-gray-200 outline-none focus:border-cyan-500/50"
                                />
                                <span className="text-gray-500">-</span>
                                <input
                                    type="number"
                                    placeholder="Max ₺"
                                    value={maxPrice}
                                    onChange={(e) => setMaxPrice(e.target.value)}
                                    className="w-1/2 bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm text-gray-200 outline-none focus:border-cyan-500/50"
                                />
                            </div>
                        </div>

                        <div className="h-px w-full bg-white/5 my-6"></div>

                        {/* apply button */}
                        <button className="w-full py-3 bg-cyan-600/20 hover:bg-cyan-600/40 border border-cyan-500/30 rounded-xl text-cyan-300 font-bold transition-all shadow-[0_0_15px_rgba(34,211,238,0.1)] hover:shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                            Filtreleri Uygula
                        </button>
                    </div>
                </aside>

                {/* advert grid (main content area) */}
                <main className="flex-1">

                    {/* top bar for sorting */}
                    <div className="flex items-center justify-between mb-6 bg-black/20 backdrop-blur-md border border-white/5 rounded-2xl p-4 relative z-30">
                        <p className="text-sm text-gray-400">
                            {isLoading ? 'Yükleniyor...' : `Şu an ${adverts.length} aktif ilan gösteriliyor`}
                        </p>

                        {/* sort dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
                                className="flex items-center space-x-2 text-sm text-gray-300 hover:text-white transition-colors focus:outline-none"
                            >
                                <span>Sırala: <span className="font-bold text-cyan-400">{sortOptions.find(opt => opt.id === sortBy)?.label}</span></span>
                                <ChevronDown size={16} className={`transition-transform ${isSortMenuOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {/* dropdown menu */}
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

                    {/* error message */}
                    {error && (
                        <div className="w-full p-4 mb-6 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-center text-sm">
                            {error} - Örnek veriler gösteriliyor.
                        </div>
                    )}

                    {/* advert grid  */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {adverts.map((advert) => (
                            <div key={advert._id} className="group bg-white/5 backdrop-blur-md border border-white/10 hover:border-cyan-500/30 rounded-2xl overflow-hidden transition-all hover:transform hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(34,211,238,0.1)] flex flex-col cursor-pointer">

                                {/* image container */}
                                <div className="w-full h-48 bg-black/40 relative overflow-hidden flex items-center justify-center border-b border-white/5">
                                    {advert.photos ? (
                                        <img
                                            src={advert.photos[0]}
                                            alt={advert.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        // fallback when no image is provided
                                        <div className="flex flex-col items-center justify-center text-white/20">
                                            <ImageIcon size={40} strokeWidth={1} />
                                            <span className="text-xs mt-2 uppercase tracking-widest">Görsel Yok</span>
                                        </div>
                                    )}

                                    {/* category badge overlayed on image */}
                                    <div className="absolute top-3 left-3">
                    <span className="px-3 py-1.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg text-xs font-bold text-cyan-400 shadow-xl">
                      {advert.category}
                    </span>
                                    </div>
                                </div>

                                {/* card content area */}
                                <div className="p-5 flex-1 flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start mb-3">
                                            <h2 className="text-base font-bold text-gray-100 leading-tight group-hover:text-cyan-300 transition-colors line-clamp-2">
                                                {advert.title}
                                            </h2>
                                        </div>
                                        <h3 className="text-xl font-black text-white mb-4">{advert.price}</h3>
                                    </div>

                                    {/* card footer */}
                                    <div className="pt-4 border-t border-white/5 flex flex-col space-y-2">
                                        <div className="flex items-center text-gray-400 text-xs">
                                            <MapPin size={14} className="mr-1.5 text-rose-400" />
                                            <span className="truncate">{advert.location}</span>
                                        </div>
                                        <div className="flex items-center text-gray-500 text-xs">
                                            <Clock size={14} className="mr-1.5" />
                                            <span>{advert.createdAt}</span>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        ))}
                    </div>

                </main>
            </div>
        </div>
    );
}