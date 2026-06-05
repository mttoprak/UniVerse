"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Search, Zap, Plus, LogOut, ChevronDown, UserCircle, Loader2 } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';

export default function Navbar() {
    const router = useRouter();
    const pathname = usePathname();

    const [isMounted, setIsMounted] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // Arama Çubuğu Stateleri
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSearchResults, setShowSearchResults] = useState(false);

    // Dışarı Tıklamayı Algılamak İçin Ref'ler
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLDivElement>(null);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

    const checkAuth = () => {
        const token = localStorage.getItem('accessToken');
        setIsLoggedIn(!!token);
    };

    useEffect(() => {
        setIsMounted(true);
        checkAuth();

        window.addEventListener('auth_status_changed', checkAuth);

        return () => {
            window.removeEventListener('auth_status_changed', checkAuth);
        };
    }, [pathname]);

    // Dışarı Tıklanınca Menüleri Kapatma Mantığı (Click-Outside)
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // Profil menüsü dışına tıklanırsa
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
            // Arama menüsü dışına tıklanırsa
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowSearchResults(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

// Canlı Arama (Live Search) Mantığı - Debounce ile
    useEffect(() => {
        const fetchResults = async () => {
            if (searchTerm.trim().length < 2) {
                setSearchResults([]);
                setIsSearching(false);
                return;
            }

            setIsSearching(true);
            try {
                const token = localStorage.getItem('accessToken');

                const res = await fetch(`${API_URL}/api/listing?q=${encodeURIComponent(searchTerm.trim())}&page=1&limit=5`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                const text = await res.text();

                try {
                    const data = JSON.parse(text);
                    if (res.ok && data.listings) {
                        setSearchResults(data.listings);
                    } else {
                        setSearchResults([]);
                    }
                } catch (parseError) {
                    console.error("Backend'den geçersiz bir yanıt geldi (HTML dönmüş olabilir):", text.substring(0, 100));
                    setSearchResults([]);
                }

            } catch (error) {
                console.error("Arama bağlantı hatası:", error);
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        };

        // Kullanıcı yazmayı bıraktıktan 500ms sonra istek atar
        const delayDebounceFn = setTimeout(() => {
            fetchResults();
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, API_URL]);

    const handleLogout = () => {
        localStorage.removeItem('accessToken');
        setIsLoggedIn(false);
        setIsDropdownOpen(false);

        window.dispatchEvent(new Event('auth_status_changed'));
        router.push('/');
    };

    return (
        <nav className="fixed w-full z-50 top-0 backdrop-blur-xl bg-[#0B0F19]/60 shadow-[0_10px_30px_rgba(0,0,0,0.3)]">

            {/* gradient */}
            <div className="absolute inset-0 w-full h-full pointer-events-none bg-gradient-to-r from-cyan-500/10 via-transparent to-violet-500/10 opacity-90" />

            {/* neon effect */}
            <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-violet-500/20" />

            <div className="max-w-[1440px] mx-auto px-6 relative z-10">
                <div className="flex items-center justify-between h-20">

                    {/* logo */}
                    <div className="flex-shrink-0 w-1/4">
                        <Link href="/" className="text-2xl font-black tracking-tighter group flex items-center">
                            <span className="bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-400 bg-[length:200%_auto] bg-left text-white group-hover:text-transparent group-hover:bg-right transition-all duration-700 ease-out group-hover:drop-shadow-[0_0_20px_rgba(139,92,246,0.7)]" style={{ WebkitBackgroundClip: 'text', backgroundClip: 'text' }}>
                                UNI
                            </span>
                            <span className="ml-[1px] bg-gradient-to-r from-cyan-400 via-indigo-400 to-violet-500 bg-[length:200%_auto] bg-left text-transparent drop-shadow-[0_0_8px_rgba(124,58,237,0.4)] group-hover:bg-right group-hover:from-cyan-300 group-hover:via-cyan-400 group-hover:to-indigo-500 group-hover:drop-shadow-[0_0_20px_rgba(34,211,238,0.8)] transition-all duration-700 ease-out will-change-auto" style={{ WebkitBackgroundClip: 'text', backgroundClip: 'text' }}>
                                VERSE
                            </span>
                        </Link>
                    </div>

                    {/* navigation links */}
                    <div className="hidden lg:flex items-center justify-center space-x-10 w-2/4">
                        <Link href="/feed" className="text-sm font-bold text-gray-300 hover:text-cyan-300 transition-colors uppercase tracking-widest relative group">
                            <span>İlanlar</span>
                            <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-cyan-400 group-hover:w-full transition-all duration-300 shadow-[0_0_10px_rgba(34,211,238,0.5)]"></span>
                        </Link>

                        <Link href="/emergencies-feed" className="relative group flex items-center space-x-2 text-sm font-bold text-rose-500 hover:text-rose-400 transition-colors uppercase tracking-widest">
                            <Zap size={16} className="fill-rose-500 animate-pulse" />
                            <span>Acil İlanlar</span>
                            <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-rose-500 group-hover:w-full transition-all duration-300 shadow-[0_0_10px_#f43f5e]"></span>
                        </Link>
                    </div>

                    {/* search and auth actions */}
                    <div className="flex items-center justify-end space-x-6 w-1/4">

                        {/* CANLI ARAMA ALANI */}
                        <div className="relative hidden sm:flex items-center" ref={searchRef}>
                            <div className="flex items-center bg-white/5 border border-white/10 rounded-full px-4 py-2 focus-within:border-cyan-500/50 focus-within:bg-black/50 transition-all shadow-inner">
                                <Search size={16} className="text-gray-500" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        if (!showSearchResults) setShowSearchResults(true);
                                    }}
                                    onFocus={() => {
                                        if (searchTerm.trim().length > 1) setShowSearchResults(true);
                                    }}
                                    placeholder="Kampüste ara..."
                                    className="bg-transparent border-none focus:ring-0 text-sm ml-2 w-32 lg:w-48 text-gray-200 placeholder:text-gray-600 outline-none"
                                />
                            </div>

                            {/* CANLI ARAMA SONUÇLARI DROPDOWN */}
                            {showSearchResults && searchTerm.trim().length >= 2 && (
                                <div className="absolute top-[120%] right-0 w-72 bg-[#0B0F19]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden py-2 animate-in fade-in slide-in-from-top-2">
                                    {isSearching ? (
                                        <div className="flex items-center justify-center p-4 gap-2 text-cyan-400">
                                            <Loader2 size={16} className="animate-spin" />
                                            <span className="text-sm font-medium tracking-wide">Aranıyor...</span>
                                        </div>
                                    ) : searchResults.length > 0 ? (
                                        <div className="max-h-72 overflow-y-auto custom-scrollbar">
                                            {searchResults.map((listing) => (
                                                <button
                                                    key={listing._id}
                                                    onClick={() => {
                                                        setShowSearchResults(false);
                                                        setSearchTerm('');
                                                        router.push(`/listings/${listing._id}`);
                                                    }}
                                                    className="w-full text-left px-4 py-3 hover:bg-white/5 border-b border-white/5 last:border-0 transition-colors flex items-center gap-3"
                                                >
                                                    {listing.photos && listing.photos[0] ? (
                                                        <img src={listing.photos[0]} alt="" className="w-10 h-10 rounded-lg object-cover border border-white/10 flex-shrink-0" />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                                                            <Search size={14} className="text-gray-500" />
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-sm font-bold text-gray-200 truncate">{listing.title}</h4>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-xs text-cyan-400 font-black">{listing.price} ₺</span>
                                                            <span className="text-[10px] text-gray-500 px-1.5 py-0.5 bg-white/5 rounded-full uppercase tracking-wider">
                                                                {listing.type === 'secondhand' ? '2. El' : listing.type === 'service' ? 'Hizmet' : 'Ders Notu'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-4 text-center">
                                            <p className="text-sm text-gray-400 font-medium">Sonuç bulunamadı</p>
                                            <p className="text-xs text-gray-600 mt-1">Farklı kelimelerle tekrar deneyin.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {!isMounted ? (
                            <div className="w-32 h-10 animate-pulse bg-white/5 rounded-full"></div>
                        ) : isLoggedIn ? (
                            <div className="flex items-center space-x-4">
                                <Link href="/create-listing" className="hidden sm:flex items-center space-x-1 px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/50 rounded-xl hover:bg-emerald-500 hover:text-[#0B0F19] transition-all font-black text-xs uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.15)] hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                                    <Plus size={16} strokeWidth={3} />
                                    <span>İlan Ver</span>
                                </Link>

                                <div className="relative" ref={dropdownRef}>
                                    <button
                                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                        className="flex items-center space-x-2 p-1 pr-3 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all focus:outline-none"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-500/50">
                                            <UserCircle size={18} className="text-cyan-400" />
                                        </div>
                                        <ChevronDown size={14} className="text-gray-400" />
                                    </button>

                                    {isDropdownOpen && (
                                        <div className="absolute right-0 mt-3 w-48 bg-[#0B0F19]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden py-2 animate-in fade-in slide-in-from-top-2">
                                            <Link href="/profile" className="block px-4 py-2.5 text-sm font-medium text-gray-300 hover:text-cyan-300 hover:bg-white/5 transition-colors">
                                                Profilim
                                            </Link>
                                            <Link href="/profile" className="block px-4 py-2.5 text-sm font-medium text-gray-300 hover:text-cyan-300 hover:bg-white/5 transition-colors">
                                                Hesap Ayarları
                                            </Link>
                                            <div className="h-px w-full bg-white/10 my-1"></div>
                                            <button
                                                onClick={handleLogout}
                                                className="w-full flex items-center space-x-2 px-4 py-2.5 text-sm font-bold text-rose-400 hover:bg-rose-500/10 transition-colors"
                                            >
                                                <LogOut size={16} />
                                                <span>Çıkış Yap</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center space-x-4">
                                <Link href="/login" className="text-sm font-bold text-gray-400 hover:text-white transition-colors uppercase tracking-wider">
                                    Giriş
                                </Link>
                                <Link
                                    href="/register"
                                    className="whitespace-nowrap px-6 py-3 rounded-xl bg-violet-600 text-white text-sm font-black uppercase tracking-wider hover:bg-violet-500 shadow-[0_0_15px_rgba(124,58,237,0.4)] hover:shadow-[0_0_25px_rgba(124,58,237,0.6)] transition-all duration-300">
                                    Kayıt Ol
                                </Link>
                            </div>
                        )}
                    </div>

                </div>
            </div>

            {/* Özel Scrollbar CSS */}
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(34, 211, 238, 0.2); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(34, 211, 238, 0.5); }
            `}</style>
        </nav>
    );
}