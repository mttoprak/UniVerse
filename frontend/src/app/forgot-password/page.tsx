"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, ArrowLeft, KeyRound, Loader2, CheckCircle, ShieldAlert, Lock, AlertCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
    const router = useRouter();

    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [identifier, setIdentifier] = useState('');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');

    const safeParse = async (response: Response) => {
        const text = await response.text();
        try {
            return JSON.parse(text);
        } catch (e) {
            let extractedError = "Sunucu JSON yerine HTML/Bilinmeyen format döndürdü.";
            if (text.includes("Cannot POST") || text.includes("Cannot GET")) {
                const match = text.match(/Cannot (POST|GET) \/[a-zA-Z0-9/_-]+/);
                if (match) extractedError = `Yanlış Endpoint: ${match[0]}`;
            }
            throw new Error(extractedError);
        }
    };

    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!identifier) return;

        setIsSubmitting(true);
        setError(null);

        try {
            const response = await fetch('http://localhost:5000/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usernameOrEmail: identifier })
            });

            if (response.ok || response.status === 200) {
                setStep(2);
            } else {
                const data = await safeParse(response);
                throw new Error(data.message || 'Kod gönderilirken bir hata oluştu.');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (code.length !== 6) {
            setError("Kod 6 haneli olmalıdır.");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const response = await fetch('http://localhost:5000/api/auth/verify-reset-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: identifier, code: code })
            });

            if (!response.ok) {
                const data = await safeParse(response);
                throw new Error(data.message || 'Kod hatalı veya süresi dolmuş.');
            }

            setStep(3);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword.length < 6) {
            setError("Şifre en az 6 karakter olmalıdır.");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const response = await fetch('http://localhost:5000/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: identifier, code: code, password: newPassword })
            });

            const data = await safeParse(response);

            if (!response.ok) {
                if (data.errors?.properties?.password) {
                    throw new Error(data.errors.properties.password.errors[0]);
                }
                throw new Error(data.message || 'Şifre sıfırlanamadı.');
            }

            if (data.accessToken) {
                localStorage.setItem('accessToken', data.accessToken);
                window.dispatchEvent(new Event('auth_status_changed'));
                router.push('/feed');
            } else {
                router.push('/login');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative text-gray-100">

            {/* Sonsuz Arkaplan Katmanı */}
            <div className="fixed inset-0 bg-[#0B0F19] -z-20"></div>

            <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] min-w-[500px] min-h-[500px] bg-pink-500/10 rounded-full blur-[150px] mix-blend-screen"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] min-w-[500px] min-h-[500px] bg-purple-500/10 rounded-full blur-[150px] mix-blend-screen"></div>
            </div>

            {/* İçerik Katmanı */}
            <div className="w-full max-w-md z-10">
                <Link href="/login" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-6 group">
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    Giriş Sayfasına Dön
                </Link>

                <div className="bg-[#0B0F19]/80 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 md:p-10 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-1 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent blur-sm"></div>

                    {error && (
                        <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm flex items-center gap-2 animate-in fade-in">
                            <AlertCircle size={18} className="flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {step === 1 && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex justify-center mb-6">
                                <div className="p-4 bg-cyan-500/10 rounded-2xl border border-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                                    <KeyRound size={32} className="text-cyan-400" />
                                </div>
                            </div>

                            <h1 className="text-2xl md:text-3xl font-black text-white text-center mb-2 tracking-tight">Şifreni mi unuttun?</h1>
                            <p className="text-gray-400 text-center text-sm mb-8 leading-relaxed">
                                Sisteme kayıtlı kullanıcı adını veya e-posta adresini gir, sana doğrulama kodu gönderelim.
                            </p>

                            <form onSubmit={handleSendCode} className="space-y-6">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">E-Posta veya Kullanıcı Adı</label>
                                    <div className="relative">
                                        <Mail size={20} className="absolute left-4 top-3.5 text-gray-500" />
                                        <input
                                            type="text"
                                            value={identifier}
                                            onChange={(e) => setIdentifier(e.target.value)}
                                            placeholder="isim@ogr.uni.edu.tr"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white outline-none focus:border-cyan-500/50 transition-colors"
                                            required
                                        />
                                    </div>
                                </div>

                                <button type="submit" disabled={isSubmitting || !identifier} className="w-full py-4 rounded-xl bg-cyan-500 text-black font-bold text-base hover:bg-cyan-400 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,211,238,0.2)] disabled:opacity-50 disabled:shadow-none">
                                    {isSubmitting ? <><Loader2 size={20} className="animate-spin" /> Sinyal Gönderiliyor...</> : 'Doğrulama Kodu Gönder'}
                                </button>
                            </form>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="animate-in fade-in slide-in-from-right-8 duration-500">
                            <div className="flex justify-center mb-6">
                                <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                                    <CheckCircle size={32} className="text-emerald-400" />
                                </div>
                            </div>

                            <h1 className="text-2xl md:text-3xl font-black text-white text-center mb-2 tracking-tight">Kodu Doğrula</h1>
                            <p className="text-gray-400 text-center text-sm mb-8 leading-relaxed">
                                <strong className="text-white">{identifier}</strong> adresiyle eşleşen hesaba 6 haneli bir kod gönderdik. Lütfen aşağıya girin. Spam kutunu kontrol etmeyi unutma.
                            </p>

                            <form onSubmit={handleVerifyCode} className="space-y-6">
                                <div className="space-y-1.5 text-center">
                                    <input
                                        type="text"
                                        maxLength={6}
                                        value={code}
                                        onChange={(e) => setCode(e.target.value)}
                                        placeholder="000000"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-4 focus:border-emerald-500/50 outline-none text-white text-3xl font-mono tracking-[0.5em] text-center"
                                        required
                                    />
                                </div>

                                <button type="submit" disabled={isSubmitting || code.length !== 6} className="w-full py-4 rounded-xl bg-emerald-500 text-[#0B0F19] font-black text-base hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50">
                                    {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : 'Kodu Onayla'}
                                </button>

                                <div className="text-center pt-2">
                                    <button type="button" onClick={() => setStep(1)} className="text-xs text-gray-500 hover:text-white transition-colors">
                                        Mail gelmedi mi? Başa dön.
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="animate-in fade-in slide-in-from-right-8 duration-500">
                            <div className="flex justify-center mb-6">
                                <div className="p-4 bg-cyan-500/10 rounded-2xl border border-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                                    <Lock size={32} className="text-cyan-400" />
                                </div>
                            </div>

                            <h1 className="text-2xl md:text-3xl font-black text-white text-center mb-2 tracking-tight">Yeni Şifre</h1>
                            <p className="text-gray-400 text-center text-sm mb-8 leading-relaxed">
                                Doğrulama başarılı. Şimdi hesabın için yeni bir şifre belirleyebilirsin.
                            </p>

                            <form onSubmit={handleResetPassword} className="space-y-6">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">Yeni Şifreniz</label>
                                    <div className="relative">
                                        <Lock size={20} className="absolute left-4 top-3.5 text-gray-500" />
                                        <input
                                            type="password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white outline-none focus:border-cyan-500/50 transition-colors"
                                            required
                                        />
                                    </div>
                                </div>

                                <button type="submit" disabled={isSubmitting || newPassword.length < 6} className="w-full py-4 rounded-xl bg-cyan-500 text-black font-bold text-base hover:bg-cyan-400 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,211,238,0.2)] disabled:opacity-50">
                                    {isSubmitting ? <><Loader2 size={20} className="animate-spin" /> Yenileniyor...</> : 'Şifreyi Değiştir ve Giriş Yap'}
                                </button>
                            </form>
                        </div>
                    )}

                </div>

                <div className="mt-8 flex items-center justify-center gap-2 text-xs text-gray-500">
                    <ShieldAlert size={14} className="text-rose-500/70" />
                    <p>Güvenliğiniz için sıfırlama kodları 15 dakika içinde geçerliliğini yitirir.</p>
                </div>
            </div>
        </div>
    );
}