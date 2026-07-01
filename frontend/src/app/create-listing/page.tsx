"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleMap, useJsApiLoader, Marker, Autocomplete } from '@react-google-maps/api';
import {
    Briefcase, Car, Lock, ArrowRight, ArrowLeft,
    CheckCircle2, ImagePlus, TurkishLira, MapPin,
    FileText, Award, Presentation, ShoppingBag, Home, X, Eye,
    AlertTriangle, Link as LinkIcon, ListPlus, Tag, Map, Search, Clock
} from 'lucide-react';

const categories = [
    { id: 'secondhand', title: 'İkinci El Satış', icon: ShoppingBag, requiresStudent: true, color: 'text-rose-400', border: 'border-rose-500/30', bg: 'hover:bg-rose-500/10', previewBg: 'bg-rose-500', previewText: 'text-rose-400', previewPillBg: 'bg-rose-500/10', previewBorder: 'border-rose-500/20' },
    { id: 'roommate', title: 'Ev/Oda Arkadaşı', icon: Home, requiresStudent: true, color: 'text-teal-400', border: 'border-teal-500/30', bg: 'hover:bg-teal-500/10', previewBg: 'bg-teal-500', previewText: 'text-teal-400', previewPillBg: 'bg-teal-500/10', previewBorder: 'border-teal-500/20' },
    { id: 'job', title: 'İş / Staj', icon: Briefcase, requiresStudent: false,  color: 'text-blue-400', border: 'border-blue-500/30', bg: 'hover:bg-blue-500/10', previewBg: 'bg-blue-500', previewText: 'text-blue-400', previewPillBg: 'bg-blue-500/10', previewBorder: 'border-blue-500/20' },
    { id: 'emergency', title: 'Acil İlan', icon: AlertTriangle, requiresStudent: false, color: 'text-red-500', border: 'border-red-500/50', bg: 'hover:bg-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]', previewBg: 'bg-red-500', previewText: 'text-red-500', previewPillBg: 'bg-red-500/10', previewBorder: 'border-red-500/20' },
    { id: 'scholarship', title: 'Burs', icon: Award, requiresStudent: false, color: 'text-yellow-400', border: 'border-yellow-500/30', bg: 'hover:bg-yellow-500/10', previewBg: 'bg-yellow-500', previewText: 'text-yellow-400', previewPillBg: 'bg-yellow-500/10', previewBorder: 'border-yellow-500/20' },
    { id: 'carpool', title: 'Yol Arkadaşı', icon: Car, requiresStudent: false, color: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'hover:bg-emerald-500/10', previewBg: 'bg-emerald-500', previewText: 'text-emerald-400', previewPillBg: 'bg-emerald-500/10', previewBorder: 'border-emerald-500/20' },
    { id: 'tutoring', title: 'Özel Ders', icon: Presentation, requiresStudent: true, color: 'text-indigo-400', border: 'border-indigo-500/30', bg: 'hover:bg-indigo-500/10', previewBg: 'bg-indigo-500', previewText: 'text-indigo-400', previewPillBg: 'bg-indigo-500/10', previewBorder: 'border-indigo-500/20' },
    { id: 'notes', title: 'Ders Notu', icon: FileText, requiresStudent: true, color: 'text-violet-400', border: 'border-violet-500/30', bg: 'hover:bg-violet-500/10', previewBg: 'bg-violet-500', previewText: 'text-violet-400', previewPillBg: 'bg-violet-500/10', previewBorder: 'border-violet-500/20' }
];

const TURKISH_CITIES = [
    {id:"1",name:"Adana"},{id:"2",name:"Adıyaman"},{id:"3",name:"Afyonkarahisar"},{id:"4",name:"Ağrı"},{id:"5",name:"Amasya"},{id:"6",name:"Ankara"},{id:"7",name:"Antalya"},{id:"8",name:"Artvin"},{id:"9",name:"Aydın"},{id:"10",name:"Balıkesir"},{id:"11",name:"Bilecik"},{id:"12",name:"Bingöl"},{id:"13",name:"Bitlis"},{id:"14",name:"Bolu"},{id:"15",name:"Burdur"},{id:"16",name:"Bursa"},{id:"17",name:"Çanakkale"},{id:"18",name:"Çankırı"},{id:"19",name:"Çorum"},{id:"20",name:"Denizli"},{id:"21",name:"Diyarbakır"},{id:"22",name:"Edirne"},{id:"23",name:"Elazığ"},{id:"24",name:"Erzincan"},{id:"25",name:"Erzurum"},{id:"26",name:"Eskişehir"},{id:"27",name:"Gaziantep"},{id:"28",name:"Giresun"},{id:"29",name:"Gümüşhane"},{id:"30",name:"Hakkari"},{id:"31",name:"Hatay"},{id:"32",name:"Isparta"},{id:"33",name:"Mersin"},{id:"34",name:"İstanbul"},{id:"35",name:"İzmir"},{id:"36",name:"Kars"},{id:"37",name:"Kastamonu"},{id:"38",name:"Kayseri"},{id:"39",name:"Kırklareli"},{id:"40",name:"Kırşehir"},{id:"41",name:"Kocaeli"},{id:"42",name:"Konya"},{id:"43",name:"Kütahya"},{id:"44",name:"Malatya"},{id:"45",name:"Manisa"},{id:"46",name:"Kahramanmaraş"},{id:"47",name:"Mardin"},{id:"48",name:"Muğla"},{id:"49",name:"Muş"},{id:"50",name:"Nevşehir"},{id:"51",name:"Niğde"},{id:"52",name:"Ordu"},{id:"53",name:"Rize"},{id:"54",name:"Sakarya"},{id:"55",name:"Samsun"},{id:"56",name:"Siirt"},{id:"57",name:"Sinop"},{id:"58",name:"Sivas"},{id:"59",name:"Tekirdağ"},{id:"60",name:"Tokat"},{id:"61",name:"Trabzon"},{id:"62",name:"Tunceli"},{id:"63",name:"Şanlıurfa"},{id:"64",name:"Uşak"},{id:"65",name:"Van"},{id:"66",name:"Yozgat"},{id:"67",name:"Zonguldak"},{id:"68",name:"Aksaray"},{id:"69",name:"Bayburt"},{id:"70",name:"Karaman"},{id:"71",name:"Kırıkkale"},{id:"72",name:"Batman"},{id:"73",name:"Şırnak"},{id:"74",name:"Bartın"},{id:"75",name:"Ardahan"},{id:"76",name:"Iğdır"},{id:"77",name:"Yalova"},{id:"78",name:"Karabük"},{id:"79",name:"Kilis"},{id:"80",name:"Osmaniye"},{id:"81",name:"Düzce"}
];

const PRESET_CRITERIA = [
    { key: 'Sigara Kullanımı', options: ['Kullanmıyorum, istemiyorum', 'Sadece balkonda/dışarıda', 'Farketmez', 'Kullanıyorum'] },
    { key: 'Evcil Hayvan', options: ['Hayır, alerjim var', 'Sadece kedi/kuş vs.', 'Evet, var', 'Farketmez'] },
    { key: 'Cinsiyet Tercihi', options: ['Sadece Kadın', 'Sadece Erkek', 'Farketmez'] },
    { key: 'Misafir Durumu', options: ['Kesinlikle yasak', 'Önceden haber verilmeli', 'Gündüz serbest, yatılı yasak', 'Farketmez'] },
    { key: 'Temizlik', options: ['Çok titizim, nöbetleşe temizlik', 'Ortak alanlar temiz kalmalı', 'Çok takılmam'] },
    { key: 'Kendi Kriterini Ekle', options: [] }
];

