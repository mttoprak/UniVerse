"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, KeyRound, Loader2, CheckCircle, ShieldAlert } from 'lucide-react';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email) return;

        setIsSubmitting(true);
        setTimeout(() => {
            setIsSubmitting(false);
            setIsSubmitted(true);
        }, 1500);
    };

    return (
        // background gradient
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-[#050B14] via-[#0A1128] to-[#050B14]">
            <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[150px] pointer-events-none"></div>
            <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-rose-500/10 rounded-full blur-[150px] pointer-events-none"></div>

            <div className="w-full max-w-md z-10">
                {/* return botton */}
                <Link
                    href="/login"
                    className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-6 group"
                >
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    Giriş Sayfasına Dön
                </Link>

                <div className="bg-[#0B0F19]/80 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 md:p-10 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden">

                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-1 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent blur-sm"></div>

                    {!isSubmitted ? (
                        /* step 1: e-mail */
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex justify-center mb-6">
                                <div className="p-4 bg-cyan-500/10 rounded-2xl border border-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                                    <KeyRound size={32} className="text-cyan-400" />
                                </div>
                            </div>

                            <h1 className="text-2xl md:text-3xl font-black text-white text-center mb-2 tracking-tight">Şifreni mi Unuttun?</h1>
                            <p className="text-gray-400 text-center text-sm mb-8 leading-relaxed">
                                Endişelenme! Sisteme kayıtlı e-posta adresini gir, sana şifreni sıfırlayabilmen için gizli bir bağlantı gönderelim.
                            </p>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">E-Posta Adresi</label>
                                    <div className="relative">
                                        <Mail size={20} className="absolute left-4 top-3.5 text-gray-500" />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="ornek@uni-verse.com"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white outline-none focus:border-cyan-500/50 transition-colors placeholder:text-gray-600"
                                            required
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting || !email}
                                    className="w-full py-4 rounded-xl bg-cyan-500 text-black font-bold text-base hover:bg-cyan-400 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,211,238,0.2)] disabled:opacity-50 disabled:shadow-none"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 size={20} className="animate-spin" />
                                            Gönderiliyor...
                                        </>
                                    ) : (
                                        'Sıfırlama Bağlantısı Gönder'
                                    )}
                                </button>
                            </form>
                        </div>
                    ) : (
                        /* step 2: success notification */
                        <div className="animate-in fade-in zoom-in-95 duration-500 text-center py-4">
                            <div className="flex justify-center mb-6">
                                <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.2)] relative">
                                    <div className="absolute inset-0 bg-emerald-500/20 rounded-2xl animate-ping opacity-20"></div>
                                    <CheckCircle size={40} className="text-emerald-400 relative z-10" />
                                </div>
                            </div>

                            <h2 className="text-2xl font-black text-white mb-3">E-Posta Gönderildi!</h2>
                            <p className="text-gray-400 text-sm leading-relaxed mb-8">
                                <strong className="text-white">{email}</strong> adresine şifre sıfırlama talimatlarını içeren bir mail gönderdik. Lütfen Spam/Gereksiz kutunu da kontrol etmeyi unutma.
                            </p>

                            <div className="space-y-4">
                                <Link
                                    href="/login"
                                    className="block w-full py-4 rounded-xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-colors"
                                >
                                    Giriş Ekranına Dön
                                </Link>

                                <button
                                    onClick={() => {
                                        setIsSubmitted(false);
                                        setEmail('');
                                    }}
                                    className="text-xs text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                                >
                                    Mail gelmedi mi? Tekrar dene.
                                </button>
                            </div>
                        </div>
                    )}

                </div>

                {/* security note */}
                <div className="mt-8 flex items-center justify-center gap-2 text-xs text-gray-500">
                    <ShieldAlert size={14} className="text-rose-500/70" />
                    <p>Güvenliğiniz için şifre sıfırlama bağlantıları 1 saat sonra geçersiz olur.</p>
                </div>
            </div>
        </div>
    );
}