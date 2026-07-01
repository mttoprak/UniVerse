"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, Clock, AlertCircle, Text, MapPin, Loader2 } from 'lucide-react';

const durations = [
    { id: '1h', label: '1 Saat', value: 1, desc: 'Çok Acil' },
    { id: '6h', label: '6 Saat', value: 6, desc: 'Kısa Süreli' },
    { id: '12h', label: '12 Saat', value: 12, desc: 'Gün İçi' },
    { id: '24h', label: '24 Saat', value: 24, desc: 'Yarına Kadar' },
];

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

async function fetchGraphQL(query: string, variables: any = {}) {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_URL}/graphql`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ query, variables })
    });

    if (!response.ok) throw new Error(`API Hatası: ${response.status}`);
    const result = await response.json();
    if (result.errors) throw new Error(result.errors[0].message);
    return result.data;
}

// DİKKAT: Backend'deki CreateListingInput şemasına birebir uyumlu
const CREATE_EMERGENCY = `#graphql
mutation CreateEmergency($input: CreateListingInput!) {
    createListing(input: $input) {
        id
    }
}
`;

export default function CreateEmergencyPage() {
    const router = useRouter();
    const [title, setTitle] = useState('');
    const [location, setLocation] = useState('');
    const [description, setDescription] = useState('');
    const [selectedDuration, setSelectedDuration] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [submitError, setSubmitError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitStatus('idle');
        setSubmitError(null);

        try {
            // Şemaya %100 Uyumlu Input Objesi
            const input = {
                title: title.trim(),
                description: description.trim(),
                location: location.trim(),
                type: "urgent", // Backend enum karşılığı
                price: 0,       // Acil ilanlar ücretsizdir
                expires: selectedDuration, // Saat cinsinden int
            };

            await fetchGraphQL(CREATE_EMERGENCY, { input });

            setSubmitStatus('success');
            setTimeout(() => router.push('/emergencies-feed'), 1000);
        } catch (error: any) {
            console.error("Hata:", error);
            setSubmitError(error.message);
            setSubmitStatus('error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const isFormValid = title.trim().length > 2 && location.trim().length > 2 && description.trim().length > 2;

    return (
        <div className="relative min-h-[80vh] flex flex-col justify-center py-10 px-4">
            <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 flex items-center justify-center">
                <div className="w-[80rem] h-[80rem] bg-rose-600/20 rounded-full blur-[500px] mix-blend-screen animate-slow-breathe flex-shrink-0"></div>
            </div>

            <div className="w-full max-w-2xl mx-auto bg-black/40 backdrop-blur-xl border border-rose-500/20 rounded-[2rem] p-8 md:p-10 shadow-[0_0_50px_rgba(244,63,94,0.05)] z-10 relative">

                {submitError && (
                    <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center space-x-3 text-rose-400 text-sm animate-pulse">
                        <AlertCircle size={20} className="flex-shrink-0" /><span>{submitError}</span>
                    </div>
                )}

                <div className="flex items-center justify-between mb-8 pb-6 border-b border-rose-500/10">
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-rose-500/20 rounded-full animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.4)]">
                            <Zap className="text-rose-500" size={28}/>
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-white tracking-tight">Acil İlan <span className="text-rose-500">Oluştur</span></h1>
                            <p className="text-sm text-gray-400 mt-1">Süreli ve acil ihtiyaçlarını hemen kampüse duyur.</p>
                        </div>
                    </div>
                </div>

                <div className="mb-8 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
                    <h3 className="text-rose-400 font-bold flex items-center gap-2 text-sm mb-2">
                        <AlertCircle size={16}/> Acil İlan Sistemi Nasıl Çalışır?
                    </h3>
                    <p className="text-xs text-gray-400 leading-relaxed">
                        Acil ilanlar, seçtiğin süre boyunca Acil İlanlar sayfasında listelenir. Süre dolduğunda sistem ilanı otomatik olarak yayından kaldırır; böylece kampüs içindeki güncel ihtiyaçlar karışıklık yaratmaz. Sadece öğrenci hesabı olanlar acil ilan verebilir.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-rose-400 ml-1 flex items-center space-x-2">
                            <AlertCircle size={16}/> <span>İhtiyacın Nedir? <span className="text-rose-600">*</span></span>
                        </label>
                        <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Örn: Kütüphanede Type-C şarj aleti lazım!" className="w-full bg-rose-950/20 border border-rose-500/20 rounded-xl py-4 px-5 focus:border-rose-500/60 outline-none text-gray-100 text-lg font-medium placeholder:text-rose-900/50 transition-all" />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-rose-400 ml-1 flex items-center space-x-2">
                            <MapPin size={16}/> <span>Şu An Neredesin? <span className="text-rose-600">*</span></span>
                        </label>
                        <input type="text" required value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Örn: Merkez Kütüphane, Zemin Kat" className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:border-rose-500/40 outline-none text-gray-200 transition-all" />
                    </div>

                    <div className="space-y-3">
                        <label className="text-sm font-medium text-rose-400 ml-1 flex items-center space-x-2">
                            <Clock size={16}/> <span>İlan Süresi</span>
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {durations.map((dur) => (
                                <button key={dur.id} type="button" onClick={() => setSelectedDuration(dur.value)} className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${selectedDuration === dur.value ? 'bg-rose-500/20 border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)] scale-[1.02]' : 'bg-black/40 border-white/5 hover:border-rose-500/30'}`}>
                                    <span className={`font-bold ${selectedDuration === dur.value ? 'text-rose-400' : 'text-gray-300'}`}>{dur.label}</span>
                                    <span className={`text-[10px] uppercase tracking-wider mt-1 ${selectedDuration === dur.value ? 'text-rose-300/70' : 'text-gray-600'}`}>{dur.desc}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400 ml-1 flex items-center space-x-2">
                            <Text size={16}/> <span>Açıklama <span className="text-rose-600">*</span></span>
                        </label>
                        <textarea rows={2} required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Sana nasıl ulaşabilirler veya detaylar nedir?" className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:border-rose-500/40 outline-none text-gray-200 resize-none transition-all"></textarea>
                    </div>

                    <button type="submit" disabled={!isFormValid || isSubmitting} className={`w-full py-4 mt-6 font-black rounded-xl transition-all flex items-center justify-center space-x-2 ${!isFormValid || isSubmitting ? 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-70' : submitStatus === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)]'}`}>
                        {isSubmitting ? <Loader2 className="animate-spin" /> : <span>{submitStatus === 'success' ? 'İLAN YAYINLANDI!' : 'ACİL İLAN YAYINLA'}</span>}
                    </button>
                </form>
            </div>
        </div>
    );
}