"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Package, Heart, Settings, Trash2, Edit3, ExternalLink, User, MapPin, Calendar, AlertTriangle, X, CheckCircle, Star, Mail, Phone, GraduationCap, Shield, Loader2 } from 'lucide-react';

interface Advert {
    _id: string;
    title: string;
    description: string;
    price: number;
    category: string;
    createdAt: string;
    owner: any;
}

export default function ProfilePage() {
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<'adverts' | 'favorites' | 'settings'>('adverts');
    const [userData, setUserData] = useState<any>(null);
    const [myAdverts, setMyAdverts] = useState<Advert[]>([]);
    const [myFavorites, setMyFavorites] = useState<any[]>([]);

    const [pageLoading, setPageLoading] = useState(true);
    const [tabLoading, setTabLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [itemToEdit, setItemToEdit] = useState<any>(null);

    const [newPassword, setNewPassword] = useState('');

    // pull the users info
    useEffect(() => {
        const fetchInitialData = async () => {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                router.push('/login');
                return;
            }

            try {
                setPageLoading(true);
                const userRes = await fetch('http://localhost:5000/api/auth/me', {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const userDataJson = await userRes.json();
                if (!userRes.ok) throw new Error(userDataJson.message);

                const currentProfile = userDataJson.user || userDataJson;

                // date format correction
                if (currentProfile.birthdate) {
                    currentProfile.birthdate = new Date(currentProfile.birthdate).toISOString().split('T')[0];
                }
                setUserData(currentProfile);

                // pull the listings
                const listingsRes = await fetch('http://localhost:5000/api/listing', {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const listingsData = await listingsRes.json();
                if (listingsRes.ok) {
                    const allListings = listingsData.listings || [];
                    const userId = currentProfile._id;
                    const filtered = allListings.filter((ad: any) => (ad.owner?._id || ad.owner) === userId);
                    setMyAdverts(filtered);
                }

            } catch (err: any) {
                console.error(err);
                setToastMessage("Veriler yüklenirken bir sorun oluştu.");
            } finally {
                setPageLoading(false);
            }
        };

        fetchInitialData();
    }, [router]);

    // get favorites
    useEffect(() => {
        if (activeTab === 'favorites' && userData) {
            const fetchFavorites = async () => {
                const token = localStorage.getItem('accessToken');
                try {
                    setTabLoading(true);
                    const res = await fetch('http://localhost:5000/api/user/me/favorites', {
                        method: 'GET',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const data = await res.json();
                    setMyFavorites(data.listings || data || []);
                } catch (err) {
                    console.error("Favoriler çekilemedi:", err);
                } finally {
                    setTabLoading(false);
                }
            };
            fetchFavorites();
        }
    }, [activeTab, userData]);

    useEffect(() => {
        if (toastMessage) {
            const timer = setTimeout(() => setToastMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toastMessage]);

    // delete
    const confirmDelete = (id: string) => { setItemToDelete(id); setDeleteModalOpen(true); };
    const executeDelete = async () => {
        if (!itemToDelete) return;
        const token = localStorage.getItem('accessToken');
        try {
            const response = await fetch(`http://localhost:5000/api/listing/${itemToDelete}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                setMyAdverts(prev => prev.filter(ad => ad._id !== itemToDelete));
                setToastMessage('İlan veritabanından kalıcı olarak silindi.');
            } else {
                setToastMessage('İlan silinemedi.');
            }
        } catch (e) {
            setToastMessage('Bağlantı hatası oluştu.');
        } finally {
            setDeleteModalOpen(false);
            setItemToDelete(null);
        }
    };

    // update
    const openEditModal = (advert: any) => { setItemToEdit({ ...advert }); setEditModalOpen(true); };
    const saveEdit = async () => {
        if (!itemToEdit) return;
        const token = localStorage.getItem('accessToken');
        try {
            const response = await fetch(`http://localhost:5000/api/listing/${itemToEdit._id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: itemToEdit.title,
                    description: itemToEdit.description,
                    price: Number(itemToEdit.price)
                })
            });

            if (response.ok) {
                setMyAdverts(prev => prev.map(ad => ad._id === itemToEdit._id ? { ...ad, title: itemToEdit.title, description: itemToEdit.description, price: itemToEdit.price } : ad));
                setToastMessage('İlan güncellendi.');
            } else {
                setToastMessage('Güncelleme başarısız oldu.');
            }
        } catch (e) {
            setToastMessage('Bağlantı hatası.');
        } finally {
            setEditModalOpen(false);
            setItemToEdit(null);
        }
    };

    // profile update
    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const token = localStorage.getItem('accessToken');

        try {
            const payload: any = {
                name: userData.name,
                surname: userData.surname,
                username: userData.username,
                email: userData.email,
                telephone: userData.telephone,
                birthdate: userData.birthdate ? new Date(userData.birthdate).toISOString() : null,
                university: userData.university
            };

            if (newPassword.trim() !== '') {
                payload.password = newPassword;
            }

            const response = await fetch('http://localhost:5000/api/user/me', {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                setToastMessage('Profil verileriniz başarıyla güncellendi.');
                setNewPassword('');
            } else {
                const errData = await response.json();
                setToastMessage(errData.message || 'Güncelleme başarısız.');
            }
        } catch (err) {
            setToastMessage('Sunucuyla iletişim kurulamadı.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemoveFavorite = async (listingId: string) => {
        const token = localStorage.getItem('accessToken');
        try {
            const res = await fetch(`http://localhost:5000/api/user/me/favorites/${listingId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setMyFavorites(prev => prev.filter(fav => fav._id !== listingId));
                setToastMessage('Favorilerden kaldırıldı.');
            }
        } catch (e) {
            console.error(e);
        }
    };

    if (pageLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mb-4" />
                <p className="text-cyan-400 font-bold uppercase tracking-widest animate-pulse">Profil Verileri Yükleniyor...</p>
            </div>
        );
    }

    if (!userData) return null;

    const userRating = userData.rating_count > 0 ? (userData.rating_sum / userData.rating_count).toFixed(1) : "0.0";
    const joinYear = userData.createdAt ? new Date(userData.createdAt).getFullYear() : 2026;

    return (
        <div className="min-h-screen pt-24 pb-12 px-4 md:px-8 max-w-6xl mx-auto flex flex-col relative text-gray-100">

            {/* toast notification */}
            {toastMessage && (
                <div className="fixed bottom-6 right-6 z-[9999] animate-in slide-in-from-bottom-5 fade-in duration-300 flex items-center gap-3 bg-cyan-900/90 border border-cyan-500/50 backdrop-blur-md px-5 py-3 rounded-2xl shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                    <CheckCircle className="text-cyan-400" size={20} />
                    <span className="font-semibold text-white">{toastMessage}</span>
                </div>
            )}

            {/* delete modal */}
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

            {/* edit modal */}
            {editModalOpen && itemToEdit && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#0B0F19] border border-cyan-500/30 rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
                        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/5">
                            <h3 className="text-lg font-bold text-white">İlanı Düzenle</h3>
                            <button onClick={() => setEditModalOpen(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-cyan-400 mb-1.5 uppercase">İlan Başlığı</label>
                                <input type="text" value={itemToEdit.title} onChange={(e) => setItemToEdit({...itemToEdit, title: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-500/50 transition-colors" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-cyan-400 mb-1.5 uppercase">Açıklama</label>
                                <input type="text" value={itemToEdit.description} onChange={(e) => setItemToEdit({...itemToEdit, description: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-500/50 transition-colors" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-cyan-400 mb-1.5 uppercase">Fiyat (₺)</label>
                                <input type="number" value={itemToEdit.price} onChange={(e) => setItemToEdit({...itemToEdit, price: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-500/50 transition-colors" />
                            </div>
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
                                <span className="text-4xl font-black text-white">{userData.name?.charAt(0)}{userData.surname?.charAt(0)}</span>
                            )}
                        </div>

                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-3xl font-black tracking-tight text-white">{userData.name} {userData.surname}</h1>
                                <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg text-amber-400">
                                    <Star size={14} className="fill-current" />
                                    <span className="font-bold text-sm">{userRating}</span>
                                    <span className="text-xs opacity-50">({userData.rating_count || 0})</span>
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
                        <Package size={20} /> İlanlarım ({myAdverts.length})
                    </button>
                    <button onClick={() => setActiveTab('favorites')} className={`p-4 rounded-2xl flex items-center gap-3 font-semibold transition-all ${activeTab === 'favorites' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-transparent text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}>
                        <Heart size={20} /> Favorilerim
                    </button>
                    <button onClick={() => setActiveTab('settings')} className={`p-4 rounded-2xl flex items-center gap-3 font-semibold transition-all ${activeTab === 'settings' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-transparent text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}>
                        <Settings size={20} /> Hesap Ayarları
                    </button>
                </div>

                <div className="flex-1 bg-[#0B0F19]/60 backdrop-blur-md border border-white/10 rounded-3xl p-6 md:p-8 min-h-[400px]">

                    {activeTab === 'adverts' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <h2 className="text-xl font-bold text-white mb-4 border-b border-white/10 pb-4">Aktif İlanlarım</h2>
                            {myAdverts.length === 0 ? (
                                <p className="text-sm text-gray-500">Henüz yayınlanmış bir ilanınız bulunmuyor.</p>
                            ) : (
                                myAdverts.map((advert) => (
                                    <div key={advert._id} className="group bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-cyan-500/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div>
                                            <h3 className="font-bold text-lg text-gray-100 group-hover:text-cyan-400 transition-colors">{advert.title}</h3>
                                            <div className="flex gap-3 mt-2 text-xs font-medium text-gray-500">
                                                <span className="bg-white/5 px-2 py-1 rounded-md uppercase text-cyan-400">{advert.category || 'Genel'}</span>
                                                <span className="flex items-center gap-1"><Calendar size={12}/> {new Date(advert.createdAt).toLocaleDateString('tr-TR')}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t border-white/10 md:border-0">
                                            <span className="text-xl font-black text-emerald-400">₺{advert.price}</span>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => openEditModal(advert)} className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white transition-all"><Edit3 size={18} /></button>
                                                <button onClick={() => confirmDelete(advert._id)} className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition-all"><Trash2 size={18} /></button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === 'favorites' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <h2 className="text-xl font-bold text-white mb-4 border-b border-white/10 pb-4">Favoriye Aldıklarım</h2>
                            {tabLoading ? (
                                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-cyan-500 animate-spin" /></div>
                            ) : myFavorites.length === 0 ? (
                                <p className="text-sm text-gray-500">Favorilerinize eklenmiş ilan bulunamadı.</p>
                            ) : (
                                myFavorites.map((fav) => (
                                    <div key={fav._id} className="group bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-rose-500/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div>
                                            <h3 className="font-bold text-lg text-gray-100 group-hover:text-rose-400 transition-colors">{fav.title}</h3>
                                            <p className="text-sm text-gray-400 mt-1">Satıcı: <span className="text-cyan-400 font-medium">@{fav.owner?.username || 'Kullanıcı'}</span></p>
                                        </div>
                                        <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t border-white/10 md:border-0">
                                            <span className="text-xl font-black text-emerald-400">₺{fav.price}</span>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => router.push(`/listings/${fav._id}`)} className="px-4 py-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 font-semibold hover:bg-cyan-500 hover:text-black transition-all flex items-center gap-2">İlana Git <ExternalLink size={16} /></button>
                                                <button onClick={() => handleRemoveFavorite(fav._id)} className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all"><Heart size={18} className="fill-current" /></button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            <div className="border-b border-white/10 pb-4 flex items-center justify-between">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Settings size={24} className="text-blue-400" /> Hesap Ayarları
                                </h2>
                                <span className="text-xs bg-white/5 px-3 py-1.5 rounded-full text-gray-400">ID: {userData._id}</span>
                            </div>

                            <form onSubmit={handleProfileUpdate} className="space-y-8">
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                                        <User size={16} /> Kişisel Bilgiler
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-1.5">İsim (Name)</label>
                                            <input type="text" value={userData.name || ''} onChange={(e) => setUserData({...userData, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-500/50 transition-colors" required />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-1.5">Soyisim (Surname)</label>
                                            <input type="text" value={userData.surname || ''} onChange={(e) => setUserData({...userData, surname: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-500/50 transition-colors" required />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-1.5">Kullanıcı Adı (Username)</label>
                                            <input type="text" value={userData.username || ''} onChange={(e) => setUserData({...userData, username: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-500/50 transition-colors" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-1.5">Doğum Tarihi (Birthdate)</label>
                                            <input type="date" value={userData.birthdate || ''} onChange={(e) => setUserData({...userData, birthdate: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-500/50 transition-colors [color-scheme:dark]" />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t border-white/10">
                                    <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                                        <Mail size={16} /> İletişim Bilgileri
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-1.5">Kişisel Email</label>
                                            <input type="email" value={userData.email || ''} onChange={(e) => setUserData({...userData, email: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-500/50 transition-colors" required />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-1.5">Telefon Numarası</label>
                                            <div className="relative">
                                                <Phone size={18} className="absolute left-4 top-3.5 text-gray-500" />
                                                <input type="tel" value={userData.telephone || ''} onChange={(e) => setUserData({...userData, telephone: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white outline-none focus:border-cyan-500/50 transition-colors" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {userData.account_type === 'student' && (
                                    <div className="space-y-4 pt-4 border-t border-white/10">
                                        <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                                            <GraduationCap size={16} /> Öğrenci Bilgileri
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Edu Email</label>
                                                <input type="email" value={userData.edu_email || ''} disabled className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-gray-400 cursor-not-allowed" />

                                                <div className="pt-2">
                                                    {userData.is_verified ? (
                                                        <div className="w-fit text-sm font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-2.5 rounded-xl flex items-center justify-center gap-2">
                                                            <CheckCircle size={18} /> Doğrulandı
                                                        </div>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => router.push('/verify-edu')}
                                                            className="relative w-full text-sm font-bold bg-purple-600 hover:bg-purple-500 border border-purple-500 text-white px-4 py-3 rounded-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_25px_rgba(168,85,247,0.5)] active:translate-y-0 overflow-hidden group flex justify-center items-center gap-2"
                                                        >
                                                            <span className="absolute w-0 h-0 transition-all duration-560 ease-out bg-white rounded-full group-hover:w-100 group-hover:h-100 opacity-10"></span>
                                                            <span className="relative z-10 flex items-center gap-2">Hemen Doğrula</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Üniversite</label>
                                                <input type="text" value={userData.university || ''} onChange={(e) => setUserData({...userData, university: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-500/50 transition-colors" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {userData.auth_provider === 'local' && (
                                    <div className="space-y-4 pt-4 border-t border-white/10">
                                        <h3 className="text-sm font-bold text-rose-400 uppercase tracking-wider flex items-center gap-2">
                                            <Shield size={16} /> Güvenlik
                                        </h3>
                                        <div className="grid grid-cols-1 gap-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Yeni Şifre (Değiştirmek istemiyorsanız boş bırakın)</label>
                                                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" className="w-full md:w-1/2 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-rose-500/50 transition-colors" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="pt-6 border-t border-white/10 flex justify-end">
                                    <button type="submit" disabled={isSubmitting} className="px-8 py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 transition-all text-black font-bold shadow-[0_0_20px_rgba(34,211,238,0.3)] disabled:opacity-50">
                                        {isSubmitting ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
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