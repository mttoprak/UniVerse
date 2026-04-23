"use client";

import Link from 'next/link';
import { Mail, Lock, ArrowRight } from 'lucide-react';

export default function LoginPage() {
    return (
        <div className="min-h-[80vh] flex items-center justify-center">
            <div className="absolute w-64 h-64 bg-cyan-500/10 blur-[120px] -z-10 rounded-full top-1/4 left-1/4"></div>

            <div className="w-full max-w-md p-8 bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-2xl">
                <div className="text-center mb-10">
                    <h2 className="text-3xl font-black text-white tracking-tight">Uni<span className="text-cyan-400">Verse</span></h2>
                    <p className="text-gray-500 mt-2">Hesabına ve ekosisteme giriş yap!</p>
                </div>

                <form className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400 ml-1">E-posta</label>
                        <div className="relative group">
                            <Mail className="absolute left-4 top-3.5 text-gray-600 group-focus-within:text-cyan-400 transition-colors" size={20} />
                            <input
                                type="email"
                                placeholder="ismin@email.com"
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/50 outline-none transition-all text-gray-200 placeholder:text-gray-700"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400 ml-1">Şifre</label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-3.5 text-gray-600 group-focus-within:text-cyan-400 transition-colors" size={20} />
                            <input
                                type="password"
                                placeholder="••••••••"
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/50 outline-none transition-all text-gray-200 placeholder:text-gray-700"
                            />
                        </div>
                    </div>

                    <button className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 text-[#0B0F19] font-black rounded-2xl shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] transition-all flex items-center justify-center space-x-2 group">
                        <span>GİRİŞ YAP</span>
                        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </form>

                <p className="text-center mt-8 text-gray-500 text-sm">
                    Henüz üye değil misin? <Link href="/register" className="text-cyan-400 font-bold hover:underline">Ücretsiz Kaydol</Link>
                </p>
            </div>
        </div>
    );
}