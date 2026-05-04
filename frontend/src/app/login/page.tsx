"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Mail, Lock, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const router = useRouter();

    // state management for UI feedback and form data
    const [isLoading, setIsLoading] = useState(false);
    const [generalError, setGeneralError] = useState<string | null>(null);
    const [warning, setWarning] = useState<string | null>(null); // State for incomplete profile warnings
    const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });

    // handle input changes and clear specific field errors upon typing
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    // helper function to parse backend errors
    const handleBackendErrors = (errData: any) => {
        if (errData.errors?.properties) {
            const newErrors: { [key: string]: string } = {};
            Object.keys(errData.errors.properties).forEach((field) => {
                newErrors[field] = errData.errors.properties[field].errors[0];
            });
            setFieldErrors(newErrors);
        } else {
            setGeneralError(errData.message || 'Giriş yapma başarısız! Lütfen tekrar deneyin.');
        }
    };

    // handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); // prevent default browser refresh
        setIsLoading(true);
        setGeneralError(null);
        setWarning(null); // clear previous warnings on new attempt
        setFieldErrors({});

        try {
            const response = await fetch('http://localhost:5000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) throw data;

            // check if the user has completed the full 3-step registration
            if (data.is_complete) {
                // success: save full access token
                localStorage.setItem('accessToken', data.accessToken);
                alert("Login successful! Redirecting to feed...");
                router.push('/feed');
            } else {
                // incomplete profile: save temp token and show warning box
                localStorage.setItem('tempToken', data.tempToken);
                setWarning("Profil kurulumunuz yarım kalmış. Sisteme erişmek için son adımı tamamlamalısınız.");
            }

        } catch (err: any) {
            handleBackendErrors(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center relative">
            {/* Background glowing orb */}
            <div className="absolute w-64 h-64 bg-cyan-500/10 blur-[120px] -z-10 rounded-full top-1/4 left-1/4"></div>

            <div className="w-full max-w-md p-8 bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] z-10">

                {/* Header Section */}
                <div className="text-center mb-10">
                    <h2 className="text-3xl font-black text-white tracking-tight">Uni<span className="text-cyan-400">Verse</span></h2>
                    <p className="text-gray-400 mt-2 text-sm">Hesabına ve ekosisteme giriş yap!</p>
                </div>

                {/* general error message */}
                {generalError && (
                    <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center space-x-3 text-rose-400 text-sm animate-pulse">
                        <AlertCircle size={20} className="flex-shrink-0" />
                        <span>{generalError}</span>
                    </div>
                )}

                {/* incomplete profile warning */}
                {warning && (
                    <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start space-x-3 text-amber-400 text-sm animate-pulse">
                        <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                        <div className="flex flex-col">
                            <span>{warning}</span>
                            <Link href="/register" className="mt-2 font-black underline hover:text-amber-300 transition-colors w-max">
                                Kurulumu Tamamla &rarr;
                            </Link>
                        </div>
                    </div>
                )}

                {/* login form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* email input field */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 ml-1 uppercase tracking-widest">E-posta</label>
                        <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-cyan-400 transition-colors" size={20} />
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="ismin@email.com"
                                className={`w-full bg-white/5 border ${fieldErrors.email ? 'border-rose-500/50' : 'border-white/10'} rounded-2xl py-3.5 pl-12 pr-4 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/50 outline-none transition-all text-gray-200 placeholder:text-gray-700`}
                            />
                        </div>
                        {fieldErrors.email && <p className="text-[10px] text-rose-400 ml-1 uppercase font-bold">{fieldErrors.email}</p>}
                    </div>

                    {/* password input field */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 ml-1 uppercase tracking-widest">Şifre</label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-cyan-400 transition-colors" size={20} />
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="••••••••"
                                className={`w-full bg-white/5 border ${fieldErrors.password ? 'border-rose-500/50' : 'border-white/10'} rounded-2xl py-3.5 pl-12 pr-4 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/50 outline-none transition-all text-gray-200 placeholder:text-gray-700`}
                            />
                        </div>
                        {fieldErrors.password && <p className="text-[10px] text-rose-400 ml-1 uppercase font-bold">{fieldErrors.password}</p>}

                        {/* forgot password link */}
                        <div className="flex justify-end mt-2">
                            <Link href="/forgot-password" className="text-xs text-gray-500 hover:text-cyan-400 transition-colors font-medium">Şifremi Unuttum</Link>
                        </div>
                    </div>

                    {/* submit button */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-[#0B0F19] font-black uppercase tracking-widest rounded-2xl shadow-[0_10px_20px_rgba(34,211,238,0.2)] transition-all flex items-center justify-center space-x-2 group disabled:opacity-50"
                    >
                        {isLoading ? (
                            <Loader2 className="animate-spin" size={20} />
                        ) : (
                            <>
                                <span>GİRİŞ YAP</span>
                                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </form>

                {/* registration link */}
                <p className="text-center mt-8 text-gray-500 text-xs font-medium uppercase tracking-wider">
                    Henüz üye değil misin? <Link href="/register" className="text-cyan-400 font-black hover:underline ml-1">KAYIT OL</Link>
                </p>
            </div>
        </div>
    );
}