const PRESET_ROOMMATE_FEATURES = [
    { key: 'Oda Sayısı', options: ['1+0', '1+1', '2+1', '3+1', '4+1 ve üzeri'] },
    { key: 'Isıtma', options: ['Doğalgaz (Kombi)', 'Merkezi Sistem', 'Klima', 'Soba', 'Elektrikli'] },
    { key: 'Eşya Durumu', options: ['Tam Eşyalı', 'Kısmi Eşyalı', 'Sadece Beyaz Eşya', 'Boş'] },
    { key: 'Bulunduğu Kat', options: ['Bodrum / Yarı Bodrum', 'Zemin Kat', '1-3. Kat', '4-6. Kat', '7+ Kat'] },
    { key: 'Bina Yaşı', options: ['0-5 Yıl', '6-10 Yıl', '11-20 Yıl', '21+ Yıl'] },
    { key: 'Kendi Özelliğini Ekle', options: [] }
];

const PRESET_SECONDHAND_FEATURES = [
    { key: 'Garanti Durumu', options: ['Devam Ediyor', 'Süresi Bitti', 'Yurtdışı/Garantisiz'] },
    { key: 'Kutu ve Fatura', options: ['İkisi de var', 'Sadece Kutu', 'Sadece Fatura', 'İkisi de yok'] },
    { key: 'Kendi Özelliğini Ekle', options: [] }
];

interface DynamicField { id: string; key: string; value: string; isCustom: boolean; }

const LIBRARIES: ("places")[] = ["places"];
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

const CHECK_AUTH = `#graphql
query CheckAuth { getMe { account_type edu_email } }
`;

const GENERATE_SIGNATURE = `#graphql
mutation GenerateSignature($folderName: String!) {
    generateUploadSignature(folderName: $folderName) {
        timestamp
        signature
        cloudName
        apiKey
        folder
    }
}
`;

const CREATE_LISTING = `#graphql
mutation CreateListing($input: CreateListingInput!) {
    createListing(input: $input) { id }
}
`;

