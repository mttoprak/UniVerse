"use client";

import { useState } from 'react';
import {
    Briefcase, Car, BookOpen, Lock, ArrowRight, ArrowLeft,
    CheckCircle2, ImagePlus, TurkishLira, Calendar, Users, MapPin,
    FileText, Award, Presentation, ShoppingBag, Repeat, Home, Plus, X, Eye
} from 'lucide-react';

const categories = [
    { id: 'job', title: 'İş / Staj', icon: Briefcase, requiresStudent: false, color: 'text-blue-400', border: 'border-blue-500/30', bg: 'hover:bg-blue-500/10', baseColor: 'blue' },
    { id: 'scholarship', title: 'Burs', icon: Award, requiresStudent: false, color: 'text-yellow-400', border: 'border-yellow-500/30', bg: 'hover:bg-yellow-500/10', baseColor: 'yellow' },
    { id: 'carpool', title: 'Yol Arkadaşı', icon: Car, requiresStudent: false, color: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'hover:bg-emerald-500/10', baseColor: 'emerald' },
    { id: 'roommate', title: 'Ev/Oda Arkadaşı', icon: Home, requiresStudent: true, color: 'text-teal-400', border: 'border-teal-500/30', bg: 'hover:bg-teal-500/10', baseColor: 'teal' },
    { id: 'tutoring', title: 'Özel Ders', icon: Presentation, requiresStudent: true, color: 'text-indigo-400', border: 'border-indigo-500/30', bg: 'hover:bg-indigo-500/10', baseColor: 'indigo' },
    { id: 'notes', title: 'Ders Notu', icon: FileText, requiresStudent: true, color: 'text-violet-400', border: 'border-violet-500/30', bg: 'hover:bg-violet-500/10', baseColor: 'violet' },
    { id: 'secondhand', title: 'İkinci El Satış', icon: ShoppingBag, requiresStudent: true, color: 'text-rose-400', border: 'border-rose-500/30', bg: 'hover:bg-rose-500/10', baseColor: 'rose' },
];

 // mock data for dynamic location selection (temp)
const mockLocations: Record<string, string[]> = {
    "İzmir": ["Bornova", "Buca", "Karşıyaka", "Konak", "Çiğli", "Urla"],
    "İstanbul": ["Kadıköy", "Beşiktaş", "Şişli", "Üsküdar", "Maltepe", "Sarıyer"],
    "Ankara": ["Çankaya", "Keçiören", "Yenimahalle", "Mamak", "Etimesgut"]
};

const predefinedRules = ["Sigara İçilmez", "Sigara İçmeyen Aranıyor", "Evcil Hayvan Yasak", "Evcil Hayvan Dostu", "Sadece Öğrenci", "Sadece Çalışan", "Misafir Yasak", "Düzenli/Temiz", "Vejetaryen/Vegan"];

