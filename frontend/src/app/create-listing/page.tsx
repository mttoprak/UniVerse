"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Briefcase, Car, Lock, ArrowRight, ArrowLeft,
    CheckCircle2, ImagePlus, TurkishLira, Calendar, MapPin,
    FileText, Award, Presentation, ShoppingBag, Repeat, Home, Plus, X, Eye,
    AlertTriangle, Video
} from 'lucide-react';

const categories = [
    { id: 'job', title: 'İş / Staj', icon: Briefcase, requiresStudent: false, color: 'text-blue-400', border: 'border-blue-500/30', bg: 'hover:bg-blue-500/10', previewBg: 'bg-blue-500', previewText: 'text-blue-400', previewPillBg: 'bg-blue-500/10', previewBorder: 'border-blue-500/20' },
    { id: 'scholarship', title: 'Burs', icon: Award, requiresStudent: false, color: 'text-yellow-400', border: 'border-yellow-500/30', bg: 'hover:bg-yellow-500/10', previewBg: 'bg-yellow-500', previewText: 'text-yellow-400', previewPillBg: 'bg-yellow-500/10', previewBorder: 'border-yellow-500/20' },
    { id: 'carpool', title: 'Yol Arkadaşı', icon: Car, requiresStudent: false, color: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'hover:bg-emerald-500/10', previewBg: 'bg-emerald-500', previewText: 'text-emerald-400', previewPillBg: 'bg-emerald-500/10', previewBorder: 'border-emerald-500/20' },
    { id: 'roommate', title: 'Ev/Oda Arkadaşı', icon: Home, requiresStudent: true, color: 'text-teal-400', border: 'border-teal-500/30', bg: 'hover:bg-teal-500/10', previewBg: 'bg-teal-500', previewText: 'text-teal-400', previewPillBg: 'bg-teal-500/10', previewBorder: 'border-teal-500/20' },
    { id: 'tutoring', title: 'Özel Ders', icon: Presentation, requiresStudent: true, color: 'text-indigo-400', border: 'border-indigo-500/30', bg: 'hover:bg-indigo-500/10', previewBg: 'bg-indigo-500', previewText: 'text-indigo-400', previewPillBg: 'bg-indigo-500/10', previewBorder: 'border-indigo-500/20' },
    { id: 'notes', title: 'Ders Notu', icon: FileText, requiresStudent: true, color: 'text-violet-400', border: 'border-violet-500/30', bg: 'hover:bg-violet-500/10', previewBg: 'bg-violet-500', previewText: 'text-violet-400', previewPillBg: 'bg-violet-500/10', previewBorder: 'border-violet-500/20' },
    { id: 'secondhand', title: 'İkinci El Satış', icon: ShoppingBag, requiresStudent: true, color: 'text-rose-400', border: 'border-rose-500/30', bg: 'hover:bg-rose-500/10', previewBg: 'bg-rose-500', previewText: 'text-rose-400', previewPillBg: 'bg-rose-500/10', previewBorder: 'border-rose-500/20' },
    { id: 'emergency', title: 'Acil İlan', icon: AlertTriangle, requiresStudent: false, color: 'text-red-500', border: 'border-red-500/50', bg: 'hover:bg-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]', previewBg: 'bg-red-500', previewText: 'text-red-500', previewPillBg: 'bg-red-500/10', previewBorder: 'border-red-500/20' }
];

const predefinedRules = ["Sigara İçmeyen", "Evcil Hayvan Yasak", "Evcil Hayvan Dostu", "Sadece Öğrenci", "Sadece Çalışan", "Misafir Yasak", "Düzenli/Temiz", "Vejetaryen", "Vegan", "Gürültü Yasak"];

