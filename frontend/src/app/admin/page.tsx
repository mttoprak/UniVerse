"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    LayoutDashboard, Users, User, Package, Radio, MessageSquare, Search,
    Ban, ShieldCheck, Trash2, Send, Loader2, AlertTriangle, Activity,
    Eye, Clock, CheckCircle
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// --- GRAPHQL YARDIMCI FONKSİYONU ---
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

    if (!response.ok) {
        if (response.status === 401 || response.status === 403) throw new Error("AUTH_ERROR");
        throw new Error(`API Hatası: ${response.status}`);
    }

    const result = await response.json();
    if (result.errors) throw new Error(result.errors[0].message);
    return result.data;
}

// --- GRAPHQL QUERIES & MUTATIONS ---
const GET_DASHBOARD_STATS = `#graphql
    query GetDashboardStats {
        getDashboardStats {
            users { total newThisWeek }
            listings { active }
            activity { totalConversations totalOffers }
        }
    }
`;

const GET_ALL_LISTINGS = `#graphql
    query GetAllListingsAdmin {
        getAllListingsAdmin(limit: 100) {
            listings { _id: id title is_deleted status owner { username } }
        }
    }
`;

const GET_ONLINE_USERS = `#graphql
    query GetOnlineUsers {
        getOnlineUsers {
            totalOnline
            users { userId ip connectedAt userInfo { username } }
        }
    }
`;

const GET_USER_DETAILS = `#graphql
    query GetUserFullDetails($id: ID!) {
        getUserFullDetails(id: $id) {
            user { _id: id username email profile_photo is_verified is_banned }
            logs { id action entity_type metadata createdAt }
        }
    }
`;

const GET_CONV_DETAILS = `#graphql
    query GetConversationDetailsAdmin($convId: ID!) {
        getConversationDetailsAdmin(convId: $convId) {
            conversation { _id: id listing { title } seller { username } buyer { username } }
            messages { _id: id type text sender { username } }
        }
    }
`;

const TOGGLE_BAN = `#graphql
    mutation ToggleBanStatus($identifier: String!) {
        toggleBanStatus(identifier: $identifier) { is_banned }
    }
`;

const VERIFY_USER = `#graphql
    mutation ManualVerifyUser($id: ID!) {
        manualVerifyUser(id: $id) { is_verified }
    }
`;

const DELETE_LISTING = `#graphql
    mutation AdminDeleteListing($id: ID!) {
        adminDeleteListing(id: $id)
    }
`;

const BROADCAST_MSG = `#graphql
    mutation BroadcastAnnouncement($title: String!, $message: String!) {
        broadcastAnnouncement(title: $title, message: $message)
    }
`;

const SEND_ADMIN_MSG = `#graphql
    mutation SendAdminMessageToConversation($convId: ID!, $text: String!) {
        sendAdminMessageToConversation(convId: $convId, text: $text) {
            _id: id type text sender { username }
        }
    }
`;


