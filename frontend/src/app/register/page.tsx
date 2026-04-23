"use client";

import Link from 'next/link';
import { User, Mail, Lock, GraduationCap } from 'lucide-react';

export default function RegisterPage() {
    return (
        <div className="min-h-[80vh] flex items-center justify-center">
            <div className="absolute w-64 h-64 bg-violet-600/10 blur-[120px] -z-10 rounded-full bottom-1/4 right-1/4"></div>

            <div className="w-full max-w-md p-8 bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-2xl">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-black text-white tracking-tight">Yeni Hesap <span className="text-violet-400">Oluştur</span></h2>
                    <p className="text-gray-500 mt-2 text-sm">Kampüs hayatına dahil ol!</p>
                </div>

                <form className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <input type="text" placeholder="İsim" className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:border-violet-500/50 outline-none text-gray-200 placeholder:text-gray-800" />
                        <input type="text" placeholder="Soyisim" className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:border-violet-500/50 outline-none text-gray-200 placeholder:text-gray-800" />
                    </div>

                    <input type="email" placeholder="Kişisel E-posta (Gmail, Outlook vb.)" className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:border-violet-500/50 outline-none text-gray-200 placeholder:text-gray-800" />
                    <input type="password" placeholder="Şifre" className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:border-violet-500/50 outline-none text-gray-200 placeholder:text-gray-800" />

                    <button className="w-full mt-4 py-4 bg-violet-600 hover:bg-violet-500 text-white font-black rounded-2xl shadow-[0_0_20px_rgba(124,58,237,0.3)] transition-all">
                        HESAP OLUŞTUR
                    </button>
                </form>

                {/* Öğrenci Doğrulama Bilgi Kutusu */}
                <div className="mt-8 p-4 bg-violet-500/5 border border-violet-500/20 rounded-2xl flex items-start space-x-3 group hover:bg-violet-500/10 transition-colors">
                    <GraduationCap className="text-violet-400 mt-0.5 flex-shrink-0" size={18} />
                    <p className="text-[11px] leading-relaxed text-gray-400">
                        <strong className="text-violet-300 uppercase tracking-tighter">Öğrenci misin?</strong> Kayıt sonrası profilinden <code className="text-violet-300">.edu.tr</code> mailinle doğrulama yap, sadece öğrencilere özel ilanları ve takas özelliklerini aktifleştir.
                    </p>
                </div>

                <p className="text-center mt-6 text-gray-500 text-sm">
                    Zaten bir hesabın var mı? <Link href="/login" className="text-violet-400 font-bold hover:underline">Giriş Yap</Link>
                </p>
            </div>
        </div>
    );
}