// Türkiye'deki 81 ilin ID ve isimlerini içeren dizi
const TURKISH_CITIES = [
    {id:"01",name:"Adana"},{id:"02",name:"Adıyaman"},{id:"03",name:"Afyonkarahisar"},{id:"04",name:"Ağrı"},{id:"05",name:"Amasya"},{id:"06",name:"Ankara"},{id:"07",name:"Antalya"},{id:"08",name:"Artvin"},{id:"09",name:"Aydın"},{id:"10",name:"Balıkesir"},{id:"11",name:"Bilecik"},{id:"12",name:"Bingöl"},{id:"13",name:"Bitlis"},{id:"14",name:"Bolu"},{id:"15",name:"Burdur"},{id:"16",name:"Bursa"},{id:"17",name:"Çanakkale"},{id:"18",name:"Çankırı"},{id:"19",name:"Çorum"},{id:"20",name:"Denizli"},{id:"21",name:"Diyarbakır"},{id:"22",name:"Edirne"},{id:"23",name:"Elazığ"},{id:"24",name:"Erzincan"},{id:"25",name:"Erzurum"},{id:"26",name:"Eskişehir"},{id:"27",name:"Gaziantep"},{id:"28",name:"Giresun"},{id:"29",name:"Gümüşhane"},{id:"30",name:"Hakkari"},{id:"31",name:"Hatay"},{id:"32",name:"Isparta"},{id:"33",name:"Mersin"},{id:"34",name:"İstanbul"},{id:"35",name:"İzmir"},{id:"36",name:"Kars"},{id:"37",name:"Kastamonu"},{id:"38",name:"Kayseri"},{id:"39",name:"Kırklareli"},{id:"40",name:"Kırşehir"},{id:"41",name:"Kocaeli"},{id:"42",name:"Konya"},{id:"43",name:"Kütahya"},{id:"44",name:"Malatya"},{id:"45",name:"Manisa"},{id:"46",name:"Kahramanmaraş"},{id:"47",name:"Mardin"},{id:"48",name:"Muğla"},{id:"49",name:"Muş"},{id:"50",name:"Nevşehir"},{id:"51",name:"Niğde"},{id:"52",name:"Ordu"},{id:"53",name:"Rize"},{id:"54",name:"Sakarya"},{id:"55",name:"Samsun"},{id:"56",name:"Siirt"},{id:"57",name:"Sinop"},{id:"58",name:"Sivas"},{id:"59",name:"Tekirdağ"},{id:"60",name:"Tokat"},{id:"61",name:"Trabzon"},{id:"62",name:"Tunceli"},{id:"63",name:"Şanlıurfa"},{id:"64",name:"Uşak"},{id:"65",name:"Van"},{id:"66",name:"Yozgat"},{id:"67",name:"Zonguldak"},{id:"68",name:"Aksaray"},{id:"69",name:"Bayburt"},{id:"70",name:"Karaman"},{id:"71",name:"Kırıkkale"},{id:"72",name:"Batman"},{id:"73",name:"Şırnak"},{id:"74",name:"Bartın"},{id:"75",name:"Ardahan"},{id:"76",name:"Iğdır"},{id:"77",name:"Yalova"},{id:"78",name:"Karabük"},{id:"79",name:"Kilis"},{id:"80",name:"Osmaniye"},{id:"81",name:"Düzce"}
];