export default function AdminDashboardPage() {
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'listings' | 'system' | 'conversations'>('dashboard');
    const [isLoading, setIsLoading] = useState(true);
    const [toastMessage, setToastMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

    const [stats, setStats] = useState<any>(null);
    const [listings, setListings] = useState<any[]>([]);
    const [onlineData, setOnlineData] = useState<{ totalOnline: number, users: any[] }>({ totalOnline: 0, users: [] });

    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [userDetails, setUserDetails] = useState<any>(null);
    const [isUserSearching, setIsUserSearching] = useState(false);

    const [broadcastData, setBroadcastData] = useState({ title: '', message: '' });

    const [convSearchQuery, setConvSearchQuery] = useState('');
    const [convDetails, setConvDetails] = useState<any>(null);
    const [adminMsgText, setAdminMsgText] = useState('');

    const showToast = (text: string, type: 'success' | 'error' = 'success') => {
        setToastMessage({ text, type });
        setTimeout(() => setToastMessage(null), 3000);
    };

    const handleGraphQLError = (err: any) => {
        if (err.message === "AUTH_ERROR") {
            router.push('/feed');
        } else {
            showToast(err.message || "Bir hata oluştu", 'error');
        }
    };

    useEffect(() => {
        const loadTabContent = async () => {
            setIsLoading(true);
            try {
                if (activeTab === 'dashboard') {
                    const data = await fetchGraphQL(GET_DASHBOARD_STATS);
                    setStats(data.getDashboardStats);
                } else if (activeTab === 'listings') {
                    const data = await fetchGraphQL(GET_ALL_LISTINGS);
                    setListings(data.getAllListingsAdmin.listings || []);
                } else if (activeTab === 'system') {
                    const data = await fetchGraphQL(GET_ONLINE_USERS);
                    setOnlineData(data.getOnlineUsers);
                }
            } catch (err: any) {
                handleGraphQLError(err);
            } finally {
                setIsLoading(false);
            }
        };
        loadTabContent();
    }, [activeTab]);

    const handleUserSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userSearchQuery) return;
        setIsUserSearching(true);
        setUserDetails(null);
        try {
            const cleanQuery = userSearchQuery.trim().replace(/^@/, '');
            const data = await fetchGraphQL(GET_USER_DETAILS, { id: cleanQuery });
            setUserDetails(data.getUserFullDetails);
        } catch (err: any) { handleGraphQLError(err); }
        finally { setIsUserSearching(false); }
    };

    const handleToggleBan = async (identifier: string) => {
        try {
            const data = await fetchGraphQL(TOGGLE_BAN, { identifier });
            showToast("Ban durumu güncellendi");
            if (userDetails) setUserDetails({ ...userDetails, user: { ...userDetails.user, is_banned: data.toggleBanStatus.is_banned } });
        } catch (err: any) { handleGraphQLError(err); }
    };

    const handleVerifyUser = async (id: string) => {
        try {
            await fetchGraphQL(VERIFY_USER, { id });
            showToast("Kullanıcı onaylandı");
            if (userDetails) setUserDetails({ ...userDetails, user: { ...userDetails.user, is_verified: true } });
        } catch (err: any) { handleGraphQLError(err); }
    };

    const handleDeleteListing = async (id: string) => {
        if (!confirm("İlanı silmek istediğinize emin misiniz? (Soft Delete)")) return;
        try {
            await fetchGraphQL(DELETE_LISTING, { id });
            setListings(prev => prev.map(l => l._id === id ? { ...l, is_deleted: true } : l));
            showToast("İlan silindi");
        } catch (err: any) { handleGraphQLError(err); }
    };

    const handleSendBroadcast = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!broadcastData.title || !broadcastData.message) return;
        try {
            await fetchGraphQL(BROADCAST_MSG, broadcastData);
            showToast("Duyuru gönderildi!");
            setBroadcastData({ title: '', message: '' });
        } catch (err: any) { handleGraphQLError(err); }
    };

    const handleConvSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!convSearchQuery) return;
        try {
            const data = await fetchGraphQL(GET_CONV_DETAILS, { convId: convSearchQuery });
            setConvDetails(data.getConversationDetailsAdmin);
        } catch (err: any) { handleGraphQLError(err); }
    };

    const handleSendAdminMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!adminMsgText || !convDetails) return;
        try {
            const data = await fetchGraphQL(SEND_ADMIN_MSG, { convId: convDetails.conversation._id, text: adminMsgText });
            setConvDetails({ ...convDetails, messages: [...convDetails.messages, data.sendAdminMessageToConversation] });
            setAdminMsgText('');
            showToast("Mesaj iletildi");
        } catch (err: any) { handleGraphQLError(err); }
    };

    return (
        <div className="min-h-screen pt-24 pb-12 px-4 md:px-8 max-w-7xl mx-auto flex flex-col md:flex-row gap-8 relative text-gray-100">

            {/* toast */}
            {toastMessage && (
                <div className={`fixed bottom-6 right-6 z-[9999] px-5 py-3 rounded-2xl border backdrop-blur-md flex items-center gap-3 shadow-2xl animate-in slide-in-from-bottom-5 ${toastMessage.type === 'success' ? 'bg-emerald-900/90 border-emerald-500/50 text-emerald-400' : 'bg-rose-900/90 border-rose-500/50 text-rose-400'}`}>
                    {toastMessage.type === 'success' ? <CheckCircle size={20}/> : <AlertTriangle size={20}/>}
                    <span className="font-bold text-white">{toastMessage.text}</span>
                </div>
            )}

            {/* sidebar */}
            <aside className="w-full md:w-64 flex flex-col gap-2 flex-shrink-0">
                <div className="mb-6 px-4">
                    <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500 tracking-tight">
                        Yönetim Paneli
                    </h1>
                </div>

                {[
                    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                    { id: 'users', label: 'Kullanıcı & Loglar', icon: Users },
                    { id: 'listings', label: 'İlan Yönetimi', icon: Package },
                    { id: 'system', label: 'Sistem Duyurusu', icon: Radio },
                    { id: 'conversations', label: 'Sohbet Müdahale', icon: MessageSquare },
                ].map((item) => (
                    <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`p-4 rounded-2xl flex items-center gap-3 font-semibold transition-all ${activeTab === item.id ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.1)]' : 'bg-transparent text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}>
                        <item.icon size={20} /> {item.label}
                    </button>
                ))}
            </aside>

            {/* main content area */}
            <main className="flex-1 bg-[#0B0F19]/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 min-h-[500px]">
                {isLoading ? (
                    <div className="h-full flex flex-col items-center justify-center py-20">
                        <Loader2 className="w-12 h-12 text-rose-500 animate-spin mb-4" />
                        <p className="text-rose-400 font-bold uppercase tracking-widest animate-pulse">Sistem Verileri Yükleniyor...</p>
                    </div>
                ) : (
                    <>
                        {/* 1. DASHBOARD TAB */}
                        {activeTab === 'dashboard' && stats && (
                            <div className="animate-in fade-in duration-300">
                                <h2 className="text-xl font-bold text-white mb-6 border-b border-white/10 pb-4">Genel İstatistikler</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-5">
                                        <Users className="text-blue-400 mb-2" size={24}/>
                                        <p className="text-sm text-gray-400">Toplam Kullanıcı</p>
                                        <h3 className="text-3xl font-black text-white">{stats.users.total}</h3>
                                        <p className="text-xs text-emerald-400 mt-2">+{stats.users.newThisWeek} bu hafta</p>
                                    </div>
                                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5">
                                        <Package className="text-emerald-400 mb-2" size={24}/>
                                        <p className="text-sm text-gray-400">Aktif İlan</p>
                                        <h3 className="text-3xl font-black text-white">{stats.listings.active}</h3>
                                    </div>
                                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-5">
                                        <MessageSquare className="text-purple-400 mb-2" size={24}/>
                                        <p className="text-sm text-gray-400">Toplam Sohbet</p>
                                        <h3 className="text-3xl font-black text-white">{stats.activity.totalConversations}</h3>
                                    </div>
                                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5">
                                        <Activity className="text-amber-400 mb-2" size={24}/>
                                        <p className="text-sm text-gray-400">Yapılan Teklif</p>
                                        <h3 className="text-3xl font-black text-white">{stats.activity.totalOffers}</h3>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 2. USERS & LOGS TAB */}
                        {activeTab === 'users' && (
                            <div className="animate-in fade-in duration-300">
                                <h2 className="text-xl font-bold text-white mb-6 border-b border-white/10 pb-4">Kullanıcı Denetimi & Loglar</h2>

                                <form onSubmit={handleUserSearch} className="flex gap-3 mb-8">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-4 top-3.5 text-gray-500" size={20}/>
                                        <input
                                            type="text"
                                            value={userSearchQuery}
                                            onChange={(e)=>setUserSearchQuery(e.target.value)}
                                            placeholder="Kullanıcı ID veya Username (örn: ahmet)..."
                                            className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white outline-none focus:border-rose-500/50"
                                        />
                                    </div>
                                    <button type="submit" disabled={isUserSearching} className="bg-rose-600 hover:bg-rose-500 text-white px-6 rounded-xl font-bold transition-all disabled:opacity-50">
                                        {isUserSearching ? <Loader2 size={20} className="animate-spin"/> : 'Ara'}
                                    </button>
                                </form>

                                {userDetails && (
                                    <div className="space-y-6">
                                        {/* profile card */}
                                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center overflow-hidden border-2 border-rose-500/50">
                                                    {userDetails.user.profile_photo ? <img src={userDetails.user.profile_photo} className="w-full h-full object-cover"/> : <User size={24} className="text-gray-400"/>}
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-black text-white">@{userDetails.user.username}</h3>
                                                    <p className="text-sm text-gray-400">{userDetails.user.email}</p>
                                                    <div className="flex gap-2 mt-2">
                                                        {userDetails.user.is_verified && <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-1 rounded font-bold uppercase">Edu Onaylı</span>}
                                                        {userDetails.user.is_banned && <span className="text-[10px] bg-rose-500/20 text-rose-400 px-2 py-1 rounded font-bold uppercase">Banlı</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 w-full md:w-auto">
                                                {!userDetails.user.is_verified && (
                                                    <button onClick={() => handleVerifyUser(userDetails.user._id)} className="flex-1 md:flex-none px-4 py-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white rounded-lg font-bold text-sm transition-colors border border-blue-500/20 flex items-center justify-center gap-2">
                                                        <ShieldCheck size={16}/> Manuel Onay
                                                    </button>
                                                )}
                                                <button onClick={() => handleToggleBan(userDetails.user._id)} className={`flex-1 md:flex-none px-4 py-2 rounded-lg font-bold text-sm transition-colors border flex items-center justify-center gap-2 ${userDetails.user.is_banned ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500 hover:text-white' : 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500 hover:text-white'}`}>
                                                    <Ban size={16}/> {userDetails.user.is_banned ? 'Ban Kaldır' : 'Banla'}
                                                </button>
                                            </div>
                                        </div>

                                        {/* log table */}
                                        <div className="bg-black/40 border border-white/10 rounded-2xl overflow-hidden">
                                            <h4 className="font-bold text-rose-400 p-4 border-b border-white/10 flex items-center gap-2"><Activity size={18}/> Son Aktivite Logları</h4>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-sm text-gray-400">
                                                    <thead className="bg-white/5 text-xs uppercase text-gray-500">
                                                    <tr><th className="px-4 py-3">Tarih</th><th className="px-4 py-3">Aksiyon</th><th className="px-4 py-3">Entity</th><th className="px-4 py-3">Detay (Metadata)</th></tr>
                                                    </thead>
                                                    <tbody>
                                                    {userDetails.logs.length === 0 && <tr><td colSpan={4} className="p-4 text-center">Log bulunamadı.</td></tr>}
                                                    {userDetails.logs.map((log:any) => (
                                                        <tr key={log.id} className="border-b border-white/5 hover:bg-white/5">
                                                            <td className="px-4 py-3 whitespace-nowrap">{new Date(Number(log.createdAt) || log.createdAt).toLocaleString('tr-TR')}</td>
                                                            <td className="px-4 py-3 font-bold text-emerald-400">{log.action}</td>
                                                            <td className="px-4 py-3">{log.entity_type}</td>
                                                            <td className="px-4 py-3 text-xs font-mono break-all">{log.metadata || '{}'}</td>
                                                        </tr>
                                                    ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 3. LISTINGS TAB */}
                        {activeTab === 'listings' && (
                            <div className="animate-in fade-in duration-300">
                                <h2 className="text-xl font-bold text-white mb-6 border-b border-white/10 pb-4">Tüm İlanlar</h2>
                                <div className="bg-black/40 border border-white/10 rounded-2xl overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm text-gray-400">
                                            <thead className="bg-white/5 text-xs uppercase text-gray-500">
                                            <tr><th className="px-4 py-3">İlan Başlığı</th><th className="px-4 py-3">Satıcı</th><th className="px-4 py-3">Durum</th><th className="px-4 py-3 text-right">İşlem</th></tr>
                                            </thead>
                                            <tbody>
                                            {listings.map((ad:any) => (
                                                <tr key={ad._id} className="border-b border-white/5 hover:bg-white/5">
                                                    <td className="px-4 py-3 font-medium text-gray-200">{ad.title}</td>
                                                    <td className="px-4 py-3 text-cyan-400">@{ad.owner?.username}</td>
                                                    <td className="px-4 py-3">
                                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${ad.is_deleted ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                                                {ad.is_deleted ? 'Silinmiş' : ad.status}
                                                            </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <button onClick={()=> router.push(`/listings/${ad._id}`)} className="text-gray-500 hover:text-cyan-400 p-2"><Eye size={16}/></button>
                                                        {!ad.is_deleted && <button onClick={()=> handleDeleteListing(ad._id)} className="text-gray-500 hover:text-rose-500 p-2"><Trash2 size={16}/></button>}
                                                    </td>
                                                </tr>
                                            ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 4. BROADCAST TAB */}
                        {activeTab === 'system' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-300">
                                <div>
                                    <h2 className="text-xl font-bold text-white mb-6 border-b border-white/10 pb-4">Sistem Duyurusu</h2>
                                    <form onSubmit={handleSendBroadcast} className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Başlık</label>
                                            <input type="text" value={broadcastData.title} onChange={(e)=>setBroadcastData({...broadcastData, title:e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-cyan-500/50" required/>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Duyuru Metni</label>
                                            <textarea rows={4} value={broadcastData.message} onChange={(e)=>setBroadcastData({...broadcastData, message:e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-cyan-500/50 resize-none" required/>
                                        </div>
                                        <button type="submit" className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-[0_0_15px_rgba(225,29,72,0.3)] transition-all flex justify-center items-center gap-2">
                                            <Radio size={18}/> Herkese Gönder
                                        </button>
                                    </form>
                                </div>

                                {/* Online Kullanıcılar */}
                                <div>
                                    <h2 className="text-xl font-bold text-white mb-6 border-b border-white/10 pb-4">Aktif Bağlantılar ({onlineData.totalOnline})</h2>
                                    <div className="bg-black/40 border border-white/10 rounded-2xl p-4 max-h-[400px] overflow-y-auto space-y-2">
                                        {onlineData.users.length === 0 ? <p className="text-sm text-gray-500 text-center py-4">Kimse aktif değil.</p> : null}
                                        {onlineData.users.map((u:any, idx) => (
                                            <div key={idx} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]"></div>
                                                <div className="flex-1">
                                                    <h4 className="text-sm font-bold text-gray-200">@{u.userInfo?.username || 'Anonim'}</h4>
                                                    <span className="text-[10px] text-gray-500 font-mono flex items-center gap-1"><Clock size={10}/> {new Date(Number(u.connectedAt) || u.connectedAt).toLocaleTimeString()}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 5. CONVERSATION INTERVENTION TAB */}
                        {activeTab === 'conversations' && (
                            <div className="animate-in fade-in duration-300">
                                <h2 className="text-xl font-bold text-white mb-6 border-b border-white/10 pb-4">Sohbet Müdahalesi</h2>

                                <form onSubmit={handleConvSearch} className="flex gap-3 mb-8">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-4 top-3.5 text-gray-500" size={20}/>
                                        <input type="text" value={convSearchQuery} onChange={(e)=>setConvSearchQuery(e.target.value)} placeholder="Conversation ID girin..." className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white outline-none focus:border-rose-500/50" />
                                    </div>
                                    <button type="submit" className="bg-rose-600 hover:bg-rose-500 text-white px-6 rounded-xl font-bold transition-all">Bul</button>
                                </form>

                                {convDetails && (
                                    <div className="flex flex-col lg:flex-row gap-6">
                                        <div className="flex-1 bg-black/40 border border-white/10 rounded-2xl p-4 max-h-[500px] flex flex-col">
                                            <div className="text-xs text-gray-500 mb-4 pb-2 border-b border-white/10">
                                                İlan: <span className="text-cyan-400 font-bold">{convDetails.conversation.listing?.title}</span> <br/>
                                                Katılımcılar: @{convDetails.conversation.seller?.username} & @{convDetails.conversation.buyer?.username}
                                            </div>

                                            <div className="flex-1 overflow-y-auto space-y-4 pr-4 mb-6 custom-scrollbar">
                                                {convDetails.messages.map((msg:any, index: number) => {
                                                    if (!msg) return null;

                                                    return (
                                                        <div key={msg._id || index} className={`flex flex-col ${msg.type === 'admin' ? 'items-center' : msg.type === 'system' ? 'items-center opacity-70' : 'items-start'}`}>
                                                            <span className={`text-[11px] mb-1.5 uppercase font-bold tracking-wider ${msg.type === 'admin' ? 'text-rose-400' : 'text-gray-500'}`}>
                                                                {msg.type === 'admin' ? 'Sistem Moderatörü' : msg.sender?.username || 'Bilinmeyen'}
                                                            </span>
                                                            <div className={`px-5 py-3 rounded-2xl max-w-[80%] text-base ${msg.type === 'admin' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50' : 'bg-white/10 text-gray-200'}`}>
                                                                {msg.text || 'Sistem Aksiyonu / Medya'}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>

                                            <form onSubmit={handleSendAdminMessage} className="flex gap-2">
                                                <input type="text" value={adminMsgText} onChange={(e)=>setAdminMsgText(e.target.value)} placeholder="Sohbete uyarı/mesaj gönder..." className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 text-sm text-white outline-none focus:border-rose-500/50" />
                                                <button type="submit" className="bg-rose-600 p-3 rounded-xl hover:bg-rose-500 text-white transition-colors"><Send size={18}/></button>
                                            </form>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}