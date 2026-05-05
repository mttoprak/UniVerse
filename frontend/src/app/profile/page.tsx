"use client";

import { useState, useEffect } from 'react';
import { Package, Heart, Settings, Trash2, Edit3, ExternalLink, User, MapPin, Calendar, AlertTriangle, X, CheckCircle, Star, Mail, Phone, GraduationCap, Shield } from 'lucide-react';

// mock user data
const MOCK_USER = {
    _id: "user_123",
    username: "ahmetemin",
    email: "ahmet@gmail.com",
    edu_email: "deneme@ogr.university.edu.tr",
    name: "Ahmet Emin",
    surname: "GENÇ",
    birthdate: "2002-05-15",
    telephone: "+90 555 123 4567",
    profile_photo: "",
    account_type: "student",
    auth_provider: "local",
    university: "Ege Üniversitesi",
    rating_sum: 42,
    rating_count: 9,
    createdAt: "2026-01-15T10:00:00Z"
};

const INITIAL_ADVERTS = [
    { id: '1', title: 'Temiz Kullanılmış Algoritma Kitabı', price: '250', category: 'Ders Notu/Kitap', date: '2026-05-01', status: 'Aktif' },
    { id: '2', title: '2. El Oyuncu Monitörü 144Hz', price: '3500', category: 'Elektronik', date: '2026-04-28', status: 'Aktif' },
];

const MOCK_FAVORITES = [
    { id: '3', title: 'Bahar Şenliği Biletleri (2 Adet)', price: '500', category: 'Etkinlik', date: '2026-05-05', author: 'Ceren K.' },
];

