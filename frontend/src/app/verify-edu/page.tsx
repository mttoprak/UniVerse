"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap, Mail, KeyRound, Loader2, AlertCircle, ArrowLeft, CheckCircle, ShieldCheck } from 'lucide-react';

export default function VerifyEduPage() {
    const router = useRouter();

    const [step, setStep] = useState<1 | 2>(1); // 1: Kod Gönder, 2: Kodu Gir
    const [isLoading, setIsLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const [eduEmail, setEduEmail] = useState('');
    const [code, setCode] = useState('');

    // pull the users edu_mail address when the page opens
    useEffect(() => {
        const fetchUserData = async () => {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                router.push('/login');
                return;
            }

            try {
                const res = await fetch('http://localhost:5000/api/auth/me', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (res.ok) {
                    const user = data.user || data;
                    if (user.is_verified) {
                        router.push('/profile'); // if already verified push to profile
                    }
                    if (user.edu_email) {
                        setEduEmail(user.edu_email);
                    }
                }
            } catch (err) {
                console.error("Kullanıcı verisi çekilemedi.");
            } finally {
                setPageLoading(false);
            }
        };

        fetchUserData();
    }, [router]);

    // 1. send code
    const handleSendCode = async () => {
        setIsLoading(true);
        setError(null);
        const token = localStorage.getItem('accessToken');

        try {
            const response = await fetch('http://localhost:5000/api/user/sendEduVerification', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Kod gönderilemedi.');

            setStep(2); // Başarılıysa 2. adıma (kod girme ekranına) geç
            setSuccessMessage('Doğrulama kodu .edu.tr adresine gönderildi!');

            // 3 saniye sonra mesajı gizle
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            setError(err.message || 'Bir hata oluştu.');
        } finally {
            setIsLoading(false);
        }
    };

    // 2. verify code
    const handleVerify = async () => {
        if (code.length !== 6) {
            setError("Kod 6 haneli olmalıdır.");
            return;
        }

        setIsLoading(true);
        setError(null);
        const token = localStorage.getItem('accessToken');

        try {
            const response = await fetch('http://localhost:5000/api/user/verifyEduMail', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    edu_email: eduEmail,
                    code: code
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Doğrulama başarısız.');

            setSuccessMessage("Tebrikler! Öğrenci hesabınız başarıyla onaylandı.");
            window.dispatchEvent(new Event('auth_status_changed'));

            setTimeout(() => {
                router.push('/profile');
            }, 2000);

        } catch (err: any) {
            setError(err.message || 'Hatalı veya süresi geçmiş kod.');
        } finally {
            setIsLoading(false);
        }
    };

    if (pageLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mb-4" />
                <p className="text-cyan-400 font-bold uppercase tracking-widest animate-pulse">Sistem Yükleniyor...</p>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen pt-24 pb-12 px-4 flex items-center justify-center">

            {/* background glow */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 flex items-center justify-center">
                <div className="w-[50rem] h-[50rem] bg-violet-600/10 rounded-full blur-[200px] mix-blend-screen flex-shrink-0 animate-pulse"></div>
            </div>

            <div className="w-full max-w-md bg-[#0B0F19]/80 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 shadow-[0_0_50px_rgba(139,92,246,0.1)] relative z-10">

                <button onClick={() => router.push('/profile')} className="flex items-center text-gray-400 hover:text-white transition-colors mb-6 text-sm font-medium">
                    <ArrowLeft size={16} className="mr-2" /> Profile Dön
                </button>

                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 rounded-full bg-violet-500/20 border border-violet-500/50 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.3)]">
                        <GraduationCap size={32} className="text-violet-400" />
                    </div>
                </div>

                <h1 className="text-2xl font-black text-white text-center mb-2 tracking-tight uppercase">
                    Öğrenci Doğrulaması
                </h1>
                <p className="text-center text-gray-400 text-sm mb-8">
                    UniVerse ekosisteminin tüm özelliklerinden faydalanmak için üniversite e-postanızı onaylayın.
                </p>

                {error && (
                    <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm flex items-center gap-2">
                        <AlertCircle size={18} /> {error}
                    </div>
                )}

                {successMessage && (
                    <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm flex items-center gap-2 animate-in fade-in">
                        <CheckCircle size={18} /> {successMessage}
                    </div>
                )}

                {step === 1 ? (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-violet-400 ml-1">Kayıtlı .edu.tr E-postanız</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-3.5 text-gray-500" size={18} />
                                <input
                                    type="email"
                                    value={eduEmail}
                                    onChange={(e) => setEduEmail(e.target.value)}
                                    placeholder="Örn: isim@ogr.university.edu.tr"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 outline-none text-gray-200 focus:border-violet-500/50 transition-colors"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleSendCode}
                            disabled={isLoading || !eduEmail.includes('.edu.tr')}
                            className="w-full py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 transition-all text-white font-bold shadow-[0_0_20px_rgba(139,92,246,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex justify-center"
                        >
                            {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Doğrulama Kodu Gönder'}
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
                        <div className="p-4 bg-violet-500/10 border border-violet-500/20 rounded-xl text-center">
                            <p className="text-sm text-gray-300">
                                <strong className="text-violet-400">{eduEmail}</strong> adresine 6 haneli bir kod gönderdik.
                            </p>
                        </div>

                        <div className="space-y-2 text-center">
                            <div className="relative">
                                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-violet-500" size={20} />
                                <input
                                    type="text"
                                    maxLength={6}
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    placeholder="000000"
                                    className="w-full bg-violet-500/5 border border-violet-500/30 rounded-xl py-4 pl-12 pr-4 focus:border-violet-400 outline-none text-white text-2xl font-mono tracking-[1em] text-center"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleVerify}
                            disabled={isLoading || code.length !== 6}
                            className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 transition-all text-[#0B0F19] font-black shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex justify-center"
                        >
                            {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Onayla ve Bitir'}
                        </button>

                        <div className="text-center">
                            <button onClick={() => setStep(1)} className="text-xs text-gray-500 hover:text-violet-400 underline underline-offset-2 transition-colors">
                                Kodu tekrar gönder
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}