export default function CreateListingWizard() {
    const [step, setStep] = useState(1);
    const [selectedCat, setSelectedCat] = useState<string | null>(null);
    const [isVerifiedStudent, setIsVerifiedStudent] = useState(false);

    // centralized form data state
    const [formData, setFormData] = useState({
        title: '', description: '',
        jobType: '', jobLocationType: '',
        scholarshipDuration: '', scholarshipTarget: '',
        fromLocation: '', toLocation: '', departureTime: '', emptySeats: '',
        petStatus: '', tutoringSubject: '', tutoringFormat: '',
        noteCode: '', noteFormat: '', itemCondition: '',
        price: '', paymentFrequency: 'monthly', exchangeFor: ''
    });

    const [city, setCity] = useState('');
    const [district, setDistrict] = useState('');
    const [selectedRules, setSelectedRules] = useState<string[]>([]);
    const [isRuleDropdownOpen, setIsRuleDropdownOpen] = useState(false);
    const [isExchangePossible, setIsExchangePossible] = useState(false);

    // dynamic validation checkers
    const isStep2Valid = () => {
        if (!formData.title.trim() || !formData.description.trim()) return false;

        switch (selectedCat) {
            case 'job': return formData.jobType && formData.jobLocationType && (formData.jobLocationType !== 'offcampus' || (city && district));
            case 'scholarship': return formData.scholarshipDuration && formData.scholarshipTarget;
            case 'carpool': return formData.fromLocation && formData.toLocation && formData.departureTime && formData.emptySeats;
            case 'roommate': return city && district && formData.petStatus;
            case 'tutoring': return formData.tutoringSubject && formData.tutoringFormat;
            case 'notes': return formData.noteCode && formData.noteFormat;
            case 'secondhand': return city && district && formData.itemCondition;
            default: return false;
        }
    };

    const isStep3Valid = () => {
        if (formData.price === '') return false;
        if (isExchangePossible && !formData.exchangeFor.trim()) return false;
        return true;
    };

    // determine if "Next" button should be disabled (maybe temp until we implement better validation)
    const isNextDisabled = () => {
        if (step === 1 && !selectedCat) return true;
        if (step === 2 && !isStep2Valid()) return true;
        if (step === 3 && !isStep3Valid()) return true;
        return false;
    };

    const nextStep = () => setStep((prev) => Math.min(prev + 1, 4));
    const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

    const handleFormChange = (key: string, value: string) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setCity(e.target.value);
        setDistrict('');
    };

    const toggleRule = (rule: string) => {
        setSelectedRules(prev => prev.includes(rule) ? prev.filter(r => r !== rule) : [...prev, rule]);
        setIsRuleDropdownOpen(false);
    };

    const renderLocationSelector = (accentColor: string) => (
        <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="space-y-2">
                <label className={`text-sm font-medium ${accentColor} ml-1`}>İl</label>
                <select value={city} onChange={handleCityChange} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:border-white/30 outline-none text-gray-200 appearance-none">
                    <option value="" className="bg-gray-900">İl Seçiniz...</option>
                    {Object.keys(mockLocations).map(c => <option key={c} value={c} className="bg-gray-900">{c}</option>)}
                </select>
            </div>
            <div className="space-y-2">
                <label className={`text-sm font-medium ${accentColor} ml-1`}>İlçe</label>
                <select value={district} onChange={(e) => setDistrict(e.target.value)} disabled={!city} className={`w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:border-white/30 outline-none ${!city ? 'text-gray-600 opacity-50 cursor-not-allowed' : 'text-gray-200'} appearance-none`}>
                    <option value="" className="bg-gray-900">İlçe Seçiniz...</option>
                    {city && mockLocations[city].map(d => <option key={d} value={d} className="bg-gray-900">{d}</option>)}
                </select>
            </div>
        </div>
    );

    const activeCatData = categories.find(c => c.id === selectedCat);

    return (
        <div className="max-w-5xl mx-auto pb-20">

            {/* header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Yeni İlan <span className="text-cyan-400">Oluştur</span></h1>
                    <p className="text-gray-500 mt-1">Sihirbazı kullanarak ilanını saniyeler içinde yayınla.</p>
                </div>
                <button onClick={() => setIsVerifiedStudent(!isVerifiedStudent)} className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${isVerifiedStudent ? 'bg-violet-500/20 text-violet-300 border-violet-500/50 shadow-[0_0_10px_rgba(139,92,246,0.2)]' : 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                    {isVerifiedStudent ? '🎓 Öğrenci Modu: AÇIK' : '👤 Sivil Modu: AÇIK'}
                </button>
            </div>

            {/* progress bar (4 steps) */}
            <div className="flex items-center justify-between mb-12 relative">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-white/5 -z-10 rounded-full"></div>
                <div className={`absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-cyan-500 shadow-[0_0_10px_#22d3ee] -z-10 rounded-full transition-all duration-500`} style={{ width: `${((step - 1) / 3) * 100}%` }}></div>
                {[1, 2, 3, 4].map((num) => (
                    <div key={num} className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 transition-all duration-300 ${step >= num ? 'bg-[#0B0F19] border-cyan-400 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)]' : 'bg-[#0B0F19] border-white/10 text-gray-600'}`}>
                        {step > num ? <CheckCircle2 size={20} /> : num === 4 ? <Eye size={18} /> : num}
                    </div>
                ))}
            </div>

            {/* wizard content */}
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 md:p-12 shadow-2xl min-h-[400px]">

                {/* step 1: categories */}
                {step === 1 && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h2 className="text-xl font-bold text-white mb-6">Ne tür bir ilan vermek istiyorsun?</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {categories.map((cat) => {
                                const isLocked = cat.requiresStudent && !isVerifiedStudent;
                                const isSelected = selectedCat === cat.id;
                                return (
                                    <button key={cat.id} disabled={isLocked} onClick={() => setSelectedCat(cat.id)} className={`relative flex flex-col items-start p-5 rounded-2xl border transition-all duration-300 text-left group ${isLocked ? 'bg-black/20 border-white/5 opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${isSelected ? `bg-white/5 ${cat.border} shadow-[0_0_20px_rgba(255,255,255,0.05)] translate-y-[-4px]` : `bg-black/40 border-white/5 ${cat.bg}`}`}>
                                        <div className={`p-4 rounded-full bg-black/50 ${isLocked ? 'text-gray-600' : cat.color} mb-4`}>
                                            {isLocked ? <Lock size={24} /> : <cat.icon size={24} />}
                                        </div>
                                        <div>
                                            <h3 className={`text-base font-extrabold ${isLocked ? 'text-gray-500' : 'text-gray-200'}`}>{cat.title}</h3>
                                            <p className="text-[11px] text-gray-500 mt-1">{isLocked ? 'Sadece öğrenciler' : 'Seç'}</p>
                                        </div>
                                        {isSelected && <div className="absolute top-4 right-4 text-cyan-400"><CheckCircle2 size={18} /></div>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* step 2: dynamic details */}
                {step === 2 && (
                    <div className="animate-in fade-in slide-in-from-right-8 duration-500 space-y-6">
                        <h2 className="text-xl font-bold text-white mb-6">İlanının detaylarını belirle</h2>

                        {/* title */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400 ml-1">İlan Başlığı <span className="text-rose-500">*</span></label>
                            <input type="text" value={formData.title} onChange={(e) => handleFormChange('title', e.target.value)} placeholder="İlanını özetleyen bir başlık" className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:border-cyan-500/50 outline-none text-gray-200" />
                        </div>

                        {/* category specific blocks */}
                        {selectedCat === 'job' && (
                            <div className="space-y-4 animate-in zoom-in-95 duration-300 border-l-2 border-blue-500 pl-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-blue-400 ml-1">Çalışma Tipi <span className="text-rose-500">*</span></label>
                                        <select value={formData.jobType} onChange={(e) => handleFormChange('jobType', e.target.value)} className="w-full bg-blue-500/5 border border-blue-500/20 rounded-xl py-3 px-4 focus:border-blue-500/50 outline-none text-gray-200 appearance-none">
                                            <option value="" className="bg-gray-900">Seçiniz...</option>
                                            <option value="Tam Zamanlı" className="bg-gray-900">Tam Zamanlı</option>
                                            <option value="Yarı Zamanlı" className="bg-gray-900">Yarı Zamanlı</option>
                                            <option value="Staj" className="bg-gray-900">Staj / Gönüllü</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-blue-400 ml-1">Konum Türü <span className="text-rose-500">*</span></label>
                                        <select value={formData.jobLocationType} onChange={(e) => handleFormChange('jobLocationType', e.target.value)} className="w-full bg-blue-500/5 border border-blue-500/20 rounded-xl py-3 px-4 focus:border-blue-500/50 outline-none text-gray-200 appearance-none">
                                            <option value="" className="bg-gray-900">Seçiniz...</option>
                                            <option value="Kampüs İçi" className="bg-gray-900">Kampüs İçi</option>
                                            <option value="offcampus" className="bg-gray-900">Kampüs Dışı (İl/İlçe)</option>
                                        </select>
                                    </div>
                                </div>
                                {formData.jobLocationType === 'offcampus' && renderLocationSelector('text-blue-400')}
                            </div>
                        )}

                        {selectedCat === 'scholarship' && (
                            <div className="grid grid-cols-2 gap-4 animate-in zoom-in-95 duration-300 border-l-2 border-yellow-500 pl-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-yellow-400 ml-1">Burs Süresi <span className="text-rose-500">*</span></label>
                                    <select value={formData.scholarshipDuration} onChange={(e) => handleFormChange('scholarshipDuration', e.target.value)} className="w-full bg-yellow-500/5 border border-yellow-500/20 rounded-xl py-3 px-4 focus:border-yellow-500/50 outline-none text-gray-200 appearance-none">
                                        <option value="" className="bg-gray-900">Seçiniz...</option>
                                        <option value="Aylık Düzenli" className="bg-gray-900">Aylık Düzenli</option>
                                        <option value="Tek Seferlik" className="bg-gray-900">Tek Seferlik Destek</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-yellow-400 ml-1">Hedef Kitle <span className="text-rose-500">*</span></label>
                                    <input type="text" value={formData.scholarshipTarget} onChange={(e) => handleFormChange('scholarshipTarget', e.target.value)} placeholder="Örn: Sadece Mühendislik Fak." className="w-full bg-yellow-500/5 border border-yellow-500/20 rounded-xl py-3 px-4 focus:border-yellow-500/50 outline-none text-gray-200" />
                                </div>
                            </div>
                        )}

                        {selectedCat === 'carpool' && (
                            <div className="space-y-4 border-l-2 border-emerald-500 pl-4 animate-in zoom-in-95 duration-300">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-emerald-400 ml-1">Nereden <span className="text-rose-500">*</span></label>
                                        <input type="text" value={formData.fromLocation} onChange={(e) => handleFormChange('fromLocation', e.target.value)} placeholder="Örn: Kampüs" className="w-full bg-emerald-500/5 border border-emerald-500/20 rounded-xl py-3 px-4 outline-none text-gray-200" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-emerald-400 ml-1">Nereye <span className="text-rose-500">*</span></label>
                                        <input type="text" value={formData.toLocation} onChange={(e) => handleFormChange('toLocation', e.target.value)} placeholder="Örn: Alsancak" className="w-full bg-emerald-500/5 border border-emerald-500/20 rounded-xl py-3 px-4 outline-none text-gray-200" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-emerald-400 ml-1">Kalkış Zamanı <span className="text-rose-500">*</span></label>
                                        <input type="datetime-local" value={formData.departureTime} onChange={(e) => handleFormChange('departureTime', e.target.value)} className="w-full bg-emerald-500/5 border border-emerald-500/20 rounded-xl py-3 px-4 outline-none text-gray-400 [color-scheme:dark]" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-emerald-400 ml-1">Boş Koltuk <span className="text-rose-500">*</span></label>
                                        <input type="number" min="1" max="6" value={formData.emptySeats} onChange={(e) => handleFormChange('emptySeats', e.target.value)} placeholder="Örn: 2" className="w-full bg-emerald-500/5 border border-emerald-500/20 rounded-xl py-3 px-4 outline-none text-gray-200" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {selectedCat === 'roommate' && (
                            <div className="space-y-6 animate-in zoom-in-95 duration-300 border-l-2 border-teal-500 pl-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-teal-400 ml-1">Evin Konumu <span className="text-rose-500">*</span></label>
                                    {renderLocationSelector('text-teal-400')}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-teal-400 ml-1">Evcil Hayvan <span className="text-rose-500">*</span></label>
                                    <select value={formData.petStatus} onChange={(e) => handleFormChange('petStatus', e.target.value)} className="w-full bg-teal-500/5 border border-teal-500/20 rounded-xl py-3 px-4 outline-none text-gray-200 appearance-none">
                                        <option value="" className="bg-gray-900">Seçiniz...</option>
                                        <option value="Sorun Olmaz / Var" className="bg-gray-900">Sorun Olmaz / Evde Var</option>
                                        <option value="Tercih Etmiyorum" className="bg-gray-900">Tercih Etmiyorum</option>
                                    </select>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-teal-400 ml-1">Ev Kuralları / Kriterler</label>
                                        <div className="relative">
                                            <button type="button" onClick={() => setIsRuleDropdownOpen(!isRuleDropdownOpen)} className="flex items-center space-x-1 text-xs bg-teal-500/10 text-teal-400 px-3 py-1.5 rounded-full border border-teal-500/30 hover:bg-teal-500/20 transition-all">
                                                <Plus size={14} /> <span>Kriter Ekle</span>
                                            </button>
                                            {isRuleDropdownOpen && (
                                                <div className="absolute right-0 top-full mt-2 w-56 bg-[#121826] border border-white/10 rounded-xl shadow-2xl z-20 overflow-hidden">
                                                    <div className="max-h-48 overflow-y-auto">
                                                        {predefinedRules.map(rule => (
                                                            <button key={rule} onClick={() => toggleRule(rule)} className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-teal-500/20 hover:text-white transition-colors border-b border-white/5 last:border-0">{rule}</button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {selectedRules.length > 0 && (
                                        <div className="flex flex-wrap gap-2 pt-2">
                                            {selectedRules.map(rule => (
                                                <span key={rule} className="flex items-center space-x-2 bg-teal-500/20 text-teal-100 text-xs px-3 py-1.5 rounded-lg border border-teal-500/30">
                                                    <span>{rule}</span><button onClick={() => toggleRule(rule)} className="text-teal-400 hover:text-white"><X size={14} /></button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {selectedCat === 'tutoring' && (
                            <div className="grid grid-cols-2 gap-4 animate-in zoom-in-95 duration-300 border-l-2 border-indigo-500 pl-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-indigo-400 ml-1">Ders Konusu <span className="text-rose-500">*</span></label>
                                    <input type="text" value={formData.tutoringSubject} onChange={(e) => handleFormChange('tutoringSubject', e.target.value)} placeholder="Örn: Python" className="w-full bg-indigo-500/5 border border-indigo-500/20 rounded-xl py-3 px-4 outline-none text-gray-200" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-indigo-400 ml-1">Format <span className="text-rose-500">*</span></label>
                                    <select value={formData.tutoringFormat} onChange={(e) => handleFormChange('tutoringFormat', e.target.value)} className="w-full bg-indigo-500/5 border border-indigo-500/20 rounded-xl py-3 px-4 outline-none text-gray-200 appearance-none">
                                        <option value="" className="bg-gray-900">Seçiniz...</option>
                                        <option value="Sadece Online" className="bg-gray-900">Sadece Online</option>
                                        <option value="Yüz Yüze" className="bg-gray-900">Yüz Yüze</option>
                                        <option value="Fark Etmez" className="bg-gray-900">Fark Etmez (Hibrit)</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {selectedCat === 'notes' && (
                            <div className="grid grid-cols-2 gap-4 animate-in zoom-in-95 duration-300 border-l-2 border-violet-500 pl-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-violet-400 ml-1">Ders Kodu / Ders Adı<span className="text-rose-500">*</span></label>
                                    <input type="text" value={formData.noteCode} onChange={(e) => handleFormChange('noteCode', e.target.value)} placeholder="Örn: MAT101 / Matematik " className="w-full bg-violet-500/5 border border-violet-500/20 rounded-xl py-3 px-4 outline-none text-gray-200 uppercase" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-violet-400 ml-1">Format <span className="text-rose-500">*</span></label>
                                    <select value={formData.noteFormat} onChange={(e) => handleFormChange('noteFormat', e.target.value)} className="w-full bg-violet-500/5 border border-violet-500/20 rounded-xl py-3 px-4 outline-none text-gray-200 appearance-none">
                                        <option value="" className="bg-gray-900">Seçiniz...</option>
                                        <option value="Dijital (PDF/Word)" className="bg-gray-900">Dijital (PDF/Word)</option>
                                        <option value="Fiziksel Fotokopi" className="bg-gray-900">Fiziksel Fotokopi/Defter</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {selectedCat === 'secondhand' && (
                            <div className="space-y-6 animate-in zoom-in-95 duration-300 border-l-2 border-rose-500 pl-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-rose-400 ml-1">Konum <span className="text-rose-500">*</span></label>
                                    {renderLocationSelector('text-rose-400')}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-rose-400 ml-1">Eşya Durumu <span className="text-rose-500">*</span></label>
                                    <div className="flex space-x-4 mt-2">
                                        {['Sıfır', 'Yeni Gibi', 'Kullanılmış', 'Hasarlı'].map((cond) => (
                                            <label key={cond} className="flex items-center space-x-2 cursor-pointer group">
                                                <input type="radio" checked={formData.itemCondition === cond} onChange={() => handleFormChange('itemCondition', cond)} className="accent-rose-500 w-4 h-4 cursor-pointer" />
                                                <span className={`text-sm transition-colors ${formData.itemCondition === cond ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>{cond}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* description (common) */}
                        <div className="space-y-2 pt-4">
                            <label className="text-sm font-medium text-gray-400 ml-1">Açıklama <span className="text-rose-500">*</span></label>
                            <textarea rows={4} value={formData.description} onChange={(e) => handleFormChange('description', e.target.value)} placeholder="Detaylardan bahset..." className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:border-cyan-500/50 outline-none text-gray-200 resize-none"></textarea>
                        </div>
                    </div>
                )}

                {/* step 3: media and pricing */}
                {step === 3 && (
                    <div className="animate-in fade-in slide-in-from-right-8 duration-500 space-y-8">
                        <h2 className="text-xl font-bold text-white mb-2">Görsel ve Fiyatlandırma</h2>

                        <div className="w-full border-2 border-dashed border-white/10 hover:border-cyan-500/50 bg-black/20 hover:bg-cyan-500/5 rounded-2xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer group">
                            <div className="p-4 rounded-full bg-white/5 group-hover:bg-cyan-500/20 text-gray-500 group-hover:text-cyan-400 transition-all mb-4"><ImagePlus size={32} /></div>
                            <p className="text-white font-bold">Fotoğraf Yükle veya Sürükle</p>
                            <p className="text-sm text-gray-500 mt-2">Maksimum 3 görsel (PNG, JPG)</p>
                        </div>

                        {selectedCat === 'job' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in zoom-in-95">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-blue-400 ml-1">Ödeme Aralığı</label>
                                    <select value={formData.paymentFrequency} onChange={(e) => handleFormChange('paymentFrequency', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 outline-none text-gray-200 appearance-none">
                                        <option value="Günlük" className="bg-gray-900">Günlük</option>
                                        <option value="Haftalık" className="bg-gray-900">Haftalık</option>
                                        <option value="Aylık" className="bg-gray-900">Aylık</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-blue-400 ml-1">Maaş / Ücret (TL) <span className="text-rose-500">*</span></label>
                                    <div className="relative">
                                        <TurkishLira className="absolute left-4 top-3.5 text-gray-600" size={20} />
                                        <input type="number" value={formData.price} onChange={(e) => handleFormChange('price', e.target.value)} placeholder="0" className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 outline-none text-gray-200" />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in zoom-in-95">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-400 ml-1">Fiyat <span className="text-rose-500">*</span></label>
                                    <div className="relative">
                                        <TurkishLira className="absolute left-4 top-3.5 text-gray-600" size={20} />
                                        <input type="number" value={formData.price} onChange={(e) => handleFormChange('price', e.target.value)} placeholder="0" className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 outline-none text-gray-200" />
                                    </div>
                                </div>

                                <div className={`space-y-2 p-4 rounded-xl border transition-all ${isVerifiedStudent ? 'border-rose-500/30 bg-rose-500/5' : 'border-white/5 bg-black/20 opacity-50'}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                            <Repeat className={isVerifiedStudent ? 'text-rose-400' : 'text-gray-600'} size={20} />
                                            <span className="font-bold text-gray-200">Takasa Uygun</span>
                                        </div>
                                        <button disabled={!isVerifiedStudent} onClick={() => { setIsExchangePossible(!isExchangePossible); handleFormChange('exchangeFor', ''); }} className={`w-12 h-6 rounded-full relative transition-colors ${isExchangePossible ? 'bg-rose-500' : 'bg-gray-700'}`}>
                                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isExchangePossible ? 'left-7' : 'left-1'}`}></div>
                                        </button>
                                    </div>

                                    {isExchangePossible && isVerifiedStudent && (
                                        <div className="mt-4 animate-in slide-in-from-top-2 duration-300">
                                            <input type="text" value={formData.exchangeFor} onChange={(e) => handleFormChange('exchangeFor', e.target.value)} placeholder="Ne ile takas düşünürsün? *" className="w-full bg-black/40 border border-rose-500/30 rounded-lg py-2 px-3 text-sm outline-none text-gray-200" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* step 4: preview and publishing */}
                {step === 4 && activeCatData && (
                    <div className="animate-in fade-in slide-in-from-right-8 duration-500 space-y-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2"><Eye className="text-cyan-400" /> İlan Önizlemesi</h2>
                            <span className="text-sm text-gray-500">Kullanıcılar ilanını böyle görecek.</span>
                        </div>

                        {/* mock listing card (maybe temp until we implement better preview)*/}
                        <div className="max-w-2xl mx-auto bg-[#0B0F19] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative group">
                            <div className={`absolute top-0 left-0 w-full h-1 bg-${activeCatData.baseColor}-500`}></div>

                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`px-3 py-1 rounded-full text-xs font-bold bg-${activeCatData.baseColor}-500/10 text-${activeCatData.baseColor}-400 border border-${activeCatData.baseColor}-500/20 inline-flex items-center gap-2`}>
                                        <activeCatData.icon size={14} /> {activeCatData.title}
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-black text-white flex items-center gap-1"><TurkishLira size={20} />{formData.price === '0' ? 'Ücretsiz' : formData.price}</div>
                                        {selectedCat === 'job' && formData.price !== '0' && <span className="text-xs text-gray-500">{formData.paymentFrequency}</span>}
                                    </div>
                                </div>

                                <h3 className="text-xl font-bold text-gray-100 mb-2">{formData.title}</h3>
                                <p className="text-sm text-gray-400 mb-6 line-clamp-3 leading-relaxed">{formData.description}</p>

                                {/* dynamic pills for preview */}
                                <div className="flex flex-wrap gap-2">
                                    {(city || formData.jobLocationType === 'Kampüs İçi' || formData.fromLocation) && (
                                        <div className="px-3 py-1.5 bg-white/5 rounded-lg text-xs text-gray-300 flex items-center gap-1 border border-white/5">
                                            <MapPin size={12} className={`text-${activeCatData.baseColor}-400`} />
                                            {formData.jobLocationType === 'Kampüs İçi' ? 'Kampüs İçi' : formData.fromLocation ? `${formData.fromLocation} -> ${formData.toLocation}` : `${district}, ${city}`}
                                        </div>
                                    )}
                                    {formData.jobType && (
                                        <div className="px-3 py-1.5 bg-white/5 rounded-lg text-xs text-gray-300 flex items-center gap-1 border border-white/5">
                                            <Briefcase size={12} className="text-blue-400" /> {formData.jobType}
                                        </div>
                                    )}
                                    {formData.departureTime && (
                                        <div className="px-3 py-1.5 bg-white/5 rounded-lg text-xs text-gray-300 flex items-center gap-1 border border-white/5">
                                            <Calendar size={12} className="text-emerald-400" /> {new Date(formData.departureTime).toLocaleString('tr-TR', {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}
                                        </div>
                                    )}
                                    {isExchangePossible && formData.exchangeFor && (
                                        <div className="px-3 py-1.5 bg-rose-500/10 rounded-lg text-xs text-rose-300 flex items-center gap-1 border border-rose-500/20">
                                            <Repeat size={12} /> Takas: {formData.exchangeFor}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* nav buttons */}
            <div className="flex items-center justify-between mt-8">
                <button onClick={prevStep} disabled={step === 1} className={`flex items-center space-x-2 px-6 py-3 rounded-full font-bold transition-all ${step === 1 ? 'opacity-0 pointer-events-none' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                    <ArrowLeft size={20} /><span>Geri</span>
                </button>
                <button
                    onClick={() => step === 4 ? console.log("Yayınlandı:", formData) : nextStep()}
                    disabled={isNextDisabled()}
                    className={`flex items-center space-x-2 px-8 py-3 rounded-full font-black text-[#0B0F19] transition-all duration-300 ${isNextDisabled() ? 'bg-gray-700 cursor-not-allowed opacity-50' : 'bg-cyan-500 hover:bg-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)]'}`}
                >
                    <span>{step === 3 ? 'Önizlemeyi Gör' : step === 4 ? 'YAYINLA' : 'Devam Et'}</span>
                    {step !== 4 && <ArrowRight size={20} />}
                </button>
            </div>

        </div>
    );
}