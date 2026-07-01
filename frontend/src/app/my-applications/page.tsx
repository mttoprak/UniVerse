"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Briefcase, Award, Clock, CheckCircle,
    XCircle, ExternalLink, ArrowLeft, Loader2, FileText, X
} from 'lucide-react';

interface Application {
    _id: string;
    status: 'Pending' | 'Accepted' | 'Rejected' | 'Cancelled';
    note: string | null;
    createdAt: string;
    listing: {
        _id: string;
        title: string;
        type: string;
    };
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
const GET_MY_APPLICATIONS = `#graphql
    query GetMyApplications {
        getMyApplications {
            applications {
                _id: id
                status
                note
                createdAt
                listing {
                    _id: id
                    title
                    type
                }
            }
        }
    }
`;

export default function MyApplicationsPage() {
    const router = useRouter();
    const [applications, setApplications] = useState<Application[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchApplications = async () => {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                router.push('/login');
                return;
            }

            try {
                const data = await fetchGraphQL(GET_MY_APPLICATIONS);
                setApplications(data.getMyApplications?.applications || []);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchApplications();
    }, [router]);

    const formatDate = (dateString: string) => {
        // GraphQL'den string dönen timestamp'i Number'a çevirip güvenli tarih objesi oluşturuyoruz
        const date = new Date(Number(dateString) || dateString);
        return date.toLocaleDateString('tr-TR', {
            day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    const renderStatusBadge = (status: string) => {
        switch (status) {
            case 'Pending':
                return (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 rounded-lg text-xs font-bold uppercase tracking-wider">
                        <Clock size={14} /> Değerlendirmede
                    </span>
                );
            case 'Accepted':
                return (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs font-bold uppercase tracking-wider">
                        <CheckCircle size={14} /> Kabul Edildi
                    </span>
                );
            case 'Rejected':
                return (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs font-bold uppercase tracking-wider">
                        <XCircle size={14} /> Reddedildi
                    </span>
                );
            case 'Cancelled':
                return (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-500/10 border border-gray-500/20 text-gray-400 rounded-lg text-xs font-bold uppercase tracking-wider">
                        <X size={14} /> İptal Edildi
                    </span>
                );
            default:
                return null;
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#050505]">
                <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mb-4" />
                <p className="text-cyan-400 font-bold uppercase tracking-widest animate-pulse">Başvurularınız Yükleniyor...</p>
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
                        <h1 className="text-3xl font-black text-white tracking-tight">Başvurularım</h1>
                        <p className="text-gray-500 mt-1">İş ve burs ilanlarına yaptığınız tüm başvurular.</p>
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
                            <h3 className="text-xl font-bold text-gray-300 mb-2">Henüz bir başvurunuz yok</h3>
                            <p className="text-gray-500 text-sm mb-6">Kampüsteki iş ve burs fırsatlarını keşfetmeye başlayın.</p>
                            <button
                                onClick={() => router.push('/feed')}
                                className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-black font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(34,211,238,0.3)]"
                            >
                                İlanlara Göz At
                            </button>
                        </div>
                    ) : (
                        applications.map((app) => (
                            <div
                                key={app._id}
                                className="bg-[#0B0F19]/60 backdrop-blur-xl border border-white/10 hover:border-cyan-500/30 rounded-2xl p-5 md:p-6 transition-all group flex flex-col md:flex-row md:items-center justify-between gap-6"
                            >
                                <div className="flex items-start gap-4 flex-1">
                                    {/* İkon */}
                                    <div className={`p-4 rounded-2xl flex-shrink-0 ${app.listing?.type === 'scholarship' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-blue-500/10 text-blue-400'}`}>
                                        {app.listing?.type === 'scholarship' ? <Award size={24} /> : <Briefcase size={24} />}
                                    </div>

                                    {/* Detaylar */}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 bg-white/5 px-2 py-0.5 rounded">
                                                {app.listing?.type === 'scholarship' ? 'Burs' : 'İş / Staj'}
                                            </span>
                                            <span className="text-xs text-gray-500 flex items-center gap-1">
                                                <Clock size={12} /> {formatDate(app.createdAt)}
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-100 group-hover:text-cyan-400 transition-colors line-clamp-1 mb-2">
                                            {app.listing?.title || 'Silinmiş İlan'}
                                        </h3>
                                        {app.note && (
                                            <p className="text-sm text-gray-400 line-clamp-2 italic bg-black/40 p-3 rounded-xl border border-white/5">
                                                "{app.note}"
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Durum ve Aksiyon */}
                                <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-4 border-t border-white/5 md:border-0 pt-4 md:pt-0 shrink-0">
                                    {renderStatusBadge(app.status)}

                                    {app.listing && (
                                        <button
                                            onClick={() => router.push(`/listings/${app.listing._id}`)}
                                            className="flex items-center gap-1.5 text-sm font-bold text-cyan-500 hover:text-cyan-400 transition-colors px-4 py-2 rounded-xl hover:bg-cyan-500/10"
                                        >
                                            İlana Git <ExternalLink size={16} />
                                        </button>
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