import Link from 'next/link';
import { Search, User, Zap } from 'lucide-react';

export default function Navbar() {
    return (
        <nav className="fixed w-full z-50 top-0 bg-[#0B0F19]/70 backdrop-blur-xl border-b border-white/5">
            <div className="max-w-[1440px] mx-auto px-6">
                <div className="flex items-center justify-between h-20">

                    {/* 1. SOL: Logo */}
                    <div className="flex-shrink-0 w-1/4">
                        <Link href="/" className="text-2xl font-black tracking-tighter text-white group">
                            UNI<span className="text-cyan-400 group-hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] transition-all">VERSE</span>
                        </Link>
                    </div>

                    {/* 2. ORTA: Navigasyon Linkleri */}
                    <div className="hidden lg:flex items-center justify-center space-x-10 w-2/4">
                        <Link href="/ilanlar" className="text-sm font-medium text-gray-400 hover:text-white transition-colors uppercase tracking-widest">
                            İlanlar
                        </Link>
                        <Link href="/acil-ilanlar" className="relative group flex items-center space-x-2 text-sm font-bold text-rose-500 hover:text-rose-400 transition-colors uppercase tracking-widest">
                            <Zap size={16} className="fill-rose-500 animate-pulse" />
                            <span>Acil İlanlar</span>
                            {/* Alt neon çizgi efekti */}
                            <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-rose-500 group-hover:w-full transition-all duration-300 shadow-[0_0_10px_#f43f5e]"></span>
                        </Link>
                    </div>

                    {/* 3. SAĞ: Arama ve Butonlar */}
                    <div className="flex items-center justify-end space-x-6 w-1/4">
                        {/* Minimalist Arama Çubuğu */}
                        <div className="hidden sm:flex items-center bg-white/5 border border-white/10 rounded-full px-4 py-1.5 focus-within:border-cyan-500/50 transition-all">
                            <Search size={16} className="text-gray-500" />
                            <input
                                type="text"
                                placeholder="Kampüste ara..."
                                className="bg-transparent border-none focus:ring-0 text-sm ml-2 w-32 lg:w-48 text-gray-200 placeholder:text-gray-600"
                            />
                        </div>

                        {/* Butonlar */}
                        <div className="flex items-center space-x-3">
                            <Link href="/login" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">
                                Giriş
                            </Link>
                            <Link href="/register" className="px-5 py-2 rounded-full bg-cyan-500 text-[#0B0F19] text-sm font-bold hover:bg-cyan-400 hover:shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all duration-300">
                                Kaydol
                            </Link>
                        </div>
                    </div>

                </div>
            </div>
        </nav>
    );
}