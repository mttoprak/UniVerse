"use client";

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { MessageCircle, Bell } from 'lucide-react';
import { getWsClient } from '../utils/graphqlWs'; // Yolunu kendi klasör yapına göre düzelt!

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

// Başlangıçtaki Toplam Okunmamış Mesaj Sayısını Çeken Sorgu
const GET_INITIAL_UNREAD = `#graphql
query GetInitialUnread {
    getMe { _id: id }
    getConversations(limit: 50) {
        conversations {
            sellerId
            buyerId
            unreadSeller
            unreadBuyer
        }
    }
}
`;

// Kullanıcının sohbetlerindeki güncellemeleri dinleyen abonelik
const CONVERSATION_UPDATED_SUB = `#graphql
    subscription ConversationUpdated($userId: ID!) {
        conversationUpdated(userId: $userId) {
            _id: id
            lastMessage {
                senderId
                senderName
                preview
                type
            }
            unreadSeller
            unreadBuyer
            sellerId
            buyerId
        }
    }
`;

export default function GlobalChatWidget() {
    const [unreadCount, setUnreadCount] = useState(0);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [showToast, setShowToast] = useState<{sender: string, text: string} | null>(null);

    const pathname = usePathname();
    const router = useRouter();

    // 1. Başlangıç okunmamış sayısını ve Kullanıcı ID'sini getir
    useEffect(() => {
        const fetchInitialData = async () => {
            if (!localStorage.getItem('accessToken') || pathname === '/messages') return;

            try {
                const data = await fetchGraphQL(GET_INITIAL_UNREAD);
                const myId = data.getMe?._id;

                if (myId) {
                    setCurrentUserId(myId);
                }

                const convs = data.getConversations?.conversations || [];
                let count = 0;

                convs.forEach((c: any) => {
                    if (c.sellerId === myId) count += c.unreadSeller;
                    else if (c.buyerId === myId) count += c.unreadBuyer;
                });

                setUnreadCount(count);
            } catch (err) {
                console.log("Okunmamış mesajlar çekilemedi:", err);
            }
        };

        fetchInitialData();
    }, [pathname]);

    // 2. GraphQL Subscription (Canlı Dinleyici)
    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        if (!token || !currentUserId) return;

        const client = getWsClient();
        if (!client) return;

        const unsubscribe = client.subscribe(
            {
                query: CONVERSATION_UPDATED_SUB,
                variables: { userId: currentUserId }
            },
            {
                next: (data: any) => {
                    const conv = data?.data?.conversationUpdated;
                    if (!conv) return;

                    // Eğer güncellenen sohbetin son mesajını ben YAZMADIYSAM (yani mesaj bana geldiyse)
                    if (conv.lastMessage?.senderId !== currentUserId) {

                        // Mesajlar sayfasında değilsem, bildirimi ve sayacı artır
                        if (window.location.pathname !== '/messages') {
                            // Backend'den direkt güncel sayacı almak yerine frontend'de +1 ekleyebiliriz
                            // Veya en garantisi, tüm okunmamışları yeniden hesaplamaktır ama basitlik için +1:
                            setUnreadCount(prev => prev + 1);

                            const senderName = conv.lastMessage?.senderName || 'Yeni Mesaj';
                            const preview = conv.lastMessage?.preview || 'Sana bir ek/konum gönderdi.';

                            setShowToast({ sender: senderName, text: preview });
                            setTimeout(() => setShowToast(null), 5000);
                        }
                    }
                },
                error: (err) => console.log("Global Chat Abonelik Hatası:", err),
                complete: () => {}
            }
        );

        return () => {
            unsubscribe();
        };
    }, [currentUserId]);

    // Mesajlar sayfasına girildiğinde okundu sayısını sıfırla
    useEffect(() => {
        if (pathname === '/messages') {
            setUnreadCount(0);
            setShowToast(null);
        }
    }, [pathname]);

    // İstenmeyen sayfalarda gizle
    if (pathname === '/login' || pathname === '/register' || pathname.startsWith('/admin')) {
        return null;
    }

    return (
        <div className="fixed bottom-6 right-6 z-[9900] flex flex-col items-end gap-3 pointer-events-none">
            {showToast && (
                <div
                    onClick={() => router.push('/messages')}
                    className="bg-[#0B0F19]/90 backdrop-blur-xl border border-cyan-500/30 p-4 rounded-2xl shadow-[0_10px_30px_rgba(34,211,238,0.2)] text-white w-64 animate-in slide-in-from-bottom-5 pointer-events-auto cursor-pointer hover:bg-[#0B0F19] hover:border-cyan-500/50 transition-colors"
                >
                    <div className="flex items-center gap-2 mb-1.5">
                        <div className="p-1 bg-cyan-500/20 rounded-full animate-pulse"><Bell size={12} className="text-cyan-400" /></div>
                        <span className="text-xs font-black text-cyan-400 uppercase tracking-wider truncate">{showToast.sender}</span>
                    </div>
                    <p className="text-sm text-gray-300 line-clamp-2 leading-tight">{showToast.text}</p>
                </div>
            )}

            {pathname !== '/messages' && (
                <button
                    onClick={() => router.push('/messages')}
                    className="w-14 h-14 bg-cyan-600 hover:bg-cyan-500 text-[#0B0F19] rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all hover:scale-110 pointer-events-auto relative group"
                >
                    <MessageCircle size={28} />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-[#0B0F19] animate-bounce">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                    <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-black/80 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity border border-white/10 whitespace-nowrap shadow-xl">
                        Mesajlara Git
                    </div>
                </button>
            )}
        </div>
    );
}