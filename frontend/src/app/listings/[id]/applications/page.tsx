"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowLeft, Loader2, User, GraduationCap, Clock,
    CheckCircle, XCircle, FileText, Check, X, ShieldCheck
} from 'lucide-react';

interface Applicant {
    _id: string;
    name: string;
    surname: string;
    profile_photo: string;
    university: string;
}

interface Application {
    _id: string;
    applicant: Applicant;
    status: 'Pending' | 'Accepted' | 'Rejected' | 'Cancelled';
    note: string | null;
    createdAt: string;
}

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

    if (!response.ok) throw new Error(`API Hatası: ${response.status}`);
    const result = await response.json();
    if (result.errors) throw new Error(result.errors[0].message);
    return result.data;
}

// --- GRAPHQL SORGULARI ---
const GET_LISTING_APPLICATIONS = `#graphql
    query GetListingApplications($listingId: ID!) {
        getListingApplications(listingId: $listingId) {
            applications {
                _id: id
                status
                note
                createdAt
                applicant {
                    _id: id
                    name
                    surname
                    profile_photo
                    university
                }
            }
        }
    }
`;

const RESPOND_TO_OFFER = `#graphql
    mutation RespondToOffer($offerId: ID!, $action: String!) {
        respondToOffer(offerId: $offerId, action: $action) {
            _id: id
            status
        }
    }
`;

export default function ListingApplicationsPage() {
    const params = useParams();
    const router = useRouter();
    const listingId = params.id as string;

    const [applications, setApplications] = useState<Application[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchApplications = async () => {
            const token = localStorage.getItem('accessToken');
            if (!token) return router.push('/login');

            try {
                const data = await fetchGraphQL(GET_LISTING_APPLICATIONS, { listingId });
                setApplications(data.getListingApplications?.applications || []);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        if (listingId) fetchApplications();
    }, [listingId, router]);

    // Başvuruyu Kabul Et veya Reddet
    const handleRespond = async (offerId: string, action: 'accepted' | 'rejected') => {
        setActionLoadingId(offerId);

        try {
            await fetchGraphQL(RESPOND_TO_OFFER, { offerId, action });

            // State'i güncelle ki sayfa yenilenmeden durumu değişsin
            setApplications(prev => prev.map(app =>
                app._id === offerId ? { ...app, status: action === 'accepted' ? 'Accepted' : 'Rejected' } : app
            ));

        } catch (err: any) {
            alert(err.message);
        } finally {
            setActionLoadingId(null);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#050505]">
                <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mb-4" />
                <p className="text-cyan-400 font-bold uppercase tracking-widest animate-pulse">Başvurular Yükleniyor...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-24 pb-12 px-4 md:px-8 bg-[#050505]">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8 border-b border-white/10 pb-6">
                    <button
                        onClick={() => router.back()}
                        className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight">Gelen Başvurular</h1>
                        <p className="text-gray-500 mt-1">İlanınıza yapılan tüm başvuruları buradan yönetebilirsiniz.</p>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-sm">
                        {error}
                    </div>
                )}

                {/* List */}
                <div className="space-y-4">
                    {applications.length === 0 ? (
                        <div className="text-center py-20 bg-white/5 border border-white/10 rounded-3xl">
                            <FileText size={48} className="mx-auto text-gray-600 mb-4" />
                            <h3 className="text-xl font-bold text-gray-300 mb-2">Henüz başvuru yok</h3>
                            <p className="text-gray-500 text-sm">İlanınıza başvuru yapıldığında burada görünecektir.</p>
                        </div>
                    ) : (
                        applications.map((app) => (
                            <div
                                key={app._id}
                                className="bg-[#0B0F19]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
                            >
                                <div className="flex items-start gap-4 flex-1">
                                    {/* Aday Fotoğrafı */}
                                    <div className="w-16 h-16 rounded-full overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                                        {app.applicant.profile_photo ? (
                                            <img src={app.applicant.profile_photo} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <User size={24} className="text-gray-500" />
                                        )}
                                    </div>

                                    {/* Aday Detayları */}
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold text-gray-100 flex items-center gap-2 mb-1">
                                            {app.applicant.name} {app.applicant.surname}
                                        </h3>
                                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 font-medium mb-3">
                                            {app.applicant.university && (
                                                <span className="flex items-center gap-1"><GraduationCap size={14} className="text-blue-400"/> {app.applicant.university}</span>
                                            )}
                                            <span className="flex items-center gap-1"><Clock size={14} /> {new Date(Number(app.createdAt) || app.createdAt).toLocaleDateString('tr-TR')}</span>
                                        </div>

                                        {/* Adayın Notu (Eğer varsa) */}
                                        {app.note && (
                                            <div className="bg-black/40 p-3 rounded-xl border border-white/5 text-sm text-gray-300 italic">
                                                "{app.note}"
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Aksiyon Butonları / Durum */}
                                <div className="flex flex-col items-end gap-2 border-t border-white/5 md:border-0 pt-4 md:pt-0 shrink-0">
                                    {app.status === 'Pending' ? (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleRespond(app._id, 'accepted')}
                                                disabled={actionLoadingId === app._id}
                                                className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-black font-bold rounded-xl transition-colors"
                                            >
                                                {actionLoadingId === app._id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Kabul Et
                                            </button>
                                            <button
                                                onClick={() => handleRespond(app._id, 'rejected')}
                                                disabled={actionLoadingId === app._id}
                                                className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white font-bold rounded-xl transition-colors"
                                            >
                                                {actionLoadingId === app._id ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />} Reddet
                                            </button>
                                        </div>
                                    ) : (
                                        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wider ${app.status === 'Accepted' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                            {app.status === 'Accepted' ? <ShieldCheck size={18} /> : <XCircle size={18} />}
                                            {app.status === 'Accepted' ? 'Kabul Edildi' : 'Reddedildi'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}