"use client";

import {useState} from 'react';
import {Zap, Clock, AlertCircle, ArrowRight, Text, MapPin} from 'lucide-react';

const durations = [
    {id: '1h', label: '1 Saat', desc: 'Çok Acil'},
    {id: '3h', label: '3 Saat', desc: 'Kısa Süreli'},
    {id: '12h', label: '12 Saat', desc: 'Gün İçi'},
    {id: '24h', label: '24 Saat', desc: 'Yarına Kadar'},
];

export default function CreateEmergencyPage() {
    const [title, setTitle] = useState('');
    const [location, setLocation] = useState('');
    const [description, setDescription] = useState('');
    const [selectedDuration, setSelectedDuration] = useState('1h');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

    // submit simulator
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitStatus('idle');

        try {
            const API_URL = "http://localhost:5000/api/listings";

            const payload = {
                title,
                location,
                description,
                duration: selectedDuration
            };

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            // if success
            const data = await response.json();
            console.log("Success:", data);
            setSubmitStatus('success');

            // clear the form or redirect to homepage
            setTimeout(() => setSubmitStatus('idle'), 3000);

        } catch (error) {
            console.error("Error submitting emergency:", error);
            setSubmitStatus('error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const isFormValid = title.trim().length > 2 && location.trim().length > 2;

    return (
        <div className="relative min-h-[80vh] flex flex-col justify-center py-10 px-4">

            {/* custom breathing animation (slow pulse) */}
            <style dangerouslySetInnerHTML={{
                __html: `
        @keyframes slow-breathe {
          0%, 100% { opacity: 0.3; transform: scale(0.9); }
          50% { opacity: 0.6; transform: scale(1.1); }
        }
        .animate-slow-breathe { animation: slow-breathe 4s infinite ease-in-out; }
      `
            }}/>
            <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 flex items-center justify-center">
                <div
                    className="w-[80rem] h-[80rem] bg-rose-600/20 rounded-full blur-[500px] mix-blend-screen animate-slow-breathe flex-shrink-0"></div>
            </div>

            <div
                className="w-full max-w-2xl mx-auto bg-black/40 backdrop-blur-xl border border-rose-500/20 rounded-[2rem] p-8 md:p-10 shadow-[0_0_50px_rgba(244,63,94,0.05)] z-10 relative">

                {/* header area */}
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-rose-500/10">
                    <div className="flex items-center space-x-4">
                        <div
                            className="p-3 bg-rose-500/20 rounded-full animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.4)]">
                            <Zap className="text-rose-500" size={28}/>
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-white tracking-tight">Acil İlan <span
                                className="text-rose-500">Oluştur</span></h1>
                            <p className="text-sm text-gray-400 mt-1">Süreli ve acil ihtiyaçlarını hemen kampüse
                                duyur.</p>
                        </div>
                    </div>
                </div>

                {/* form area */}
                <form onSubmit={handleSubmit} className="space-y-6">

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-rose-400 ml-1 flex items-center space-x-2">
                            <AlertCircle size={16}/>
                            <span>İhtiyacın Nedir? <span className="text-rose-600">*</span></span>
                        </label>
                        <input
                            type="text"
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Örn: Kütüphanede Type-C şarj aleti lazım!"
                            className="w-full bg-rose-950/20 border border-rose-500/20 rounded-xl py-4 px-5 focus:border-rose-500/60 focus:ring-1 focus:ring-rose-500/50 outline-none text-gray-100 text-lg font-medium placeholder:text-rose-900/50 transition-all"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-rose-400 ml-1 flex items-center space-x-2">
                            <MapPin size={16}/>
                            <span>Şu An Neredesin? <span className="text-rose-600">*</span></span>
                        </label>
                        <input
                            type="text"
                            required
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="Örn: Merkez Kütüphane, Zemin Kat"
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:border-rose-500/40 outline-none text-gray-200 transition-all"
                        />
                    </div>

                    <div className="space-y-3">
                        <label className="text-sm font-medium text-rose-400 ml-1 flex items-center space-x-2">
                            <Clock size={16}/>
                            <span>İlan Süresi</span>
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {durations.map((dur) => (
                                <button
                                    key={dur.id}
                                    type="button"
                                    onClick={() => setSelectedDuration(dur.id)}
                                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-300 ${
                                        selectedDuration === dur.id
                                            ? 'bg-rose-500/20 border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)] scale-[1.02]'
                                            : 'bg-black/40 border-white/5 hover:border-rose-500/30'
                                    }`}
                                >
                                    <span
                                        className={`font-bold ${selectedDuration === dur.id ? 'text-rose-400' : 'text-gray-300'}`}>{dur.label}</span>
                                    <span
                                        className={`text-[10px] uppercase tracking-wider mt-1 ${selectedDuration === dur.id ? 'text-rose-300/70' : 'text-gray-600'}`}>{dur.desc}</span>
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-gray-500 ml-1 mt-2">Süre dolduğunda ilan otomatik olarak yayından
                            kalkar ve silinir.</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400 ml-1 flex items-center space-x-2">
                            <Text size={16}/>
                            <span>Ekstra Detay (Opsiyonel)</span>
                        </label>
                        <textarea
                            rows={2}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Sana nasıl ulaşabilirler? vs."
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:border-rose-500/40 outline-none text-gray-200 resize-none transition-all"
                        ></textarea>
                    </div>

                    <button
                        type="submit"
                        disabled={!isFormValid || isSubmitting}
                        className={`w-full py-4 mt-6 font-black rounded-xl transition-all flex items-center justify-center space-x-2 group ${
                            !isFormValid || isSubmitting
                                ? 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-70'
                                : submitStatus === 'success'
                                    ? 'bg-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                                    : submitStatus === 'error'
                                        ? 'bg-red-600 text-white'
                                        : 'bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)] hover:shadow-[0_0_30px_rgba(244,63,94,0.6)] cursor-pointer'}`}>
                        <span>
                            {isSubmitting ? 'YAYINLANIYOR...' :
                                submitStatus === 'success' ? 'İLANINIZ BAŞARIYLA YAYINLANDI!' :
                                    submitStatus === 'error' ? 'BEKLENMEDİK BİR HATA OLUŞTU (TEKRAR DENE)' :
                                        isFormValid ? 'ACİL İLAN YAYINLA' : 'İHTİYACINI VE KONUMUNU YAZ'}
                        </span>{isFormValid && !isSubmitting && submitStatus === 'idle' &&
                        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform"/>}
                    </button>

                </form>
            </div>
        </div>
    );
}