export default function ProfilePage() {
    const [activeTab, setActiveTab] = useState<'adverts' | 'favorites' | 'settings'>('settings'); // Test için varsayılan Settings yapıldı
    const [myAdverts, setMyAdverts] = useState(INITIAL_ADVERTS);
    const [userData, setUserData] = useState(MOCK_USER); // Form verilerini tutacak state

    // modal and notification states
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [itemToEdit, setItemToEdit] = useState<any>(null);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    useEffect(() => {
        if (toastMessage) {
            const timer = setTimeout(() => setToastMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toastMessage]);

    const confirmDelete = (id: string) => { setItemToDelete(id); setDeleteModalOpen(true); };
    const executeDelete = () => {
        if (itemToDelete) {
            setMyAdverts(prev => prev.filter(ad => ad.id !== itemToDelete));
            setToastMessage('İlan başarıyla silindi.');
            setDeleteModalOpen(false);
            setItemToDelete(null);
        }
    };

    const openEditModal = (advert: any) => { setItemToEdit(advert); setEditModalOpen(true); };
    const saveEdit = () => {
        setToastMessage('İlan değişiklikleri kaydedildi.');
        setEditModalOpen(false);
        setItemToEdit(null);
    };

    const handleProfileUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        // TODO: backend PUT request
        setToastMessage('Profil bilgileriniz güncellendi.');
    };

    const userRating = userData.rating_count > 0 ? (userData.rating_sum / userData.rating_count).toFixed(1) : "0.0";
    const joinYear = new Date(userData.createdAt).getFullYear();

    return (
        <div className="min-h-screen pt-24 pb-12 px-4 md:px-8 max-w-6xl mx-auto flex flex-col relative text-gray-100">

            {/* toast notification */}
            {toastMessage && (
                <div className="fixed bottom-6 right-6 z-[9999] animate-in slide-in-from-bottom-5 fade-in duration-300 flex items-center gap-3 bg-cyan-900/90 border border-cyan-500/50 backdrop-blur-md px-5 py-3 rounded-2xl shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                    <CheckCircle className="text-cyan-400" size={20} />
                    <span className="font-semibold text-white">{toastMessage}</span>
                </div>
            )}

            {/* delete and update modals */}
            {deleteModalOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#0B0F19] border border-rose-500/30 rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-center mb-4"><div className="p-4 bg-rose-500/10 rounded-full border border-rose-500/20"><AlertTriangle size={32} className="text-rose-500" /></div></div>
                        <h3 className="text-xl font-bold text-white text-center mb-2">İlanı Sil</h3>
                        <p className="text-gray-400 text-center text-sm mb-6">Bu ilanı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteModalOpen(false)} className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-white font-medium">İptal</button>
                            <button onClick={executeDelete} className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 transition-colors text-white font-bold shadow-[0_0_15px_rgba(225,29,72,0.4)]">Evet, Sil</button>
                        </div>
                    </div>
                </div>
            )}

            {editModalOpen && itemToEdit && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#0B0F19] border border-cyan-500/30 rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
                        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/5">
                            <h3 className="text-lg font-bold text-white">İlanı Düzenle</h3>
                            <button onClick={() => setEditModalOpen(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div><label className="block text-xs font-semibold text-cyan-400 mb-1.5 uppercase">İlan Başlığı</label><input type="text" defaultValue={itemToEdit.title} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-500/50 transition-colors" /></div>
                            <div><label className="block text-xs font-semibold text-cyan-400 mb-1.5 uppercase">Fiyat (₺)</label><input type="number" defaultValue={itemToEdit.price} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-500/50 transition-colors" /></div>
                            <button onClick={saveEdit} className="w-full mt-4 py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 transition-colors text-black font-bold shadow-[0_0_15px_rgba(34,211,238,0.3)]">Değişiklikleri Kaydet</button>
                        </div>
                    </div>
                </div>
            )}

            {/* top section: profile card */}
            <div className="bg-[#0B0F19]/80 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden mb-8">
                <div className="h-32 md:h-48 w-full bg-gradient-to-r from-cyan-900/40 via-blue-900/40 to-rose-900/40 relative">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
                </div>

                <div className="px-6 pb-6 md:px-10 md:pb-10 relative">
                    <div className="flex flex-col md:flex-row gap-6 md:items-end -mt-16 md:-mt-20 relative z-10">
                        <div className="w-32 h-32 rounded-full border-4 border-[#0B0F19] bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-[0_0_30px_rgba(34,211,238,0.3)] overflow-hidden">
                            {userData.profile_photo ? (
                                <img src={userData.profile_photo} alt="Profil" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-4xl font-black text-white">{userData.name.charAt(0)}{userData.surname.charAt(0)}</span>
                            )}
                        </div>

                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-3xl font-black tracking-tight text-white">{userData.name} {userData.surname}</h1>
                                {/* rating */}
                                <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg text-amber-400">
                                    <Star size={14} className="fill-current" />
                                    <span className="font-bold text-sm">{userRating}</span>
                                    <span className="text-xs opacity-50">({userData.rating_count})</span>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 font-medium">
                                <span className="flex items-center gap-1.5 capitalize"><User size={16} className="text-cyan-400"/> {userData.account_type === 'student' ? 'Öğrenci' : 'Harici Kullanıcı'}</span>
                                {userData.account_type === 'student' && userData.university && (
                                    <span className="flex items-center gap-1.5"><GraduationCap size={16} className="text-blue-400"/> {userData.university}</span>
                                )}
                                <span className="flex items-center gap-1.5"><Calendar size={16} className="text-rose-400"/> Katılım: {joinYear}</span>
                            </div>
                        </div>

                        <button
                            onClick={() => setActiveTab('settings')}
                            className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors font-semibold flex items-center justify-center gap-2">
                            <Settings size={18} /> Profili Düzenle
                        </button>
                    </div>
                </div>
            </div>

            {/* bottom section */}
            <div className="flex flex-col md:flex-row gap-8">

                <div className="w-full md:w-72 flex flex-col gap-2">
                    <button onClick={() => setActiveTab('adverts')} className={`p-4 rounded-2xl flex items-center gap-3 font-semibold transition-all ${activeTab === 'adverts' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-transparent text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}>
                        <Package size={20} /> İlanlarım
                    </button>
                    <button onClick={() => setActiveTab('favorites')} className={`p-4 rounded-2xl flex items-center gap-3 font-semibold transition-all ${activeTab === 'favorites' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-transparent text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}>
                        <Heart size={20} /> Favorilerim
                    </button>
                    <button onClick={() => setActiveTab('settings')} className={`p-4 rounded-2xl flex items-center gap-3 font-semibold transition-all ${activeTab === 'settings' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-transparent text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}>
                        <Settings size={20} /> Hesap Ayarları
                    </button>
                </div>

                <div className="flex-1 bg-[#0B0F19]/60 backdrop-blur-md border border-white/10 rounded-3xl p-6 md:p-8 min-h-[400px]">

                    {/* my ads and my favorites */}
                    {activeTab === 'adverts' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <h2 className="text-xl font-bold text-white mb-4 border-b border-white/10 pb-4">Aktif İlanlarım</h2>
                            {myAdverts.map((advert) => (
                                <div key={advert.id} className="group bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-cyan-500/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-100 group-hover:text-cyan-400 transition-colors">{advert.title}</h3>
                                        <div className="flex gap-3 mt-2 text-xs font-medium text-gray-500">
                                            <span className="bg-white/5 px-2 py-1 rounded-md">{advert.category}</span>
                                            <span className="flex items-center gap-1"><Calendar size={12}/> {advert.date}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t border-white/10 md:border-0">
                                        <span className="text-xl font-black text-white">₺{advert.price}</span>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => openEditModal(advert)} className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white transition-all"><Edit3 size={18} /></button>
                                            <button onClick={() => confirmDelete(advert.id)} className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition-all"><Trash2 size={18} /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'favorites' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <h2 className="text-xl font-bold text-white mb-4 border-b border-white/10 pb-4">Favoriye Aldıklarım</h2>
                            {MOCK_FAVORITES.map((fav) => (
                                <div key={fav.id} className="group bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-rose-500/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-100 group-hover:text-rose-400 transition-colors">{fav.title}</h3>
                                        <p className="text-sm text-gray-400 mt-1">Satıcı: <span className="text-gray-200 font-medium">{fav.author}</span></p>
                                    </div>
                                    <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t border-white/10 md:border-0">
                                        <span className="text-xl font-black text-white">₺{fav.price}</span>
                                        <div className="flex items-center gap-2">
                                            <button className="px-4 py-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 font-semibold hover:bg-cyan-500 hover:text-black transition-all flex items-center gap-2">İlana Git <ExternalLink size={16} /></button>
                                            <button className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all"><Heart size={18} className="fill-current" /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* account settings */}
                    {activeTab === 'settings' && (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            <div className="border-b border-white/10 pb-4 flex items-center justify-between">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Settings size={24} className="text-blue-400" /> Hesap Ayarları
                                </h2>
                                <span className="text-xs bg-white/5 px-3 py-1.5 rounded-full text-gray-400">ID: {userData._id}</span>
                            </div>

                            <form onSubmit={handleProfileUpdate} className="space-y-8">

                                {/* personal info */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                                        <User size={16} /> Kişisel Bilgiler
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-1.5">İsim (Name)</label>
                                            <input type="text" value={userData.name} onChange={(e) => setUserData({...userData, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-500/50 transition-colors" required />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-1.5">Soyisim (Surname)</label>
                                            <input type="text" value={userData.surname} onChange={(e) => setUserData({...userData, surname: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-500/50 transition-colors" required />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-1.5">Kullanıcı Adı (Username)</label>
                                            <input type="text" value={userData.username} onChange={(e) => setUserData({...userData, username: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-500/50 transition-colors" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-1.5">Doğum Tarihi (Birthdate)</label>
                                            <input type="date" value={userData.birthdate} onChange={(e) => setUserData({...userData, birthdate: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-500/50 transition-colors [color-scheme:dark]" />
                                        </div>
                                    </div>
                                </div>

                                {/* contact and education */}
                                <div className="space-y-4 pt-4 border-t border-white/10">
                                    <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                                        <Mail size={16} /> İletişim & Eğitim
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-1.5">Kişisel Email</label>
                                            <input type="email" value={userData.email} onChange={(e) => setUserData({...userData, email: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-500/50 transition-colors" required />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-1.5">Telefon Numarası</label>
                                            <div className="relative">
                                                <Phone size={18} className="absolute left-4 top-3.5 text-gray-500" />
                                                <input type="tel" value={userData.telephone} onChange={(e) => setUserData({...userData, telephone: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white outline-none focus:border-cyan-500/50 transition-colors" />
                                            </div>
                                        </div>

                                        {/* only students can view/edit edu mail and university accounts. */}
                                        {userData.account_type === 'student' && (
                                            <>
                                                <div>
                                                    <label className="block text-xs font-semibold text-rose-400 mb-1.5">Edu Email (Doğrulanmış)</label>
                                                    <input type="email" value={userData.edu_email} disabled className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-gray-400 cursor-not-allowed" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-400 mb-1.5">Üniversite</label>
                                                    <input type="text" value={userData.university} onChange={(e) => setUserData({...userData, university: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-500/50 transition-colors" />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* security */}
                                {userData.auth_provider === 'local' && (
                                    <div className="space-y-4 pt-4 border-t border-white/10">
                                        <h3 className="text-sm font-bold text-rose-400 uppercase tracking-wider flex items-center gap-2">
                                            <Shield size={16} /> Güvenlik
                                        </h3>
                                        <div className="grid grid-cols-1 gap-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Yeni Şifre (Değiştirmek istemiyorsanız boş bırakın)</label>
                                                <input type="password" placeholder="••••••••" className="w-full md:w-1/2 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-rose-500/50 transition-colors" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="pt-6 border-t border-white/10 flex justify-end">
                                    <button type="submit" className="px-8 py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 transition-all text-black font-bold shadow-[0_0_20px_rgba(34,211,238,0.3)]">
                                        Değişiklikleri Kaydet
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}