export default function CreateListingWizard() {
    const router = useRouter();

    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
        libraries: LIBRARIES
    });

    const defaultMapCenter = { lat: 38.4237, lng: 27.1428 };

    const [generalLocation, setGeneralLocation] = useState<{lat: number, lng: number} | null>(null);
    const [originCoords, setOriginCoords] = useState<{lat: number, lng: number} | null>(null);
    const [destCoords, setDestCoords] = useState<{lat: number, lng: number} | null>(null);
    const [carpoolMarkerType, setCarpoolMarkerType] = useState<'origin' | 'dest'>('origin');
    const [showMap, setShowMap] = useState(false);
    const [autocompleteInfo, setAutocompleteInfo] = useState<google.maps.places.Autocomplete | null>(null);

    const [step, setStep] = useState(1);
    const [selectedCat, setSelectedCat] = useState<string | null>(null);
    const [isVerifiedStudent, setIsVerifiedStudent] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [submitError, setSubmitError] = useState<string | null>(null);

    const [mediaFiles, setMediaFiles] = useState<File[]>([]);
    const [mediaPreviews, setMediaPreviews] = useState<{url: string, type: string}[]>([]);

    const [formData, setFormData] = useState({
        title: '', description: '', price: '',
        origin: '', destination: '', departure_date: '', available_seats: '',
        application_url: '', deadline: '',
        subject: '', format: '', condition: '', secondhandCategory: '', subcategory: '',
        lecture: ''
    });

    const [districts, setDistricts] = useState<string[]>([]);
    const [selectedCityId, setSelectedCityId] = useState('');
    const [city, setCity] = useState('');
    const [district, setDistrict] = useState('');

    const [criteriaList, setCriteriaList] = useState<DynamicField[]>([]);
    const [currentCriterionKey, setCurrentCriterionKey] = useState('');
    const [currentCriterionValue, setCurrentCriterionValue] = useState('');
    const [customCriterionKeyInput, setCustomCriterionKeyInput] = useState('');

    const [featuresList, setFeaturesList] = useState<DynamicField[]>([]);
    const [currentFeatureKey, setCurrentFeatureKey] = useState('');
    const [currentFeatureValue, setCurrentFeatureValue] = useState('');
    const [customFeatureKeyInput, setCustomFeatureKeyInput] = useState('');

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const data = await fetchGraphQL(CHECK_AUTH);
                if (data.getMe) {
                    setIsVerifiedStudent(data.getMe.account_type === 'student' || !!data.getMe.edu_email);
                }
            } catch (error) { console.error("Auth Hata:", error); }
        };
        checkAuth();
    }, []);

    const GET_DISTRICTS = `#graphql
    query GetDistricts($il: String!) {
        getDistricts(il: $il)
    }
`;

    useEffect(() => {
        const fetchDistricts = async () => {
            if (!selectedCityId) return setDistricts([]);
            try {
                // Şehir ID'sini (selectedCityId) kullanarak ilçeleri GraphQL'den çek
                const data = await fetchGraphQL(GET_DISTRICTS, { il: selectedCityId });
                if (data.getDistricts) {
                    setDistricts(data.getDistricts);
                } else {
                    setDistricts([]);
                }
            } catch (error) {
                console.error("İlçeler çekilemedi:", error);
                setDistricts([]);
            }
        };
        fetchDistricts();
    }, [selectedCityId]);

    const onLoadAutocomplete = (autocomplete: google.maps.places.Autocomplete) => {
        setAutocompleteInfo(autocomplete);
    };

    const onPlaceChanged = () => {
        if (autocompleteInfo !== null) {
            const place = autocompleteInfo.getPlace();
            if (place.geometry && place.geometry.location) {
                const newLat = place.geometry.location.lat();
                const newLng = place.geometry.location.lng();

                if (selectedCat === 'carpool') {
                    if (carpoolMarkerType === 'origin') {
                        setOriginCoords({ lat: newLat, lng: newLng });
                        if(place.name) setFormData(prev => ({...prev, origin: place.name || ''}));
                    } else {
                        setDestCoords({ lat: newLat, lng: newLng });
                        if(place.name) setFormData(prev => ({...prev, destination: place.name || ''}));
                    }
                } else {
                    setGeneralLocation({ lat: newLat, lng: newLng });
                }
            }
        }
    };

    const handleAddCriterion = () => {
        let finalKey = currentCriterionKey === 'Kendi Kriterini Ekle' ? customCriterionKeyInput.trim() : currentCriterionKey;
        let finalValue = currentCriterionValue.trim();
        if (!finalKey || !finalValue) return;
        if (criteriaList.some(c => c.key === finalKey)) return alert('Bu kriteri zaten eklediniz.');
        setCriteriaList(prev => [...prev, { id: Date.now().toString(), key: finalKey, value: finalValue, isCustom: currentCriterionKey === 'Kendi Kriterini Ekle' }]);
        setCurrentCriterionKey(''); setCurrentCriterionValue(''); setCustomCriterionKeyInput('');
    };
    const handleRemoveCriterion = (idToRemove: string) => setCriteriaList(prev => prev.filter(c => c.id !== idToRemove));

    const handleAddFeature = () => {
        let finalKey = currentFeatureKey === 'Kendi Özelliğini Ekle' ? customFeatureKeyInput.trim() : currentFeatureKey;
        let finalValue = currentFeatureValue.trim();
        if (!finalKey || !finalValue) return;
        if (featuresList.some(c => c.key === finalKey)) return alert('Bu özelliği zaten eklediniz.');
        setFeaturesList(prev => [...prev, { id: Date.now().toString(), key: finalKey, value: finalValue, isCustom: currentFeatureKey === 'Kendi Özelliğini Ekle' }]);
        setCurrentFeatureKey(''); setCurrentFeatureValue(''); setCustomFeatureKeyInput('');
    };
    const handleRemoveFeature = (idToRemove: string) => setFeaturesList(prev => prev.filter(c => c.id !== idToRemove));

    const isStep2Valid = () => {
        if (!formData.title.trim() || !formData.description.trim()) return false;
        switch (selectedCat) {
            case 'job': return !!(city && district);
            case 'scholarship': return true;
            case 'carpool': return !!(formData.origin && formData.destination && formData.departure_date && formData.available_seats);
            case 'roommate': return !!(city && district);
            case 'tutoring': return !!(formData.subject && formData.format);
            case 'notes': return !!(formData.lecture);
            case 'secondhand': return !!(city && district && formData.condition && formData.secondhandCategory);
            default: return false;
        }
    };

    const isStep3Valid = () => {
        if (selectedCat !== 'job' && selectedCat !== 'scholarship' && formData.price === '') return false;
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
    const handleFormChange = (key: string, value: string) => setFormData(prev => ({ ...prev, [key]: value }));

    const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const fileArray = Array.from(e.target.files).slice(0, 3);
            setMediaFiles(fileArray);
            setMediaPreviews(fileArray.map(file => ({ url: URL.createObjectURL(file), type: file.type.startsWith('video/') ? 'video' : 'image' })));
        }
    };

    const removeMedia = (index: number) => {
        setMediaFiles(prev => prev.filter((_, i) => i !== index));
        setMediaPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const submitListing = async () => {
        setIsSubmitting(true); setSubmitStatus('idle'); setSubmitError(null);
        try {
            // 1. Kategori Düzenleme
            let schemaType = selectedCat;
            if (selectedCat === 'carpool') schemaType = 'carpooling';
            if (selectedCat === 'tutoring' || selectedCat === 'notes') schemaType = 'course';
            if (selectedCat === 'notes') schemaType = 'note';

            // 2. Lokasyon Düzenleme
            let finalLocation = 'Kampüs İçi';
            if (city && district) {
                finalLocation = `${district}, ${city}`;
                if (generalLocation) {
                    finalLocation += ` | Harita: https://maps.google.com/?q=${generalLocation.lat},${generalLocation.lng}`;
                }
            } else if (schemaType === 'carpooling') {
                let o = formData.origin;
                if (originCoords) o += ` (Harita: https://maps.google.com/?q=${originCoords.lat},${originCoords.lng})`;
                let d = formData.destination;
                if (destCoords) d += ` (Harita: https://maps.google.com/?q=${destCoords.lat},${destCoords.lng})`;
                finalLocation = `${formData.origin} -> ${formData.destination}`;
                // Input objesine ayrıca eklenecek
            }

            // 3. Özellikler ve Kriterler
            const featuresObj: any = {};
            featuresList.forEach(f => featuresObj[f.key] = f.value);

            const criteriaObj: any = {};
            criteriaList.forEach(c => criteriaObj[c.key] = c.value);

            // 4. Cloudinary Upload Logic
            const uploadedPhotoUrls: string[] = [];
            if (mediaFiles.length > 0) {
                const sigData = await fetchGraphQL(GENERATE_SIGNATURE, { folderName: 'universe/listings' });
                const { timestamp, signature, cloudName, apiKey, folder } = sigData.generateUploadSignature;

                for (const file of mediaFiles) {
                    const uploadDataForm = new FormData();
                    uploadDataForm.append('file', file);
                    uploadDataForm.append('api_key', apiKey);
                    uploadDataForm.append('timestamp', String(timestamp));
                    uploadDataForm.append('signature', signature);
                    uploadDataForm.append('folder', folder);

                    const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                        method: 'POST',
                        body: uploadDataForm
                    });

                    if (!uploadRes.ok) throw new Error("Fotoğraf yüklenemedi.");
                    const uploadData = await uploadRes.json();
                    uploadedPhotoUrls.push(uploadData.secure_url);
                }
            }

            // 5. GraphQL Input Objesi Hazırlama
            const input: any = {
                type: schemaType,
                title: formData.title,
                description: formData.description,
                price: parseFloat(formData.price || '0'),
                location: finalLocation,
                photos: uploadedPhotoUrls
            };

            if (Object.keys(featuresObj).length > 0) input.features = featuresObj;
            if (Object.keys(criteriaObj).length > 0) input.criteria = criteriaObj;

            if (schemaType === 'secondhand') {
                input.condition = formData.condition;
                input.category = formData.secondhandCategory;
                if (formData.subcategory) input.subcategory = formData.subcategory;
            } else if (schemaType === 'course' || schemaType === 'note') {
                input.subject = formData.subject;
                input.format = formData.format;
                if (schemaType === 'note') {
                    input.lecture = formData.lecture;
                }
            } else if (schemaType === 'job' || schemaType === 'scholarship') {
                if (formData.application_url) input.application_url = formData.application_url;
                if (formData.deadline) input.deadline = new Date(formData.deadline).toISOString();
            } else if (schemaType === 'carpooling') {
                input.origin = formData.origin;
                input.destination = formData.destination;
                input.departure_date = new Date(formData.departure_date).toISOString();
                input.available_seats = parseInt(formData.available_seats, 10);
            }

            // 6. İlanı Oluştur
            await fetchGraphQL(CREATE_LISTING, { input });

            setSubmitStatus('success');
            setTimeout(() => { router.push('/feed'); }, 2000);

        } catch (error: any) {
            setSubmitError(error.message); setSubmitStatus('error');
        } finally { setIsSubmitting(false); }
    };

    const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const targetId = e.target.value; setSelectedCityId(targetId);
        setCity(TURKISH_CITIES.find(c => c.id === targetId)?.name || ''); setDistrict('');
    };

    const renderLocationWithMap = (accentColor: string) => (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className={`text-sm font-medium ${accentColor} ml-1`}>İl <span className="text-rose-500">*</span></label>
                    <select value={selectedCityId} onChange={handleCityChange} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:border-white/30 outline-none text-gray-200 appearance-none">
                        <option value="" className="bg-gray-900">İl Seçiniz...</option>
                        {TURKISH_CITIES.map(c => <option key={c.id} value={c.id} className="bg-gray-900">{c.name}</option>)}
                    </select>
                </div>
                <div className="space-y-2">
                    <label className={`text-sm font-medium ${accentColor} ml-1`}>İlçe <span className="text-rose-500">*</span></label>
                    <select value={district} onChange={(e) => setDistrict(e.target.value)} disabled={!selectedCityId || districts.length === 0} className={`w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:border-white/30 outline-none ${(!selectedCityId || districts.length === 0) ? 'text-gray-600 opacity-50 cursor-not-allowed' : 'text-gray-200'} appearance-none`}>
                        <option value="" className="bg-gray-900">İlçe Seçiniz...</option>
                        {districts.map(dName => <option key={dName} value={dName} className="bg-gray-900">{dName}</option>)}
                    </select>
                </div>
            </div>

            <button type="button" onClick={() => setShowMap(!showMap)} className={`flex items-center gap-2 text-sm font-bold transition-colors ${showMap ? 'text-rose-400' : 'text-blue-400 hover:text-blue-300'}`}>
                <Map size={18} /> {showMap ? 'Haritayı Gizle' : 'Haritada Nokta İşaretle (Opsiyonel)'}
            </button>

            {showMap && (
                <div className="bg-black/40 border border-white/10 rounded-2xl p-4 animate-in fade-in zoom-in-95 duration-300">
                    <p className="text-xs text-gray-400 mb-3">İlanını vereceğin yerin konumunu seç veya arama kutusuna yazarak haritayı oraya kaydır.</p>

                    {isLoaded && (
                        <div className="mb-4 relative">
                            <Autocomplete onLoad={onLoadAutocomplete} onPlaceChanged={onPlaceChanged}>
                                <div className="relative">
                                    <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                                    <input type="text" placeholder="Mekan veya adres ara (Örn: Buca Metro)" className="w-full bg-black/60 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none text-white focus:border-cyan-500/50" />
                                </div>
                            </Autocomplete>
                        </div>
                    )}

                    {isLoaded ? (
                        <div className="rounded-xl overflow-hidden border border-white/10 h-[250px] relative">
                            <GoogleMap mapContainerStyle={{ width: '100%', height: '100%' }} center={generalLocation || defaultMapCenter} zoom={generalLocation ? 15 : 12} onClick={(e) => setGeneralLocation({ lat: e.latLng!.lat(), lng: e.latLng!.lng() })} options={{ mapTypeControl: false, streetViewControl: false, fullscreenControl: false }}>
                                {generalLocation && <Marker position={generalLocation} />}
                            </GoogleMap>
                        </div>
                    ) : (
                        <div className="h-[250px] bg-white/5 animate-pulse rounded-xl flex items-center justify-center text-gray-500 text-sm">Harita Yükleniyor...</div>
                    )}
                </div>
            )}
        </div>
    );

    const activeCatData = categories.find(c => c.id === selectedCat);
    const selectedPresetCriterionObj = PRESET_CRITERIA.find(p => p.key === currentCriterionKey);
    const selectedPresetFeatureObj = (selectedCat === 'roommate' ? PRESET_ROOMMATE_FEATURES : PRESET_SECONDHAND_FEATURES).find(p => p.key === currentFeatureKey);

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
                    <AlertTriangle size={20} className="flex-shrink-0" /><span>{submitError}</span>
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
                                        key={cat.id} disabled={isLocked} onClick={() => setSelectedCat(cat.id)}
                                        className={`relative flex flex-col items-start p-5 rounded-2xl border transition-all duration-300 text-left group ${isLocked ? 'bg-black/20 border-white/5 opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${isSelected ? `bg-white/5 ${cat.border} shadow-[0_0_20px_rgba(255,255,255,0.05)] translate-y-[-4px]` : `bg-black/40 border-white/5 ${cat.bg}`}`}
                                    >
                                        <div className={`p-4 rounded-full bg-black/50 ${isLocked ? 'text-gray-600' : cat.color} mb-4`}>
                                            {isLocked ? <Lock size={24} /> : <cat.icon size={24} />}
                                        </div>
                                        <div>
                                            <h3 className={`text-base font-extrabold ${isLocked ? 'text-gray-500' : 'text-gray-200'}`}>{cat.title}</h3>
                                            <p className="text-[11px] text-gray-500 mt-1">{isLocked ? 'Sadece onaylı öğrenciler' : cat.id === 'emergency' ? 'Acil yardım çağrısı' : 'Seç'}</p>
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

                        {(selectedCat === 'job' || selectedCat === 'scholarship') && (
                            <div className={`space-y-4 animate-in zoom-in-95 duration-300 border-l-2 pl-4 ${selectedCat === 'job' ? 'border-blue-500' : 'border-yellow-500'}`}>
                                {selectedCat === 'job' && renderLocationWithMap('text-blue-400')}
                                <div className="grid grid-cols-2 gap-4 mt-4">
                                    <div className="space-y-2">
                                        <label className={`text-sm font-medium ml-1 ${selectedCat === 'job' ? 'text-blue-400' : 'text-yellow-400'}`}>Başvuru Linki (Opsiyonel)</label>
                                        <div className="relative">
                                            <LinkIcon className="absolute left-4 top-3.5 text-gray-600" size={18} />
                                            <input type="url" value={formData.application_url} onChange={(e) => handleFormChange('application_url', e.target.value)} placeholder="https://" className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 outline-none text-gray-200" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className={`text-sm font-medium ml-1 ${selectedCat === 'job' ? 'text-blue-400' : 'text-yellow-400'}`}>Son Başvuru Tarihi</label>
                                        <input type="date" value={formData.deadline} onChange={(e) => handleFormChange('deadline', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 outline-none text-gray-400 [color-scheme:dark]" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {selectedCat === 'carpool' && (
                            <div className="space-y-6 border-l-2 border-emerald-500 pl-4 animate-in zoom-in-95 duration-300">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-emerald-400 ml-1">Nereden <span className="text-rose-500">*</span></label>
                                        <input type="text" value={formData.origin} onChange={(e) => handleFormChange('origin', e.target.value)} placeholder="Örn: Buca Metro" className="w-full bg-emerald-500/5 border border-emerald-500/20 rounded-xl py-3 px-4 outline-none text-gray-200" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-emerald-400 ml-1">Nereye <span className="text-rose-500">*</span></label>
                                        <input type="text" value={formData.destination} onChange={(e) => handleFormChange('destination', e.target.value)} placeholder="Örn: Ege Üniversitesi" className="w-full bg-emerald-500/5 border border-emerald-500/20 rounded-xl py-3 px-4 outline-none text-gray-200" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-emerald-400 ml-1">Kalkış Zamanı <span className="text-rose-500">*</span></label>
                                        <input type="datetime-local" value={formData.departure_date} onChange={(e) => handleFormChange('departure_date', e.target.value)} className="w-full bg-emerald-500/5 border border-emerald-500/20 rounded-xl py-3 px-4 outline-none text-gray-400 [color-scheme:dark]" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-emerald-400 ml-1">Boş Koltuk <span className="text-rose-500">*</span></label>
                                        <input type="number" min="1" max="8" value={formData.available_seats} onChange={(e) => handleFormChange('available_seats', e.target.value)} placeholder="Örn: 2" className="w-full bg-emerald-500/5 border border-emerald-500/20 rounded-xl py-3 px-4 outline-none text-gray-200" />
                                    </div>
                                </div>

                                <div className="bg-black/40 border border-emerald-500/20 rounded-2xl p-4 mt-2">
                                    <label className="text-sm font-bold text-emerald-400 mb-3 flex items-center gap-2"><MapPin size={16}/> Rotayı Haritada İşaretle (Opsiyonel)</label>

                                    <div className="flex gap-2 mb-4">
                                        <button type="button" onClick={() => setCarpoolMarkerType('origin')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${carpoolMarkerType === 'origin' ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>1. Kalkış Noktası {originCoords && '✓'}</button>
                                        <button type="button" onClick={() => setCarpoolMarkerType('dest')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${carpoolMarkerType === 'dest' ? 'bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>2. Varış Noktası {destCoords && '✓'}</button>
                                    </div>

                                    {isLoaded && (
                                        <div className="mb-4">
                                            <Autocomplete onLoad={onLoadAutocomplete} onPlaceChanged={onPlaceChanged}>
                                                <div className="relative">
                                                    <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                                                    <input type="text" placeholder={carpoolMarkerType === 'origin' ? "Kalkış noktasını ara (Örn: Buca)" : "Varış noktasını ara (Örn: Bornova)"} className="w-full bg-black/60 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none text-white focus:border-emerald-500/50" />
                                                </div>
                                            </Autocomplete>
                                        </div>
                                    )}

                                    {isLoaded ? (
                                        <div className="rounded-xl overflow-hidden border border-white/10 h-[250px] relative">
                                            <div className="absolute top-2 left-2 z-10 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-xs text-white font-medium">
                                                Şu an {carpoolMarkerType === 'origin' ? <span className="text-emerald-400 font-bold">Kalkış</span> : <span className="text-blue-400 font-bold">Varış</span>} noktasını seçiyorsunuz.
                                            </div>
                                            <GoogleMap mapContainerStyle={{ width: '100%', height: '100%' }} center={carpoolMarkerType === 'origin' && originCoords ? originCoords : carpoolMarkerType === 'dest' && destCoords ? destCoords : defaultMapCenter} zoom={originCoords || destCoords ? 15 : 12} onClick={(e) => { if (carpoolMarkerType === 'origin') setOriginCoords({ lat: e.latLng!.lat(), lng: e.latLng!.lng() }); else setDestCoords({ lat: e.latLng!.lat(), lng: e.latLng!.lng() }); }} options={{ mapTypeControl: false, streetViewControl: false, fullscreenControl: false }}>
                                                {originCoords && <Marker position={originCoords} label={{text: "A", color: "white", fontWeight: "bold"}} />}
                                                {destCoords && <Marker position={destCoords} label={{text: "B", color: "white", fontWeight: "bold"}} />}
                                            </GoogleMap>
                                        </div>
                                    ) : (
                                        <div className="h-[250px] bg-white/5 animate-pulse rounded-xl flex items-center justify-center text-gray-500 text-sm">Harita Yükleniyor...</div>
                                    )}
                                </div>
                            </div>
                        )}

                        {selectedCat === 'roommate' && (
                            <div className="space-y-6 animate-in zoom-in-95 duration-300 border-l-2 border-teal-500 pl-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-teal-400 ml-1">Evin Konumu <span className="text-rose-500">*</span></label>
                                    {renderLocationWithMap('text-teal-400')}
                                </div>

                                <div className="pt-4 border-t border-white/10 space-y-4">
                                    <div>
                                        <h4 className="text-sm font-bold text-teal-400 mb-1 flex items-center gap-2"><Tag size={16}/> Evin Fiziksel Özellikleri</h4>
                                        <p className="text-xs text-gray-500 mb-4">Oda sayısı, bulunduğu kat, bina yaşı veya metrekare gibi özellikleri ekle.</p>
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-3 items-end bg-white/5 p-4 rounded-xl border border-white/10">
                                        <div className="w-full sm:w-1/3 space-y-1">
                                            <label className="text-xs text-gray-400">Özellik Seç <span className="text-rose-500">*</span></label>
                                            <select value={currentFeatureKey} onChange={(e) => { setCurrentFeatureKey(e.target.value); setCurrentFeatureValue(''); }} className="w-full bg-black/40 border border-white/10 rounded-lg py-2.5 px-3 text-sm focus:border-teal-500/50 outline-none text-gray-200 appearance-none">
                                                <option value="" className="bg-gray-900">Özellik Seç...</option>
                                                {PRESET_ROOMMATE_FEATURES.map(c => <option key={c.key} value={c.key} className="bg-gray-900">{c.key}</option>)}
                                            </select>
                                        </div>
                                        <div className="w-full sm:flex-1 space-y-1">
                                            {currentFeatureKey === 'Kendi Özelliğini Ekle' ? (
                                                <div className="flex gap-2">
                                                    <div className="w-1/2">
                                                        <label className="text-xs text-gray-400">Özellik Adı <span className="text-rose-500">*</span></label>
                                                        <input type="text" value={customFeatureKeyInput} onChange={(e) => setCustomFeatureKeyInput(e.target.value)} placeholder="Örn: Metrekare" className="w-full bg-black/40 border border-white/10 rounded-lg py-2.5 px-3 text-sm focus:border-teal-500/50 outline-none text-gray-200" />
                                                    </div>
                                                    <div className="w-1/2">
                                                        <label className="text-xs text-gray-400">Değeri <span className="text-rose-500">*</span></label>
                                                        <input type="text" value={currentFeatureValue} onChange={(e) => setCurrentFeatureValue(e.target.value)} placeholder="Örn: 120m2" className="w-full bg-black/40 border border-white/10 rounded-lg py-2.5 px-3 text-sm focus:border-teal-500/50 outline-none text-gray-200" />
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <label className="text-xs text-gray-400">Seçim / Durum <span className="text-rose-500">*</span></label>
                                                    {selectedPresetFeatureObj?.options.length ? (
                                                        <select value={currentFeatureValue} onChange={(e) => setCurrentFeatureValue(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg py-2.5 px-3 text-sm focus:border-teal-500/50 outline-none text-gray-200 appearance-none">
                                                            <option value="" className="bg-gray-900">Seçenek belirle...</option>
                                                            {selectedPresetFeatureObj.options.map(opt => <option key={opt} value={opt} className="bg-gray-900">{opt}</option>)}
                                                        </select>
                                                    ) : (
                                                        <input type="text" value={currentFeatureValue} onChange={(e) => setCurrentFeatureValue(e.target.value)} placeholder="Durumu belirt..." disabled={!currentFeatureKey} className="w-full bg-black/40 border border-white/10 rounded-lg py-2.5 px-3 text-sm focus:border-teal-500/50 outline-none text-gray-200 disabled:opacity-50" />
                                                    )}
                                                </>
                                            )}
                                        </div>
                                        <button onClick={handleAddFeature} disabled={!currentFeatureKey || (currentFeatureKey === 'Kendi Özelliğini Ekle' && (!customFeatureKeyInput || !currentFeatureValue)) || (currentFeatureKey !== 'Kendi Özelliğini Ekle' && !currentFeatureValue)} className="px-4 py-2.5 bg-teal-500 hover:bg-teal-400 disabled:bg-gray-700 disabled:text-gray-500 text-black font-bold rounded-lg text-sm transition-colors flex-shrink-0">Ekle</button>
                                    </div>
                                    {featuresList.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-4">
                                            {featuresList.map(c => (
                                                <div key={c.id} className="flex items-center gap-2 bg-teal-500/10 border border-teal-500/20 px-3 py-1.5 rounded-lg">
                                                    <div>
                                                        <span className="text-[10px] text-teal-400 uppercase font-bold block leading-none">{c.key}</span>
                                                        <span className="text-sm text-gray-200 block leading-tight">{c.value}</span>
                                                    </div>
                                                    <button onClick={() => handleRemoveFeature(c.id)} className="ml-2 text-gray-500 hover:text-rose-400 p-0.5 rounded-md hover:bg-rose-400/10 transition-colors"><X size={14}/></button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="pt-4 border-t border-white/10 space-y-4">
                                    <div>
                                        <h4 className="text-sm font-bold text-teal-400 mb-1 flex items-center gap-2"><ListPlus size={16}/> Ev Arkadaşı Kriterleri</h4>
                                        <p className="text-xs text-gray-500 mb-4">Aradığın ev arkadaşı için sigara, misafir veya evcil hayvan gibi beklentilerini ekle.</p>
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-3 items-end bg-white/5 p-4 rounded-xl border border-white/10">
                                        <div className="w-full sm:w-1/3 space-y-1">
                                            <label className="text-xs text-gray-400">Kriter Seç <span className="text-rose-500">*</span></label>
                                            <select value={currentCriterionKey} onChange={(e) => { setCurrentCriterionKey(e.target.value); setCurrentCriterionValue(''); }} className="w-full bg-black/40 border border-white/10 rounded-lg py-2.5 px-3 text-sm focus:border-teal-500/50 outline-none text-gray-200 appearance-none">
                                                <option value="" className="bg-gray-900">Kriter Seç...</option>
                                                {PRESET_CRITERIA.map(c => <option key={c.key} value={c.key} className="bg-gray-900">{c.key}</option>)}
                                            </select>
                                        </div>
                                        <div className="w-full sm:flex-1 space-y-1">
                                            {currentCriterionKey === 'Kendi Kriterini Ekle' ? (
                                                <div className="flex gap-2">
                                                    <div className="w-1/2">
                                                        <label className="text-xs text-gray-400">Kriter Adı <span className="text-rose-500">*</span></label>
                                                        <input type="text" value={customCriterionKeyInput} onChange={(e) => setCustomCriterionKeyInput(e.target.value)} placeholder="Örn: Ev Temizliği" className="w-full bg-black/40 border border-white/10 rounded-lg py-2.5 px-3 text-sm focus:border-teal-500/50 outline-none text-gray-200" />
                                                    </div>
                                                    <div className="w-1/2">
                                                        <label className="text-xs text-gray-400">Beklenti / Durum <span className="text-rose-500">*</span></label>
                                                        <input type="text" value={currentCriterionValue} onChange={(e) => setCurrentCriterionValue(e.target.value)} placeholder="Örn: Ortak yapılacak" className="w-full bg-black/40 border border-white/10 rounded-lg py-2.5 px-3 text-sm focus:border-teal-500/50 outline-none text-gray-200" />
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <label className="text-xs text-gray-400">Beklenti / Durum <span className="text-rose-500">*</span></label>
                                                    {selectedPresetCriterionObj?.options.length ? (
                                                        <select value={currentCriterionValue} onChange={(e) => setCurrentCriterionValue(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg py-2.5 px-3 text-sm focus:border-teal-500/50 outline-none text-gray-200 appearance-none">
                                                            <option value="" className="bg-gray-900">Seçenek belirle...</option>
                                                            {selectedPresetCriterionObj.options.map(opt => <option key={opt} value={opt} className="bg-gray-900">{opt}</option>)}
                                                        </select>
                                                    ) : (
                                                        <input type="text" value={currentCriterionValue} onChange={(e) => setCurrentCriterionValue(e.target.value)} placeholder="Durumu belirt..." disabled={!currentCriterionKey} className="w-full bg-black/40 border border-white/10 rounded-lg py-2.5 px-3 text-sm focus:border-teal-500/50 outline-none text-gray-200 disabled:opacity-50" />
                                                    )}
                                                </>
                                            )}
                                        </div>
                                        <button onClick={handleAddCriterion} disabled={!currentCriterionKey || (currentCriterionKey === 'Kendi Kriterini Ekle' && (!customCriterionKeyInput || !currentCriterionValue)) || (currentCriterionKey !== 'Kendi Kriterini Ekle' && !currentCriterionValue)} className="px-4 py-2.5 bg-teal-500 hover:bg-teal-400 disabled:bg-gray-700 disabled:text-gray-500 text-black font-bold rounded-lg text-sm transition-colors flex-shrink-0">Ekle</button>
                                    </div>
                                    {criteriaList.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-4">
                                            {criteriaList.map(c => (
                                                <div key={c.id} className="flex items-center gap-2 bg-teal-500/10 border border-teal-500/20 px-3 py-1.5 rounded-lg">
                                                    <div>
                                                        <span className="text-[10px] text-teal-400 uppercase font-bold block leading-none">{c.key}</span>
                                                        <span className="text-sm text-gray-200 block leading-tight">{c.value}</span>
                                                    </div>
                                                    <button onClick={() => handleRemoveCriterion(c.id)} className="ml-2 text-gray-500 hover:text-rose-400 p-0.5 rounded-md hover:bg-rose-400/10 transition-colors"><X size={14}/></button>
                                                </div>
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
                                    <input type="text" value={formData.subject} onChange={(e) => handleFormChange('subject', e.target.value)} placeholder="Örn: Python Programlama" className="w-full bg-indigo-500/5 border border-indigo-500/20 rounded-xl py-3 px-4 outline-none text-gray-200" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-indigo-400 ml-1">Format <span className="text-rose-500">*</span></label>
                                    <select value={formData.format} onChange={(e) => handleFormChange('format', e.target.value)} className="w-full bg-indigo-500/5 border border-indigo-500/20 rounded-xl py-3 px-4 outline-none text-gray-200 appearance-none">
                                        <option value="" className="bg-gray-900">Seçiniz...</option>
                                        <option value="online" className="bg-gray-900">Online</option>
                                        <option value="in_person" className="bg-gray-900">Yüz Yüze</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {(selectedCat === 'notes' || selectedCat === 'secondhand') && (
                            <div className="space-y-6 animate-in zoom-in-95 duration-300 border-l-2 border-violet-500 pl-4">
                                {selectedCat === 'secondhand' && (
                                    <>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-violet-400 ml-1">Kategori <span className="text-rose-500">*</span></label>
                                            <select value={formData.secondhandCategory} onChange={(e) => handleFormChange('secondhandCategory', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 outline-none text-gray-200 appearance-none">
                                                <option value="" className="bg-gray-900">Kategori Seçiniz...</option>
                                                <option value="electronics" className="bg-gray-900">Elektronik</option>
                                                <option value="dorm_and_housing" className="bg-gray-900">Yurt ve Ev Eşyası</option>
                                                <option value="kitchenware" className="bg-gray-900">Mutfak Eşyası</option>
                                                <option value="department_materials" className="bg-gray-900">Bölüm/Bölüm Materyalleri</option>
                                                <option value="clothing" className="bg-gray-900">Giyim</option>
                                                <option value="other" className="bg-gray-900">Diğer</option>
                                            </select>
                                        </div>
                                        {renderLocationWithMap('text-violet-400')}
                                    </>
                                )}

                                {selectedCat === 'notes' && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-violet-400 ml-1">Ders Kodu / Adı <span className="text-rose-500">*</span></label>
                                        <input type="text" value={formData.lecture} onChange={(e) => handleFormChange('lecture', e.target.value)} placeholder="Örn: MAT101" className="w-full bg-violet-500/5 border border-violet-500/20 rounded-xl py-3 px-4 outline-none text-gray-200 uppercase" />
                                    </div>
                                )}



                                {selectedCat === 'secondhand' && (
                                    <div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-violet-400 ml-1">Kullanım Durumu <span className="text-rose-500">*</span></label>
                                        <select value={formData.condition} onChange={(e) => handleFormChange('condition', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 outline-none text-gray-200 appearance-none">
                                            <option value="" className="bg-gray-900">Seçiniz...</option>
                                            <option value="new" className="bg-gray-900">Sıfır</option>
                                            <option value="like_new" className="bg-gray-900">Yeni Gibi (Az Kullanılmış)</option>
                                            <option value="good" className="bg-gray-900">İyi Durumda</option>
                                            <option value="fair" className="bg-gray-900">Hasarlı / Eski</option>
                                        </select>
                                    </div>

                                    <div className="pt-4 border-t border-white/10 space-y-4">
                                        <div>
                                            <h4 className="text-sm font-bold text-violet-400 mb-1 flex items-center gap-2"><Tag size={16}/> Ürün Özellikleri</h4>
                                            <p className="text-xs text-gray-500 mb-4">Ürünün markası, modeli, garanti durumu gibi ek özellikleri ekle.</p>
                                        </div>
                                        <div className="flex flex-col sm:flex-row gap-3 items-end bg-white/5 p-4 rounded-xl border border-white/10">
                                            <div className="w-full sm:w-1/3 space-y-1">
                                                <label className="text-xs text-gray-400">Özellik Seç <span className="text-rose-500">*</span></label>
                                                <select value={currentFeatureKey} onChange={(e) => { setCurrentFeatureKey(e.target.value); setCurrentFeatureValue(''); }} className="w-full bg-black/40 border border-white/10 rounded-lg py-2.5 px-3 text-sm focus:border-violet-500/50 outline-none text-gray-200 appearance-none">
                                                    <option value="" className="bg-gray-900">Özellik Seç...</option>
                                                    {PRESET_SECONDHAND_FEATURES.map(c => <option key={c.key} value={c.key} className="bg-gray-900">{c.key}</option>)}
                                                </select>
                                            </div>
                                            <div className="w-full sm:flex-1 space-y-1">
                                                {currentFeatureKey === 'Kendi Özelliğini Ekle' ? (
                                                    <div className="flex gap-2">
                                                        <div className="w-1/2">
                                                            <label className="text-xs text-gray-400">Özellik Adı <span className="text-rose-500">*</span></label>
                                                            <input type="text" value={customFeatureKeyInput} onChange={(e) => setCustomFeatureKeyInput(e.target.value)} placeholder="Örn: Marka" className="w-full bg-black/40 border border-white/10 rounded-lg py-2.5 px-3 text-sm focus:border-violet-500/50 outline-none text-gray-200" />
                                                        </div>
                                                        <div className="w-1/2">
                                                            <label className="text-xs text-gray-400">Değeri <span className="text-rose-500">*</span></label>
                                                            <input type="text" value={currentFeatureValue} onChange={(e) => setCurrentFeatureValue(e.target.value)} placeholder="Örn: Apple" className="w-full bg-black/40 border border-white/10 rounded-lg py-2.5 px-3 text-sm focus:border-violet-500/50 outline-none text-gray-200" />
                                                        </div>
                                                    </div>

                                                ) : (
                                                    <>
                                                        <label className="text-xs text-gray-400">Seçim / Durum <span className="text-rose-500">*</span></label>
                                                        {selectedPresetFeatureObj?.options.length ? (
                                                            <select value={currentFeatureValue} onChange={(e) => setCurrentFeatureValue(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg py-2.5 px-3 text-sm focus:border-violet-500/50 outline-none text-gray-200 appearance-none">
                                                                <option value="" className="bg-gray-900">Seçenek belirle...</option>
                                                                {selectedPresetFeatureObj.options.map(opt => <option key={opt} value={opt} className="bg-gray-900">{opt}</option>)}
                                                            </select>
                                                        ) : (
                                                            <input type="text" value={currentFeatureValue} onChange={(e) => setCurrentFeatureValue(e.target.value)} placeholder="Durumu belirt..." disabled={!currentFeatureKey} className="w-full bg-black/40 border border-white/10 rounded-lg py-2.5 px-3 text-sm focus:border-violet-500/50 outline-none text-gray-200 disabled:opacity-50" />
                                                        )}
                                                    </>

                                                )}
                                            </div>
                                        </div>
                                            <button onClick={handleAddFeature} disabled={!currentFeatureKey || (currentFeatureKey === 'Kendi Özelliğini Ekle' && (!customFeatureKeyInput || !currentFeatureValue)) || (currentFeatureKey !== 'Kendi Özelliğini Ekle' && !currentFeatureValue)} className="px-4 py-2.5 bg-violet-500 hover:bg-violet-400 disabled:bg-gray-700 disabled:text-gray-500 text-black font-bold rounded-lg text-sm transition-colors flex-shrink-0">Ekle</button>
                                        </div>
                                        {featuresList.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mt-4">
                                                {featuresList.map(c => (
                                                    <div key={c.id} className="flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 px-3 py-1.5 rounded-lg">
                                                        <div>
                                                            <span className="text-[10px] text-violet-400 uppercase font-bold block leading-none">{c.key}</span>
                                                            <span className="text-sm text-gray-200 block leading-tight">{c.value}</span>
                                                        </div>
                                                        <button onClick={() => handleRemoveFeature(c.id)} className="ml-2 text-gray-500 hover:text-rose-400 p-0.5 rounded-md hover:bg-rose-400/10 transition-colors"><X size={14}/></button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
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
                            <input type="file" multiple accept="image/*, video/*" className="hidden" onChange={handleMediaUpload} />
                            <div className="p-4 rounded-full bg-white/5 group-hover:bg-cyan-500/20 text-gray-500 group-hover:text-cyan-400 transition-all mb-4"><ImagePlus size={32} /></div>
                            <p className="text-white font-bold">Fotoğraf Yükle</p>
                            <p className="text-sm text-gray-500 mt-2">Maksimum 3 adet medya (PNG, JPG)</p>
                        </label>

                        {mediaPreviews.length > 0 && (
                            <div className="flex gap-4">
                                {mediaPreviews.map((preview, idx) => (
                                    <div key={idx} className="relative w-24 h-24 rounded-xl overflow-hidden border border-white/20 bg-black/50 flex items-center justify-center">
                                        <img src={preview.url} alt="preview" className="w-full h-full object-cover" />
                                        <button type="button" onClick={(e) => { e.preventDefault(); removeMedia(idx); }} className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full hover:bg-rose-500 transition-colors"><X size={14} /></button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400 ml-1">Fiyat (₺) <span className="text-rose-500">*</span></label>
                            <div className="relative">
                                <TurkishLira className="absolute left-4 top-3.5 text-gray-600" size={20} />
                                <input type="number" value={formData.price} onChange={(e) => handleFormChange('price', e.target.value)} placeholder="0" className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 outline-none text-gray-200" />
                            </div>
                            <p className="text-[10px] text-gray-500 ml-1">Ücretsiz ise 0 yazabilirsiniz.</p>
                        </div>
                    </div>
                )}

                {step === 4 && activeCatData && (
                    <div className="animate-in fade-in slide-in-from-right-8 duration-500 space-y-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2"><Eye className="text-cyan-400" /> İlan Önizlemesi</h2>
                            <span className="text-sm text-gray-500">İlanınız akışta tam olarak böyle görünecek.</span>
                        </div>

                        <div className="max-w-sm mx-auto bg-white/5 backdrop-blur-md border border-white/10 hover:border-cyan-500/30 rounded-2xl overflow-hidden transition-all shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex flex-col relative group">
                            <div className="w-full h-56 bg-black/40 relative overflow-hidden flex items-center justify-center border-b border-white/5">
                                {mediaPreviews.length > 0 ? (
                                    <img src={mediaPreviews[0].url} alt="Preview" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-white/20">
                                        <ImagePlus size={48} strokeWidth={1} />
                                        <span className="text-xs mt-2 uppercase tracking-widest">Görsel Yok</span>
                                    </div>
                                )}
                                <div className="absolute top-3 left-3 z-10">
                                    <span className={`px-3 py-1.5 ${activeCatData.previewPillBg} backdrop-blur-md border ${activeCatData.previewBorder} rounded-lg text-[10px] font-black uppercase tracking-wider ${activeCatData.previewText} shadow-xl flex items-center gap-1.5`}>
                                        <activeCatData.icon size={12} />
                                        {activeCatData.title}
                                    </span>
                                </div>
                            </div>

                            <div className="p-5 flex-1 flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-start mb-3">
                                        <h2 className="text-lg font-bold text-gray-100 leading-tight line-clamp-2 group-hover:text-cyan-300 transition-colors">
                                            {formData.title || "İlan Başlığı Belirtilmedi"}
                                        </h2>
                                    </div>
                                    <h3 className="text-2xl font-black text-emerald-400 mb-4">
                                        {formData.price && formData.price !== '0' ? `${Number(formData.price).toLocaleString('tr-TR')} ₺` : 'Ücretsiz'}
                                    </h3>

                                    <div className="bg-black/30 rounded-xl p-3 mb-4 space-y-2 border border-white/5">
                                        {selectedCat === 'carpool' && (
                                            <>
                                                <div className="flex justify-between text-xs"><span className="text-gray-500">Güzergah:</span> <span className="text-emerald-400 font-bold">{formData.origin || '?'} {"->"} {formData.destination || '?'}</span></div>
                                                <div className="flex justify-between text-xs"><span className="text-gray-500">Tarih:</span> <span className="text-gray-300">{formData.departure_date ? new Date(formData.departure_date).toLocaleString('tr-TR', {month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'}) : '-'}</span></div>
                                                <div className="flex justify-between text-xs"><span className="text-gray-500">Boş Koltuk:</span> <span className="text-gray-300">{formData.available_seats || '-'}</span></div>
                                            </>
                                        )}
                                        {(selectedCat === 'job' || selectedCat === 'scholarship') && (
                                            <>
                                                <div className="flex justify-between text-xs"><span className="text-gray-500">Son Başvuru:</span> <span className="text-gray-300">{formData.deadline ? new Date(formData.deadline).toLocaleDateString('tr-TR') : 'Belirtilmedi'}</span></div>
                                                <div className="flex justify-between text-xs"><span className="text-gray-500">Bağlantı:</span> <span className="text-blue-400">{formData.application_url ? 'Mevcut' : 'Yok'}</span></div>
                                            </>
                                        )}
                                        {selectedCat === 'secondhand' && (
                                            <div className="flex justify-between text-xs"><span className="text-gray-500">Durum:</span> <span className="text-gray-300">{formData.condition === 'new' ? 'Sıfır' : formData.condition === 'like_new' ? 'Yeni Gibi' : formData.condition === 'good' ? 'İyi Durumda' : formData.condition === 'fair' ? 'Eski/Hasarlı' : '-'}</span></div>
                                        )}
                                        {selectedCat === 'notes' && (
                                            <div className="flex justify-between text-xs"><span className="text-gray-500">Ders Kodu:</span> <span className="text-violet-400 font-bold uppercase">{formData.lecture || '-'}</span></div>
                                        )}
                                        {selectedCat === 'tutoring' && (
                                            <>
                                                <div className="flex justify-between text-xs"><span className="text-gray-500">Konu:</span> <span className="text-indigo-400 font-bold">{formData.subject || '-'}</span></div>
                                                <div className="flex justify-between text-xs"><span className="text-gray-500">Format:</span> <span className="text-gray-300">{formData.format === 'online' ? 'Online' : formData.format === 'in_person' ? 'Yüz Yüze' : '-'}</span></div>
                                            </>
                                        )}
                                        {selectedCat === 'roommate' && (
                                            <div className="text-xs text-gray-400 flex items-center gap-1">
                                                <ListPlus size={12}/> <span className="text-teal-400 font-bold">{criteriaList.length}</span> Kriter, <span className="text-teal-400 font-bold">{featuresList.length}</span> Özellik eklendi.
                                            </div>
                                        )}
                                        {(!['carpool', 'job', 'scholarship', 'secondhand', 'notes', 'tutoring', 'roommate'].includes(selectedCat || '')) && (
                                            <p className="text-xs text-gray-400 line-clamp-2">{formData.description || "İlan açıklaması..."}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-white/5 flex flex-col space-y-2">
                                    <div className="flex items-center text-gray-400 text-xs">
                                        <MapPin size={14} className={`mr-1.5 ${activeCatData.previewText}`} />
                                        <span className="truncate">
                                            {selectedCat === 'carpool'
                                                ? `${formData.origin || '?'} -> ${formData.destination || '?'}`
                                                : (city && district ? `${district}, ${city}` : 'Konum Belirtilmemiş')}
                                        </span>
                                    </div>
                                    <div className="flex items-center text-gray-500 text-xs">
                                        <Clock size={14} className="mr-1.5" />
                                        <span>Şimdi (Önizleme)</span>
                                    </div>
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
                    onClick={() => {
                        if (step === 1 && selectedCat === 'emergency') router.push('/create-emergency');
                        else if (step === 4) submitListing();
                        else nextStep();
                    }}
                    disabled={isNextDisabled() || isSubmitting}
                    className={`flex items-center space-x-2 px-8 py-3 rounded-full font-black text-[#0B0F19] transition-all duration-300 ${
                        isNextDisabled() || isSubmitting ? 'bg-gray-700 cursor-not-allowed opacity-50' : submitStatus === 'success' ? 'bg-emerald-500' : 'bg-cyan-500 hover:bg-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)]'}`}
                >
                    <span>{isSubmitting ? 'Yayınlanıyor...' : submitStatus === 'success' ? 'Başarıyla Yayınlandı!' : step === 3 ? 'Önizlemeyi Gör' : step === 4 ? 'YAYINLA' : 'Devam Et'}</span>
                    {step !== 4 && <ArrowRight size={20} />}
                </button>
            </div>
        </div>
    );
}