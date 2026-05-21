"use client";

import { Compass, Home, ArrowLeft, Zap } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function NotFound() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center font-sans overflow-hidden relative">

            {/* special animation declarations */}
            <style jsx>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0) scale(1); opacity: 0.1; }
                    50% { transform: translateY(-30px) scale(1.1); opacity: 0.2; }
                }
                @keyframes float-reverse {
                    0%, 100% { transform: translateY(0) scale(1); opacity: 0.1; }
                    50% { transform: translateY(30px) scale(0.9); opacity: 0.15; }
                }
                @keyframes fade-in-up {
                    0% { opacity: 0; transform: translateY(40px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                @keyframes glitch-flicker {
                    0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% { opacity: 0.5; }
                    20%, 24%, 55% { opacity: 0.8; }
                }
            `}</style>

            {/* background effects */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-violet-900/20 via-[#0B0F19] to-[#0B0F19]"></div>

            <div
                className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-[100px] pointer-events-none"
                style={{ animation: 'float 7s ease-in-out infinite' }}
            ></div>

            <div
                className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/20 rounded-full blur-[100px] pointer-events-none"
                style={{ animation: 'float-reverse 9s ease-in-out infinite' }}
            ></div>

            {/* star effect */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 pointer-events-none mix-blend-screen"></div>

            {/* main content */}
            <main
                className="relative z-10 max-w-2xl mx-auto px-6 text-center flex flex-col items-center"
                style={{ animation: 'fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
            >
                {/* big 404 glitch text */}
                <div className="relative mb-8 group cursor-default">
                    <h1 className="text-[120px] md:text-[180px] font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/10 leading-none select-none relative z-10 drop-shadow-[0_0_30px_rgba(255,255,255,0.1)] transition-transform duration-500 group-hover:scale-105">
                        404
                    </h1>
                    {/* animated neon effect */}
                    <div
                        className="absolute top-0 left-0 w-full h-full text-[120px] md:text-[180px] font-black text-violet-500 blur-[8px] -translate-x-2 translate-y-1 z-0 mix-blend-screen transition-all duration-300 group-hover:-translate-x-4 group-hover:translate-y-2 group-hover:blur-[12px]"
                        style={{ animation: 'glitch-flicker 3s infinite' }}
                    >
                        404
                    </div>
                    <div
                        className="absolute top-0 left-0 w-full h-full text-[120px] md:text-[180px] font-black text-cyan-400 blur-[8px] translate-x-2 -translate-y-1 z-0 mix-blend-screen transition-all duration-300 group-hover:translate-x-4 group-hover:-translate-y-2 group-hover:blur-[12px]"
                        style={{ animation: 'glitch-flicker 4s infinite reverse' }}
                    >
                        404
                    </div>
                </div>

                {/* message card */}
                <div className="bg-[#131B2F]/60 border border-white/10 backdrop-blur-md rounded-3xl p-8 md:p-10 mb-10 shadow-[0_0_40px_rgba(0,0,0,0.5)] relative overflow-hidden group/card hover:border-white/20 transition-colors duration-500">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-gradient-to-r from-transparent via-rose-500 to-transparent opacity-50 group-hover/card:w-3/4 group-hover/card:opacity-100 transition-all duration-700"></div>

                    <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_15px_rgba(225,29,72,0.2)] transition-transform duration-700 group-hover/card:rotate-180 group-hover/card:scale-110 group-hover/card:bg-rose-500/20">
                        <Compass size={32} className="text-rose-400" />
                    </div>

                    <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-4 tracking-tight">
                        Kampüs Sınırlarının Dışına Çıktın!
                    </h2>

                    <p className="text-slate-400 text-base md:text-lg mb-6 leading-relaxed">
                        Aradığın ilan zaman aşımına uğramış, ilan çoktan kapatılmış veya geçersiz bir bağlantıya tıklamış olabilirsin.
                    </p>

                    <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-4 text-sm text-violet-300 font-medium flex items-center justify-center gap-2">
                        <Zap size={16} className="text-violet-400 animate-pulse" />
                        Görünüşe göre yazılım ekibi buraya giden yolu henüz inşa etmemiş.
                    </div>
                </div>

                {/* nav buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
                    <Link
                        href="/"
                        className="w-full sm:w-auto bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white font-bold py-3.5 px-8 rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all duration-300 hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] hover:-translate-y-1 group"
                    >
                        <Home size={18} className="group-hover:scale-110 transition-transform duration-300" />
                        Ana Sayfaya Dön
                    </Link>

                    <button
                        onClick={() => router.back()}
                        className="w-full sm:w-auto bg-transparent border border-white/10 hover:border-white/30 text-slate-300 hover:text-white font-medium py-3.5 px-8 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 hover:bg-white/5 hover:-translate-y-1 group"
                    >
                        <ArrowLeft size={18} className="group-hover:-translate-x-2 transition-transform duration-300" />
                        Geri Git
                    </button>
                </div>

            </main>
        </div>
    );
}