"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Package, User, Calendar, Star, GraduationCap, Loader2, ExternalLink, ShieldCheck } from 'lucide-react';

interface Advert {
    _id: string; // UI uyumluluğu için
    title: string;
    price: number | string;
    category: string;
    type: string;
    createdAt: string;
}

// MT NOT: Tek bir GraphQL Query ile hem kullanıcı profilini hem de ilanlarını çekiyoruz!
const GET_USER_PROFILE_QUERY = `
  query GetUserProfileData($userId: ID!) {
    # 1. user.typeDefs içinden gelen kısım:
    getPublicProfile(id: $userId) {
      user {
        id
        username
        name
        surname
        profile_photo
        rating_sum
        rating_count
        account_type
        is_verified
        edu_email
        university
        createdAt
      }
      listing_count
    }
    
    # 2. listing.typeDefs içinden gelen kısım:
    getUserListings(userId: $userId) {
      id
      title
      price
      category
      type
      createdAt
    }
  }
`;

export default function PublicProfilePage() {
    const params = useParams();
    const router = useRouter();
    // Eski kodda burası listingId'ydi, doğrusu userId olmalı
    const userId = params.id as string;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [userData, setUserData] = useState<any>(null);
    const [userListings, setUserListings] = useState<Advert[]>([]);
    const [pageLoading, setPageLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

    useEffect(() => {
        const fetchPublicProfile = async () => {
            if (!userId) return;

            try {
                setPageLoading(true);
                setError(null);

                const token = localStorage.getItem('accessToken');
                const headers: Record<string, string> = {
                    'Content-Type': 'application/json'
                };
                if (token) headers['Authorization'] = `Bearer ${token}`;

                const response = await fetch(`${API_URL}/graphql`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        query: GET_USER_PROFILE_QUERY,
                        variables: { userId: userId }
                    })
                });

                const result = await response.json();

                if (result.errors) {
                    throw new Error(result.errors[0].message || 'Kullanıcı bilgisine ulaşılamadı.');
                }

                // 1. Kullanıcı Verisini Ayarla
                const profileData = result.data?.getPublicProfile?.user;
                if (!profileData) {
                    throw new Error('Aradığınız profil mevcut değil veya kaldırılmış olabilir.');
                }
                setUserData(profileData);

                // 2. Kullanıcının İlanlarını Ayarla
                const listingsData = result.data?.getUserListings || [];
                // Frontend HTML'i "_id" beklediği için GraphQL'den gelen "id"yi kopyalıyoruz
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setUserListings(listingsData.map((ad: any) => ({ ...ad, _id: ad.id })));

            } catch (err: any) {
                console.log(err);
                setError(err.message || "Kullanıcı verileri yüklenirken bir sorun oluştu.");
            } finally {
                setPageLoading(false);
            }
        };

        fetchPublicProfile();
    }, [userId, API_URL]);

    if (pageLoading) {
        return (
            <div className="min-h-screen pt-28 flex flex-col items-center justify-center relative">
                <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mb-4" />
                <p className="text-cyan-400 font-bold uppercase tracking-widest animate-pulse">Profil Yükleniyor...</p>
            </div>
        );
    }

    if (error || !userData) {
        return (
            <div className="min-h-screen pt-28 flex flex-col items-center justify-center text-center px-4">
                <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mb-4 border border-rose-500/20">
                    <User size={40} className="text-rose-500" />
                </div>
                <h2 className="text-2xl font-black text-white mb-2">Kullanıcı Bulunamadı</h2>
                <p className="text-gray-400 mb-6 max-w-md">{error}</p>
                <button onClick={() => router.push('/feed')} className="px-6 py-3 bg-cyan-500 text-[#0B0F19] font-bold rounded-xl hover:bg-cyan-400 transition-colors">
                    İlanlara Dön
                </button>
            </div>
        );
    }

    // GraphQL'den gelen integer değerlerle güvenli matematik işlemi
    const ratingSum = userData.rating_sum || 0;
    const ratingCount = userData.rating_count || 0;
    const userRating = ratingCount > 0 ? (ratingSum / ratingCount).toFixed(1) : "0.0";
    const joinYear = userData.createdAt ? new Date(Number(userData.createdAt) || userData.createdAt).getFullYear() : "Gizli";

    return (
        <div className="min-h-screen pt-24 pb-12 px-4 md:px-8 max-w-6xl mx-auto flex flex-col relative text-gray-100">

            <div className="bg-[#0B0F19]/80 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden mb-8 shadow-[0_10px_40px_rgba(0,0,0,0.3)]">
                <div className="h-32 md:h-48 w-full bg-gradient-to-r from-cyan-900/40 via-blue-900/40 to-indigo-900/40 relative">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
                </div>

                <div className="px-6 pb-6 md:px-10 md:pb-10 relative">
                    <div className="flex flex-col md:flex-row gap-6 md:items-end -mt-16 md:-mt-20 relative z-10">
                        <div className="w-32 h-32 rounded-full border-4 border-[#0B0F19] bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-[0_0_30px_rgba(34,211,238,0.3)] overflow-hidden flex-shrink-0">
                            {userData.profile_photo || userData.avatar ? (
                                <img src={userData.profile_photo || userData.avatar} alt="Profil" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-4xl font-black text-white uppercase">
                                    {userData.name?.charAt(0) || userData.username?.charAt(0) || 'U'}
                                </span>
                            )}
                        </div>

                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-3xl font-black tracking-tight text-white">
                                    {userData.name && userData.surname ? `${userData.name} ${userData.surname}` : userData.username}
                                </h1>
                                <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg text-amber-400">
                                    <Star size={14} className="fill-current" />
                                    <span className="font-bold text-sm">{userRating}</span>
                                    <span className="text-xs opacity-50">({ratingCount})</span>
                                </div>
                            </div>

                            <h2 className="text-sm font-bold text-cyan-400 mb-3">@{userData.username}</h2>

                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 font-medium">
                                {(userData.account_type?.toLowerCase() === 'student' || !!userData.edu_email) ? (
                                    (userData.is_verified || !!userData.edu_email) ? (
                                        <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                            <ShieldCheck size={16}/> Onaylı Öğrenci
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-gray-500/10 text-gray-300 border border-gray-500/20">
                                            <GraduationCap size={16}/> Öğrenci
                                        </span>
                                    )
                                ) : (
                                    <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-gray-500/10 text-gray-300 border border-gray-500/20">
                                        <User size={16}/> Sivil Kullanıcı
                                    </span>
                                )}

                                {userData.university && (
                                    <span className="flex items-center gap-1.5"><GraduationCap size={16} className="text-blue-400"/> {userData.university}</span>
                                )}
                                <span className="flex items-center gap-1.5"><Calendar size={16} className="text-rose-400"/> Katılım: {joinYear}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-[#0B0F19]/60 backdrop-blur-md border border-white/10 rounded-3xl p-6 md:p-8">
                <div className="flex items-center gap-3 border-b border-white/10 pb-4 mb-6">
                    <Package size={24} className="text-cyan-500" />
                    <h2 className="text-xl font-bold text-white">Yayındaki İlanları ({userListings.length})</h2>
                </div>

                {userListings.length === 0 ? (
                    <div className="text-center py-10">
                        <Package size={48} className="mx-auto text-gray-600 mb-3" />
                        <p className="text-gray-400">Bu kullanıcının şu an yayında olan bir ilanı bulunmuyor.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {userListings.map((advert) => (
                            <div key={advert._id} onClick={() => router.push(`/listings/${advert._id}`)} className="group cursor-pointer bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-cyan-500/50 hover:bg-white/10 transition-all flex flex-col justify-between h-full">
                                <div>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider">
                                            {advert.category || advert.type || 'İlan'}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-lg text-gray-100 group-hover:text-cyan-300 transition-colors line-clamp-2 mb-3">
                                        {advert.title}
                                    </h3>
                                </div>

                                <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                                    <span className="text-xl font-black text-emerald-400">
                                        {advert.price ? `₺${Number(advert.price).toLocaleString('tr-TR')}` : 'Ücretsiz'}
                                    </span>
                                    <button className="text-sm font-bold text-gray-400 group-hover:text-white transition-colors flex items-center gap-1">
                                        İncele <ExternalLink size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

        </div>
    );
}