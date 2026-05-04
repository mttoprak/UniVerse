"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Zap, User, Plus, LogOut, ChevronDown, UserCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Navbar() {
    const router = useRouter();

    // states for auth and UI
    const [isMounted, setIsMounted] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // check for access token only on the client side to prevent hydration errors
    useEffect(() => {
        setIsMounted(true);
        const token = localStorage.getItem('accessToken');
        if (token) {
            setIsLoggedIn(true);
        }
    }, []);

    // handle user logout
    const handleLogout = () => {
        localStorage.removeItem('accessToken');
        setIsLoggedIn(false);
        setIsDropdownOpen(false);
        router.push('/');
    };

    return (
        <nav className="fixed w-full z-50 top-0 bg-[#0B0F19]/70 backdrop-blur-xl border-b border-white/5">
            <div className="max-w-[1440px] mx-auto px-6">
                <div className="flex items-center justify-between h-20">

                    {/* logo */}
                    <div className="flex-shrink-0 w-1/4">
                        <Link href="/" className="text-2xl font-black tracking-tighter text-white group">
                            UNI<span className="text-cyan-400 group-hover:drop-shadow-[0_0_12px_rgba(34,211,238,0.8)] transition-all">VERSE</span>
                        </Link>
                    </div>

                    {/* navigation links */}
                    <div className="hidden lg:flex items-center justify-center space-x-10 w-2/4">
                        <Link href="/feed" className="text-sm font-bold text-gray-400 hover:text-white transition-colors uppercase tracking-widest relative group">
                            <span>İlanlar</span>
                            <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-cyan-500 group-hover:w-full transition-all duration-300"></span>
                        </Link>

                        {/* directed to the emergencies page we built earlier */}
                        <Link href="/emergencies-feed" className="relative group flex items-center space-x-2 text-sm font-bold text-rose-500 hover:text-rose-400 transition-colors uppercase tracking-widest">
                            <Zap size={16} className="fill-rose-500 animate-pulse" />
                            <span>Acil İlanlar</span>
                            <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-rose-500 group-hover:w-full transition-all duration-300 shadow-[0_0_10px_#f43f5e]"></span>
                        </Link>
                    </div>

                    {/* search and auth actions */}
                    <div className="flex items-center justify-end space-x-6 w-1/4">

                        {/* search bar */}
                        <div className="hidden sm:flex items-center bg-white/5 border border-white/10 rounded-full px-4 py-2 focus-within:border-cyan-500/50 focus-within:bg-black/50 transition-all shadow-inner">
                            <Search size={16} className="text-gray-500" />
                            <input
                                type="text"
                                placeholder="Kampüste ara..."
                                className="bg-transparent border-none focus:ring-0 text-sm ml-2 w-32 lg:w-48 text-gray-200 placeholder:text-gray-600 outline-none"
                            />
                        </div>

                        {/* hydration safe area: wait for mount to decide which auth buttons to show */}
                        {!isMounted ? (
                            <div className="w-32 h-10 animate-pulse bg-white/5 rounded-full"></div>
                        ) : isLoggedIn ? (
                            // LOGGED IN STATE
                            <div className="flex items-center space-x-4">
                                <Link href="/create-ad" className="hidden sm:flex items-center space-x-1 px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/50 rounded-xl hover:bg-emerald-500 hover:text-[#0B0F19] transition-all font-black text-xs uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.15)] hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                                    <Plus size={16} strokeWidth={3} />
                                    <span>İlan Ver</span>
                                </Link>

                                {/* user profile dropdown */}
                                <div className="relative">
                                    <button
                                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                        className="flex items-center space-x-2 p-1 pr-3 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all focus:outline-none"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-500/50">
                                            <UserCircle size={18} className="text-cyan-400" />
                                        </div>
                                        <ChevronDown size={14} className="text-gray-400" />
                                    </button>

                                    {/* dropdown menu */}
                                    {isDropdownOpen && (
                                        <div className="absolute right-0 mt-3 w-48 bg-[#0B0F19]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden py-2 animate-in fade-in slide-in-from-top-2">
                                            <Link href="/profile" className="block px-4 py-2.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors">
                                                Profilim
                                            </Link>
                                            <Link href="/settings" className="block px-4 py-2.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors">
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
                            // LOGGED OUT STATE
                            <div className="flex items-center space-x-4">
                                <Link href="/login" className="text-sm font-bold text-gray-400 hover:text-white transition-colors uppercase tracking-wider">
                                    Giriş
                                </Link>
                                <Link
                                    href="/register"
                                    className="whitespace-nowrap px-6 py-3 rounded-xl bg-cyan-500 text-[#0B0F19] text-sm font-black uppercase tracking-wider hover:bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)] hover:shadow-[0_0_25px_rgba(34,211,238,0.5)] transition-all duration-300">
                                    Kayıt Ol
                                </Link>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </nav>
    );
}