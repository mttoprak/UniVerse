"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Mail, ShieldAlert, ShieldCheck, Package, Settings, Edit3, Loader2, MapPin, Calendar, CheckCircle2, Heart } from 'lucide-react';

export default function ProfilePage() {
    const router = useRouter();

    // sata states
    const [user, setUser] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    // verification states
    const [verifyEmail, setVerifyEmail] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [verifyMessage, setVerifyMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // fetch user profile data on component mount
    useEffect(() => {
        const fetchProfile = async () => {
            const token = localStorage.getItem('accessToken');

            // Redirect to login if no token is found
            if (!token) {
                router.push('/login');
                return;
            }

            try {
                const response = await fetch('http://localhost:5000/api/auth/me', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    // Token might be expired or invalid
                    if (response.status === 401) {
                        localStorage.removeItem('accessToken');
                        router.push('/login');
                        return;
                    }
                    throw new Error('Profil bilgileri alınamadı.');
                }

                const data = await response.json();
                setUser(data);
            } catch (error) {
                console.error("Error fetching profile:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();
    }, [router]);

    // Handle Student Verification Submit
    const handleVerifyStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsVerifying(true);
        setVerifyMessage(null);

        const token = localStorage.getItem('accessToken');

        try {
            const response = await fetch('http://localhost:5000/api/users/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ edu_email: verifyEmail })
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.message || 'Doğrulama başarısız oldu.');

            // Success: Update UI and show message
            setVerifyMessage({ type: 'success', text: 'Doğrulama e-postası gönderildi. Lütfen gelen kutunuzu kontrol edin.' });
            setVerifyEmail('');

        } catch (err: any) {
            setVerifyMessage({ type: 'error', text: err.message });
        } finally {
            setIsVerifying(false);
        }
    };

    // Full Screen Loader while fetching initial data
    if (isLoading) {
        return (
            <div className="min-h-screen pt-28 flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mb-4" />
                <p className="text-cyan-400 font-bold uppercase tracking-widest animate-pulse">Profil Yükleniyor...</p>
            </div>
        );
    }

    // Safety fallback
    if (!user) return null;

    // Check if user is verified student (adjust 'isStudent' based on your actual backend schema)
    const isStudentVerified = user.edu_email && user.edu_email.length > 0;

    return (
        <div className="min-h-screen pt-28 pb-12 px-4 relative">

            {/* Background Ambient Glow Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-0 right-1/4 w-[40rem] h-[40rem] bg-cyan-500/10 blur-[200px] rounded-full mix-blend-screen"></div>
                <div className="absolute bottom-0 left-1/4 w-[40rem] h-[40rem] bg-blue-500/10 blur-[200px] rounded-full mix-blend-screen"></div>
            </div>

            <div className="max-w-6xl mx-auto space-y-8">

                {/* 1. STUDENT VERIFICATION MODULE (Shows only if NOT verified) */}
                {!isStudentVerified && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between shadow-[0_10px_30px_rgba(245,158,11,0.1)] relative overflow-hidden">
                        {/* Decorative background element */}
                        <div className="absolute -right-20 -top-20 w-64 h-64 bg-amber-500/10 rounded-full blur-[80px] pointer-events-none"></div>

                        <div className="flex items-start space-x-4 mb-6 md:mb-0 relative z-10">
                            <ShieldAlert size={32} className="text-amber-400 flex-shrink-0 mt-1" />
                            <div>
                                <h3 className="text-xl font-black text-amber-400 tracking-tight uppercase">Öğrenci Statünüzü Doğrulayın</h3>
                                <p className="text-amber-200/70 text-sm mt-1 max-w-lg">
                                    İlanlara mesaj atabilmek, acil durum ilanları açabilmek ve güvenilir öğrenci rozeti kazanmak için .edu.tr uzantılı e-postanızı onaylamanız gerekmektedir.
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleVerifyStudent} className="w-full md:w-auto flex flex-col space-y-3 relative z-10">
                            <div className="flex w-full md:w-[350px] relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500/50" size={18} />
                                <input
                                    type="email"
                                    value={verifyEmail}
                                    onChange={(e) => setVerifyEmail(e.target.value)}
                                    placeholder="ornek@edu.tr"
                                    required
                                    className="w-full bg-black/40 border border-amber-500/30 rounded-xl py-3 pl-12 pr-4 text-white focus:border-amber-400 outline-none text-sm placeholder:text-amber-500/30"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isVerifying || !verifyEmail}
                                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_15px_rgba(245,158,11,0.2)] disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center h-12"
                            >
                                {isVerifying ? <Loader2 className="animate-spin" size={18} /> : "Doğrulama Kodu Gönder"}
                            </button>

                            {/* Verification Feedback Messages */}
                            {verifyMessage && (
                                <p className={`text-xs font-bold mt-2 text-center ${verifyMessage.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {verifyMessage.text}
                                </p>
                            )}
                        </form>
                    </div>
                )}

                {/* Main Profile Grid Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

                    {/* LEFT COLUMN: Profile Card */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex flex-col items-center text-center shadow-[0_10px_30px_rgba(0,0,0,0.2)]">

                            <div className="relative w-28 h-28 mb-4">
                                <div className="w-full h-full rounded-full bg-cyan-500/20 border-2 border-cyan-500/50 flex items-center justify-center overflow-hidden">
                                    <User size={48} className="text-cyan-400" />
                                </div>
                                {isStudentVerified && (
                                    <div className="absolute bottom-0 right-0 w-8 h-8 bg-blue-500 rounded-full border-4 border-[#0B0F19] flex items-center justify-center shadow-[0_0_10px_rgba(59,130,246,0.5)]">
                                        <ShieldCheck size={16} className="text-white" />
                                    </div>
                                )}
                            </div>

                            <h2 className="text-2xl font-black text-white">{user.name} {user.surname}</h2>
                            <p className="text-gray-400 text-sm font-medium mb-3">@{user.username}</p>

                            {isStudentVerified ? (
                                <span className="px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full text-xs font-black uppercase tracking-widest mb-6">
                                    Onaylı Öğrenci
                                </span>
                            ) : (
                                <span className="px-3 py-1 bg-white/5 text-gray-400 border border-white/10 rounded-full text-xs font-black uppercase tracking-widest mb-6">
                                    Standart Kullanıcı
                                </span>
                            )}

                            <div className="w-full h-px bg-white/10 mb-6"></div>

                            <div className="w-full space-y-4 text-sm text-left">
                                <div className="flex items-center text-gray-300">
                                    <Mail size={16} className="text-gray-500 mr-3" />
                                    <span className="truncate">{user.email}</span>
                                </div>
                                {user.university && (
                                    <div className="flex items-center text-gray-300">
                                        <MapPin size={16} className="text-gray-500 mr-3" />
                                        <span>{user.university}</span>
                                    </div>
                                )}
                                <div className="flex items-center text-gray-300">
                                    <Calendar size={16} className="text-gray-500 mr-3" />
                                    <span>Katılım: {new Date(user.createdAt || Date.now()).getFullYear()}</span>
                                </div>
                            </div>

                            <button className="w-full mt-6 py-2.5 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-colors text-sm flex items-center justify-center space-x-2">
                                <Edit3 size={16} />
                                <span>Profili Düzenle</span>
                            </button>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: User Ads (Listings) & Activity */}
                    <div className="lg:col-span-3 space-y-6">

                        {/* Tab Headers */}
                        <div className="flex items-center space-x-6 border-b border-white/10 px-2">
                            <button className="pb-4 text-cyan-400 border-b-2 border-cyan-400 font-black uppercase tracking-widest text-sm flex items-center space-x-2">
                                <Package size={18} />
                                <span>İlanlarım</span>
                            </button>
                            <button className="pb-4 text-gray-500 hover:text-gray-300 font-bold uppercase tracking-widest text-sm flex items-center space-x-2 transition-colors">
                                <Heart size={18} />
                                <span>Favorilerim</span>
                            </button>
                        </div>

                        {/* Ads Grid Container */}
                        <div className="bg-black/20 border border-white/5 rounded-3xl p-6 min-h-[400px]">
                            {/* Check if user has adverts, otherwise show empty state */}
                            {user.adverts && user.adverts.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {/* Map through user's adverts here when backend provides them */}
                                    {/* Example Ad Card */}
                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:border-cyan-500/30 transition-colors cursor-pointer group">
                                        <div className="aspect-video bg-black/50 rounded-xl mb-4 overflow-hidden relative">
                                            {/* Placeholder image */}
                                            <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 group-hover:scale-105 transition-transform"></div>
                                        </div>
                                        <h4 className="font-bold text-white mb-2 truncate">Örnek İlan Başlığı</h4>
                                        <div className="flex justify-between items-center">
                                            <span className="text-emerald-400 font-black">1.250 ₺</span>
                                            <span className="text-xs text-gray-500">Yayında</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                // EMPTY STATE UI
                                <div className="flex flex-col items-center justify-center h-full pt-16 pb-12 text-center">
                                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                                        <Package size={32} className="text-gray-500" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">Henüz ilanınız yok</h3>
                                    <p className="text-gray-400 text-sm max-w-sm mb-6">Kullanmadığınız eşyaları satarak diğer öğrencilere yardımcı olabilir ve ek gelir elde edebilirsiniz.</p>
                                    <Link href="/create-listing" className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-[#0B0F19] font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_10px_20px_rgba(34,211,238,0.2)]">
                                        Yeni İlan Ver
                                    </Link>
                                </div>
                            )}
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
}