export default function CreateListingWizard() {
    const router = useRouter();

    const [step, setStep] = useState(1);
    const [selectedCat, setSelectedCat] = useState<string | null>(null);
    const [isVerifiedStudent, setIsVerifiedStudent] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [submitError, setSubmitError] = useState<string | null>(null);

    // media upload states
    const [mediaFiles, setMediaFiles] = useState<File[]>([]);
    const [mediaPreviews, setMediaPreviews] = useState<{url: string, type: string}[]>([]);

    const [formData, setFormData] = useState({
        title: '', description: '',
        jobType: '', jobLocationType: '',
        scholarshipDuration: '', scholarshipTarget: '',
        fromLocation: '', toLocation: '', departureTime: '', emptySeats: '',
        tutoringSubject: '', tutoringFormat: '',
        noteCode: '', noteFormat: '', itemCondition: '',
        price: '', paymentFrequency: 'monthly', exchangeFor: ''
    });

    const [districts, setDistricts] = useState<string[]>([]);
    const [selectedCityId, setSelectedCityId] = useState('');
    const [city, setCity] = useState('');
    const [district, setDistrict] = useState('');

    const [selectedRules, setSelectedRules] = useState<string[]>([]);
    const [isRuleDropdownOpen, setIsRuleDropdownOpen] = useState(false);
    const [isExchangePossible, setIsExchangePossible] = useState(false);

    // AKILLI AUTH KONTROLÜ
    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('accessToken');
            if (!token) return;

            try {
                // Mehmet dokümanda POST yazmış ama standartlarda GET kullanılır. Eğer 404 alıyorsa sorun bundandır.
                const userRes = await fetch('http://localhost:5000/api/auth/me', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                const text = await userRes.text(); // JSON yerine saf metni çekiyoruz

                try {
                    const data = JSON.parse(text); // Json parse etmeyi dene
                    if (userRes.ok) {
                        const userData = data.user || data;
                        console.log("Giriş Yapan Kullanıcı: ", userData);
                        setIsVerifiedStudent(userData.account_type === 'student' || !!userData.edu_email);
                    }
                } catch (e) {
                    console.error("Auth Hata: JSON gelmedi. HTML Çıktısı:", text.substring(0, 150));
                }
            } catch (error) {
                console.error("Bağlantı hatası:", error);
            }
        };
        checkAuth();
    }, []);

    useEffect(() => {
        const fetchDistricts = async () => {
            if (!selectedCityId) {
                setDistricts([]);
                return;
            }
            try {
                const res = await fetch(`http://localhost:5000/api/misc/districts/${selectedCityId}`);
                if (res.ok) {
                    const data = await res.json();
                    setDistricts(data);
                }
            } catch (error) {
                console.error("İlçeler çekilemedi", error);
            }
        };

        fetchDistricts();
    }, [selectedCityId]);

    const isStep2Valid = () => {
        if (!formData.title.trim() || !formData.description.trim()) return false;
        switch (selectedCat) {
            case 'job': return formData.jobType && formData.jobLocationType && (formData.jobLocationType !== 'offcampus' || (city && district));
            case 'scholarship': return formData.scholarshipDuration && formData.scholarshipTarget;
            case 'carpool': return formData.fromLocation && formData.toLocation && formData.departureTime && formData.emptySeats;
            case 'roommate': return !!(city && district);
            case 'tutoring': return formData.tutoringSubject && formData.tutoringFormat;
            case 'notes': return formData.noteCode && formData.noteFormat;
            case 'secondhand': return city && district && formData.itemCondition;
            case 'emergency': return true;
            default: return false;
        }
    };

    const isStep3Valid = () => {
        if (formData.price === '') return false;
        if (isExchangePossible && !formData.exchangeFor.trim()) return false;
        return true;
    };

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

    const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const fileArray = Array.from(e.target.files).slice(0, 3);
            setMediaFiles(fileArray);

            const previews = fileArray.map(file => ({
                url: URL.createObjectURL(file),
                type: file.type.startsWith('video/') ? 'video' : 'image'
            }));
            setMediaPreviews(previews);
        }
    };

    const removeMedia = (index: number) => {
        setMediaFiles(prev => prev.filter((_, i) => i !== index));
        setMediaPreviews(prev => prev.filter((_, i) => i !== index));
    };

    // AKILLI İLAN YÜKLEME SİSTEMİ
    const submitListing = async () => {
        setIsSubmitting(true);
        setSubmitStatus('idle');
        setSubmitError(null);

        try {
            const token = localStorage.getItem('accessToken');
            if (!token) throw new Error('Oturum bulunamadı. Lütfen giriş yapın.');

            const submitData = new FormData();

            let backendType = selectedCat;
            if (selectedCat === 'carpool') backendType = 'carpooling';
            if (selectedCat === 'tutoring' || selectedCat === 'notes') backendType = 'course';
            if (selectedCat === 'emergency') backendType = 'secondhand';

            submitData.append('type', backendType || 'secondhand');
            submitData.append('title', formData.title);
            submitData.append('description', formData.description);
            submitData.append('price', formData.price || '0');
            submitData.append('category', selectedCat || '');

            if (selectedCat === 'emergency') {
                submitData.append('is_urgent', 'true');
            }

            let finalLocation = '';
            if (city && district) {
                finalLocation = `${district}, ${city}`;
            } else if (formData.fromLocation && formData.toLocation) {
                finalLocation = `${formData.fromLocation} -> ${formData.toLocation}`;
            } else if (formData.jobLocationType === 'Kampüs İçi') {
                finalLocation = 'Kampüs İçi';
            }
            if (finalLocation) submitData.append('location', finalLocation);

            if (formData.itemCondition) {
                const conditionMap: { [key: string]: string } = {
                    'Sıfır': 'new', 'Yeni Gibi': 'like_new', 'Kullanılmış': 'good', 'Hasarlı': 'fair'
                };
                submitData.append('condition', conditionMap[formData.itemCondition] || formData.itemCondition);
            }

            submitData.append('rules', JSON.stringify(selectedRules));
            if (isExchangePossible) submitData.append('exchangeFor', formData.exchangeFor);
            if (formData.departureTime) submitData.append('departureTime', formData.departureTime);
            if (formData.emptySeats) submitData.append('emptySeats', formData.emptySeats);

            mediaFiles.forEach(file => {
                submitData.append('photos', file);
            });

            // Mehmet'in HTTP isteğinde yazdığı "/api/listing" (tekil) URL'ini kullanıyoruz:
            const response = await fetch('http://localhost:5000/api/listings', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: submitData
            });

            // JSON YERİNE HTML GELİRSE YAKALAYALIM
            const text = await response.text();

            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                // Eğer JSON'a çevrilemiyorsa HTML sayfası gelmiştir. İçinden Hatayı (Örn: Cannot POST /api/...) cımbızlayalım
                let extractedError = "Bilinmeyen Sunucu Hatası";
                if (text.includes("Cannot POST")) {
                    const match = text.match(/Cannot POST \/[a-zA-Z0-9/_-]+/);
                    if (match) extractedError = match[0];
                } else if (text.includes("<title>")) {
                    const match = text.match(/<title>(.*?)<\/title>/);
                    if (match) extractedError = match[1];
                }

                throw new Error(`Yanlış Endpoint: ${extractedError}`);
            }

            if (!response.ok) {
                throw new Error(data.message || data.error || 'İlan oluşturulurken hata oluştu.');
            }

            setSubmitStatus('success');

            setTimeout(() => {
                router.push('/feed');
            }, 2000);

        } catch (error: any) {
            console.error("İlan gönderme hatası:", error);
            setSubmitError(error.message);
            setSubmitStatus('error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const targetId = e.target.value;
        setSelectedCityId(targetId);

        const cityName = TURKISH_CITIES.find(c => c.id === targetId)?.name || '';
        setCity(cityName);
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
                <select value={selectedCityId} onChange={handleCityChange} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:border-white/30 outline-none text-gray-200 appearance-none">
                    <option value="" className="bg-gray-900">İl Seçiniz...</option>
                    {TURKISH_CITIES.map(c => <option key={c.id} value={c.id} className="bg-gray-900">{c.name}</option>)}
                </select>
            </div>
            <div className="space-y-2">
                <label className={`text-sm font-medium ${accentColor} ml-1`}>İlçe</label>
                <select value={district} onChange={(e) => setDistrict(e.target.value)} disabled={!selectedCityId || districts.length === 0} className={`w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:border-white/30 outline-none ${(!selectedCityId || districts.length === 0) ? 'text-gray-600 opacity-50 cursor-not-allowed' : 'text-gray-200'} appearance-none`}>
                    <option value="" className="bg-gray-900">İlçe Seçiniz...</option>
                    {districts.map(dName => <option key={dName} value={dName} className="bg-gray-900">{dName}</option>)}
                </select>
            </div>
        </div>
    );

    const activeCatData = categories.find(c => c.id === selectedCat);
    const availableRules = predefinedRules.filter(rule => !selectedRules.includes(rule));

    return (
        <div className="max-w-5xl mx-auto pb-20">

            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Yeni İlan <span className="text-cyan-400">Oluştur</span></h1>
                    <p className="text-gray-500 mt-1">Sihirbazı kullanarak ilanını saniyeler içinde yayınla.</p>
                </div>
                <div className={`px-4 py-2 rounded-full text-xs font-bold border transition-colors duration-500 ${isVerifiedStudent ? 'bg-violet-500/20 text-violet-300 border-violet-500/50' : 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                    {isVerifiedStudent ? '🎓 Onaylı Öğrenci' : '👤 Standart Kullanıcı'}
                </div>
            </div>

            {submitError && (
                <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center space-x-3 text-rose-400 text-sm animate-pulse">
                    <AlertTriangle size={20} className="flex-shrink-0" />
                    <span>{submitError}</span>
                </div>
            )}

            <div className="flex items-center justify-between mb-12 relative">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-white/5 -z-10 rounded-full"></div>
                <div className={`absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-cyan-500 shadow-[0_0_10px_#22d3ee] -z-10 rounded-full transition-all duration-500`} style={{ width: `${((step - 1) / 3) * 100}%` }}></div>
                {[1, 2, 3, 4].map((num) => (
                    <div key={num} className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 transition-all duration-300 ${step >= num ? 'bg-[#0B0F19] border-cyan-400 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)]' : 'bg-[#0B0F19] border-white/10 text-gray-600'}`}>
                        {step > num ? <CheckCircle2 size={20} /> : num === 4 ? <Eye size={18} /> : num}
                    </div>
                ))}
            </div>

            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 md:p-12 shadow-2xl min-h-[400px]">

                {step === 1 && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h2 className="text-xl font-bold text-white mb-6">Ne tür bir ilan vermek istiyorsun?</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {categories.map((cat) => {
                                const isLocked = cat.requiresStudent && !isVerifiedStudent;
                                const isSelected = selectedCat === cat.id;
                                return (
                                    <button
                                        key={cat.id}
                                        disabled={isLocked}
                                        onClick={() => setSelectedCat(cat.id)}
                                        className={`relative flex flex-col items-start p-5 rounded-2xl border transition-all duration-300 text-left group ${isLocked ? 'bg-black/20 border-white/5 opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${isSelected ? `bg-white/5 ${cat.border} shadow-[0_0_20px_rgba(255,255,255,0.05)] translate-y-[-4px]` : `bg-black/40 border-white/5 ${cat.bg}`}`}
                                    >
                                        <div className={`p-4 rounded-full bg-black/50 ${isLocked ? 'text-gray-600' : cat.color} mb-4`}>
                                            {isLocked ? <Lock size={24} /> : <cat.icon size={24} />}
                                        </div>
                                        <div>
                                            <h3 className={`text-base font-extrabold ${isLocked ? 'text-gray-500' : 'text-gray-200'}`}>{cat.title}</h3>
                                            <p className="text-[11px] text-gray-500 mt-1">
                                                {isLocked ? 'Sadece onaylı öğrenciler' : cat.id === 'emergency' ? 'Acil yardım çağrısı' : 'Seç'}
                                            </p>
                                        </div>
                                        {isSelected && <div className="absolute top-4 right-4 text-cyan-400"><CheckCircle2 size={18} /></div>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="animate-in fade-in slide-in-from-right-8 duration-500 space-y-6">
                        <h2 className="text-xl font-bold text-white mb-6">İlanının detaylarını belirle</h2>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400 ml-1">İlan Başlığı <span className="text-rose-500">*</span></label>
                            <input type="text" value={formData.title} onChange={(e) => handleFormChange('title', e.target.value)} placeholder="İlanını özetleyen bir başlık" className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:border-cyan-500/50 outline-none text-gray-200" />
                        </div>

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
                                                        {availableRules.length === 0 ? (
                                                            <div className="px-4 py-3 text-sm text-gray-500 text-center">Tüm kriterleri eklediniz.</div>
                                                        ) : (
                                                            availableRules.map(rule => (
                                                                <button key={rule} onClick={() => toggleRule(rule)} className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-teal-500/20 hover:text-white transition-colors border-b border-white/5 last:border-0">{rule}</button>
                                                            ))
                                                        )}
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

                        <div className="space-y-2 pt-4">
                            <label className="text-sm font-medium text-gray-400 ml-1">Açıklama <span className="text-rose-500">*</span></label>
                            <textarea rows={4} value={formData.description} onChange={(e) => handleFormChange('description', e.target.value)} placeholder="Detaylardan bahset..." className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:border-cyan-500/50 outline-none text-gray-200 resize-none"></textarea>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="animate-in fade-in slide-in-from-right-8 duration-500 space-y-8">
                        <h2 className="text-xl font-bold text-white mb-2">Medya ve Fiyatlandırma</h2>

                        <label className="w-full border-2 border-dashed border-white/10 hover:border-cyan-500/50 bg-black/20 hover:bg-cyan-500/5 rounded-2xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer group">
                            <input
                                type="file"
                                multiple
                                accept="image/*, video/*"
                                className="hidden"
                                onChange={handleMediaUpload}
                            />
                            <div className="p-4 rounded-full bg-white/5 group-hover:bg-cyan-500/20 text-gray-500 group-hover:text-cyan-400 transition-all mb-4">
                                <ImagePlus size={32} />
                            </div>
                            <p className="text-white font-bold">Fotoğraf veya Video Yükle</p>
                            <p className="text-sm text-gray-500 mt-2">Maksimum 3 adet medya (PNG, JPG, MP4)</p>
                        </label>

                        {mediaPreviews.length > 0 && (
                            <div className="flex gap-4">
                                {mediaPreviews.map((preview, idx) => (
                                    <div key={idx} className="relative w-24 h-24 rounded-xl overflow-hidden border border-white/20 bg-black/50 flex items-center justify-center">
                                        {preview.type === 'video' ? (
                                            <>
                                                <video src={preview.url} className="w-full h-full object-cover opacity-50" />
                                                <Video className="absolute text-white" size={24} />
                                            </>
                                        ) : (
                                            <img src={preview.url} alt="preview" className="w-full h-full object-cover" />
                                        )}
                                        <button
                                            type="button"
                                            onClick={(e) => { e.preventDefault(); removeMedia(idx); }}
                                            className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full hover:bg-rose-500 transition-colors"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

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

                {step === 4 && activeCatData && (
                    <div className="animate-in fade-in slide-in-from-right-8 duration-500 space-y-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2"><Eye className="text-cyan-400" /> İlan Önizlemesi</h2>
                            <span className="text-sm text-gray-500">Kullanıcılar ilanını böyle görecek.</span>
                        </div>

                        <div className="max-w-2xl mx-auto bg-[#0B0F19] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative group">
                            <div className={`absolute top-0 left-0 w-full h-1 ${activeCatData.previewBg}`}></div>

                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${activeCatData.previewPillBg} ${activeCatData.previewText} border ${activeCatData.previewBorder} inline-flex items-center gap-2`}>
                                        <activeCatData.icon size={14} /> {activeCatData.title}
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-black text-white flex items-center gap-1"><TurkishLira size={20} />{formData.price === '0' ? 'Ücretsiz' : formData.price}</div>
                                        {selectedCat === 'job' && formData.price !== '0' && <span className="text-xs text-gray-500">{formData.paymentFrequency}</span>}
                                    </div>
                                </div>

                                <h3 className="text-xl font-bold text-gray-100 mb-2">{formData.title}</h3>
                                <p className="text-sm text-gray-400 mb-6 line-clamp-3 leading-relaxed">{formData.description}</p>

                                <div className="flex flex-wrap gap-2">
                                    {(city || formData.jobLocationType === 'Kampüs İçi' || formData.fromLocation) && (
                                        <div className="px-3 py-1.5 bg-white/5 rounded-lg text-xs text-gray-300 flex items-center gap-1 border border-white/5">
                                            <MapPin size={12} className={activeCatData.previewText} />
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

            <div className="flex items-center justify-between mt-8">
                <button onClick={prevStep} disabled={step === 1} className={`flex items-center space-x-2 px-6 py-3 rounded-full font-bold transition-all ${step === 1 ? 'opacity-0 pointer-events-none' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                    <ArrowLeft size={20} /><span>Geri</span>
                </button>
                <button
                    onClick={() => step === 4 ? submitListing() : nextStep()}
                    disabled={isNextDisabled() || isSubmitting}
                    className={`flex items-center space-x-2 px-8 py-3 rounded-full font-black text-[#0B0F19] transition-all duration-300 ${
                        isNextDisabled() || isSubmitting
                            ? 'bg-gray-700 cursor-not-allowed opacity-50'
                            : submitStatus === 'success'
                                ? 'bg-emerald-500'
                                : 'bg-cyan-500 hover:bg-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)]'}`}>
                    <span>
                      {isSubmitting ? 'Yayınlanıyor...' :
                          submitStatus === 'success' ? 'Başarıyla Yayınlandı!' : step === 3 ? 'Önizlemeyi Gör' : step === 4 ? 'YAYINLA' : 'Devam Et'}
                    </span>
                    {step !== 4 && <ArrowRight size={20} />}
                </button>
            </div>

        </div>
    );
}