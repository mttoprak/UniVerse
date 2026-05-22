"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, KeyRound, Building2, Calendar, Loader2, ShieldCheck, AlertCircle, GraduationCap } from 'lucide-react';

export default function RegisterPage() {
    const router = useRouter();

    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

    const [tempToken, setTempToken] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        surname: '',
        email: '',
        password: '',
        account_type: 'student',
        code: '',
        username: '',
        birthdate: '',
        university: '',
        edu_email: '' // Yeni eklenen alan
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });

        if (fieldErrors[name]) {
            setFieldErrors(prev => {
                const updated = { ...prev };
                delete updated[name];
                return updated;
            });
        }
    };

    const handleBackendErrors = (errData: any) => {
        if (errData.errors?.properties) {
            const newErrors: { [key: string]: string } = {};
            Object.keys(errData.errors.properties).forEach((field) => {
                newErrors[field] = errData.errors.properties[field].errors[0];
            });
            setFieldErrors(newErrors);
        } else {
            setError(errData.message || 'Bir hata oluştu.');
        }
    };

    const handleSendVerification = async () => {
        setIsLoading(true);
        setError(null);
        setFieldErrors({});
        try {
            const response = await fetch('http://localhost:5000/api/auth/sendVerification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password,
                    name: formData.name,
                    surname: formData.surname,
                    account_type: formData.account_type
                })
            });

            const data = await response.json();
            if (!response.ok) throw data;
            setStep(2);
        } catch (err: any) {
            handleBackendErrors(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyAndRegister = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch('http://localhost:5000/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password,
                    name: formData.name,
                    surname: formData.surname,
                    account_type: formData.account_type,
                    code: formData.code
                })
            });

            const data = await response.json();
            if (!response.ok) throw data;

            setTempToken(data.tempToken);
            setStep(3);
        } catch (err: any) {
            handleBackendErrors(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCompleteProfile = async () => {
        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const payload: any = {
                account_type: formData.account_type,
                username: formData.username,
            };

            if (formData.account_type === 'student') {
                if (formData.university) payload.university = formData.university;
                // Backend'in beklediği edu_email alanını gönderiyoruz
                if (formData.edu_email) payload.edu_email = formData.edu_email;
            }
            if (formData.birthdate) payload.birthdate = new Date(formData.birthdate);

            const response = await fetch('http://localhost:5000/api/auth/complete-profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${tempToken}`
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (!response.ok) throw data;

            localStorage.setItem('accessToken', data.accessToken);
            window.dispatchEvent(new Event('auth_status_changed'));

            setSuccessMessage("Kayıt başarılı! Ekosisteme giriş yapılıyor...");
            setTimeout(() => {
                router.push('/feed');
            }, 2000);

        } catch (err: any) {
            handleBackendErrors(err);
            setIsLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen pt-24 pb-12 px-4 flex items-center justify-center">

            <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 flex items-center justify-center">
                <div className="w-[60rem] h-[60rem] bg-cyan-600/10 rounded-full blur-[200px] mix-blend-screen animate-float-y flex-shrink-0"></div>
            </div>

            <div className="w-full max-w-xl bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 shadow-[0_0_50px_rgba(34,211,238,0.05)] relative z-10">

                {/* Progress Bar */}
                <div className="flex items-center justify-between mb-8 relative">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-white/5 -z-10"></div>
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-cyan-500 transition-all duration-500 -z-10" style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}></div>
                    {[1, 2, 3].map((num) => (
                        <div key={num} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors duration-500 ${step >= num ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(34,211,238,0.5)]' : 'bg-[#0B0F19] text-gray-500 border border-white/10'}`}>
                            {num}
                        </div>
                    ))}
                </div>

                <h2 className="text-2xl font-black text-white mb-2 tracking-tight uppercase">
                    {step === 1 ? 'Kayıt Ol' : step === 2 ? 'Doğrulama' : 'Profilini Kur'}
                </h2>
                <p className="text-gray-400 mb-8 text-sm">
                    {step === 1 ? 'Temel bilgilerini girerek hesabını oluştur.' : step === 2 ? 'E-postana gönderilen 6 haneli kodu gir.' : 'Seni daha yakından tanımamız için son birkaç adım.'}
                </p>

                {/* General Error Alert */}
                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
                        <AlertCircle size={18} /> {error}
                    </div>
                )}

                {/* Success Alert */}
                {successMessage && (
                    <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm flex items-center gap-2 animate-pulse">
                        <ShieldCheck size={18} /> {successMessage}
                    </div>
                )}

                {/* STEP 1: BASIC INFO */}
                {step === 1 && (
                    <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                    <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Ad" className={`w-full bg-white/5 border ${fieldErrors.name ? 'border-red-500/50' : 'border-white/10'} rounded-xl py-3 pl-10 pr-4 focus:border-cyan-500/50 outline-none text-white text-sm`} />
                                </div>
                                {fieldErrors.name && <p className="text-[10px] text-red-400 ml-1 uppercase">{fieldErrors.name}</p>}
                            </div>
                            <div className="space-y-1">
                                <input type="text" name="surname" value={formData.surname} onChange={handleChange} placeholder="Soyad" className={`w-full bg-white/5 border ${fieldErrors.surname ? 'border-red-500/50' : 'border-white/10'} rounded-xl py-3 px-4 focus:border-cyan-500/50 outline-none text-white text-sm`} />
                                {fieldErrors.surname && <p className="text-[10px] text-red-400 ml-1 uppercase">{fieldErrors.surname}</p>}
                            </div>
                        </div>

                        <div className="space-y-1">
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="E-posta Adresi" className={`w-full bg-white/5 border ${fieldErrors.email ? 'border-red-500/50' : 'border-white/10'} rounded-xl py-3 pl-10 pr-4 focus:border-cyan-500/50 outline-none text-white text-sm`} />
                            </div>
                            {fieldErrors.email && <p className="text-[10px] text-red-400 ml-1 uppercase">{fieldErrors.email}</p>}
                        </div>

                        <div className="space-y-1">
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="Şifre" className={`w-full bg-white/5 border ${fieldErrors.password ? 'border-red-500/50' : 'border-white/10'} rounded-xl py-3 pl-10 pr-4 focus:border-cyan-500/50 outline-none text-white text-sm`} />
                            </div>
                            <p className="text-[10px] text-gray-500 ml-1 uppercase tracking-tighter">Min. 8 Karakter • Rakam İçermeli</p>
                            {fieldErrors.password && <p className="text-[10px] text-red-400 ml-1 uppercase">{fieldErrors.password}</p>}
                        </div>

                        <div className="flex items-center space-x-4 pt-2">
                            {['student', 'external'].map((type) => (
                                <label key={type} className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl border cursor-pointer transition-all ${formData.account_type === type ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400' : 'bg-white/5 border-white/10 text-gray-400'}`}>
                                    <input type="radio" name="account_type" value={type} checked={formData.account_type === type} onChange={handleChange} className="hidden" />
                                    <span className="font-bold text-xs uppercase tracking-widest">{type === 'student' ? 'Öğrenci' : 'Dışarıdan'}</span>
                                </label>
                            ))}
                        </div>

                        <button onClick={handleSendVerification} disabled={isLoading} className="w-full mt-4 flex items-center justify-center space-x-2 bg-cyan-600 hover:bg-cyan-500 text-[#0B0F19] py-3.5 rounded-xl font-black transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)] disabled:opacity-50">
                            {isLoading ? <Loader2 className="animate-spin" size={20} /> : <span>Devam Et</span>}
                        </button>
                    </div>
                )}

                {/* STEP 2: VERIFICATION */}
                {step === 2 && (
                    <div className="space-y-6">
                        <div className="space-y-1 text-center">
                            <div className="relative">
                                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-500" size={20} />
                                <input type="text" name="code" maxLength={6} value={formData.code} onChange={handleChange} placeholder="000000" className={`w-full bg-cyan-500/5 border ${fieldErrors.code ? 'border-red-500/50' : 'border-cyan-500/30'} rounded-xl py-4 pl-12 pr-4 focus:border-cyan-400 outline-none text-white text-2xl font-mono tracking-[1em] text-center`} />
                            </div>
                            {fieldErrors.code && <p className="text-[10px] text-red-400 uppercase font-bold">{fieldErrors.code}</p>}
                        </div>

                        <button onClick={handleVerifyAndRegister} disabled={isLoading || formData.code.length !== 6} className="w-full flex items-center justify-center space-x-2 bg-cyan-600 hover:bg-cyan-500 text-[#0B0F19] py-3.5 rounded-xl font-black transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)] disabled:opacity-50 disabled:cursor-not-allowed">
                            {isLoading ? <Loader2 className="animate-spin" size={20} /> : <span>Doğrula ve İlerle</span>}
                        </button>
                    </div>
                )}

                {/* STEP 3: COMPLETE PROFILE */}
                {step === 3 && (
                    <div className="space-y-5">
                        <div className="space-y-1">
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                <input type="text" name="username" value={formData.username} onChange={handleChange} placeholder="Kullanıcı Adı" className={`w-full bg-white/5 border ${fieldErrors.username ? 'border-red-500/50' : 'border-white/10'} rounded-xl py-3 pl-10 pr-4 focus:border-cyan-500/50 outline-none text-white text-sm`} />
                            </div>
                            <p className="text-[10px] text-cyan-500/60 ml-1 uppercase font-bold tracking-widest">Sadece Sayılar ve Alt Çizgi (_)</p>
                            {fieldErrors.username && <p className="text-[10px] text-red-400 ml-1 uppercase">{fieldErrors.username}</p>}
                        </div>

                        {formData.account_type === 'student' && (
                            <>
                                <div className="space-y-1">
                                    <div className="relative">
                                        <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                        <input type="email" name="edu_email" value={formData.edu_email} onChange={handleChange} placeholder="Üniversite E-postası (.edu.tr)" className={`w-full bg-white/5 border ${fieldErrors.edu_email ? 'border-red-500/50' : 'border-white/10'} rounded-xl py-3 pl-10 pr-4 focus:border-cyan-500/50 outline-none text-white text-sm`} />
                                    </div>
                                    {fieldErrors.edu_email && <p className="text-[10px] text-red-400 ml-1 uppercase">{fieldErrors.edu_email}</p>}
                                </div>
                                <div className="space-y-1">
                                    <div className="relative">
                                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                        <input type="text" name="university" value={formData.university} onChange={handleChange} placeholder="Üniversite Adı (Opsiyonel)" className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 focus:border-cyan-500/50 outline-none text-white text-sm" />
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="space-y-1">
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                <input type="date" name="birthdate" value={formData.birthdate} onChange={handleChange} className={`w-full bg-white/5 border ${fieldErrors.birthdate ? 'border-red-500/50' : 'border-white/10'} rounded-xl py-3 pl-10 pr-4 focus:border-cyan-500/50 outline-none text-gray-300 text-sm`} />
                            </div>
                            {fieldErrors.birthdate && <p className="text-[10px] text-red-400 ml-1 uppercase">{fieldErrors.birthdate}</p>}
                        </div>

                        <button onClick={handleCompleteProfile} disabled={isLoading || successMessage !== null} className="w-full mt-4 flex items-center justify-center space-x-2 bg-emerald-500 hover:bg-emerald-400 text-[#0B0F19] py-3.5 rounded-xl font-black transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50 disabled:cursor-not-allowed">
                            {isLoading ? <Loader2 className="animate-spin" size={20} /> : <span>Kurulumu Tamamla</span>}
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
}