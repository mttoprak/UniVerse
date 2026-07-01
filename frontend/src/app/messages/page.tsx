"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef, Suspense } from 'react';
import { getWsClient } from '@/utils/graphqlWs'; // Yolunu kendi klasör yapına göre düzelt
import { createClient, Client } from 'graphql-ws'; // Socket.io yerine graphql-ws geldi
import { Send, MapPin, Loader2, ArrowLeft, ArrowRight, Navigation, Tag, Store, CheckCheck, Check, ShieldCheck } from 'lucide-react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';

const darkMapStyle = [
    { elementType: "geometry", stylers: [{ color: "#212121" }] },
    { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#212121" }] },
    { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#757575" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#0B0F19" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#2c2c2c" }] }
];

const mapContainerStyle = { width: '100%', height: '100%', borderRadius: '0.75rem' };
const LIBRARIES: ("places")[] = ["places"];
const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

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
        throw new Error(`API Hatası: ${response.status}`);
    }

    const result = await response.json();
    if (result.errors) {
        throw new Error(result.errors[0].message);
    }
    return result.data;
}

// --- GRAPHQL SORGULARI VE MUTASYONLARI ---
const CHECK_AUTH = `#graphql
query CheckAuth {
    getMe { _id: id }
}
`;

const GET_CONVERSATIONS = `#graphql
query GetConversations {
    getConversations(limit: 50) {
        conversations {
            _id: id
            sellerId
            buyerId
            listing { _id: id title }
            seller { _id: id username name profile_photo }
            buyer { _id: id username name profile_photo }
            lastMessage {
                preview
                sentAt
                isRead
                type
            }
            unreadSeller
            unreadBuyer
            status
            offerStatus
        }
    }
}
`;

const GET_MESSAGES = `#graphql
query GetMessages($conversationId: ID!) {
    getMessages(conversationId: $conversationId, limit: 100) {
        messages {
            _id: id
            conversationId
            senderId
            text
            photos
            location
            type
            isRead
            createdAt
            offer {
                _id: id
                status
                price
                pricePer
                note
            }
        }
    }
}
`;

const SEND_MESSAGE = `#graphql
mutation SendMessage($input: SendMessageInput!) {
    sendMessage(input: $input) {
        _id: id
        conversationId
        senderId
        text
        photos
        location
        type
        isRead
        createdAt
        offer {
            _id: id
            status
            price
            pricePer
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

const CANCEL_OFFER = `#graphql
mutation CancelOffer($offerId: ID!) {
    cancelOffer(offerId: $offerId) {
        _id: id
        status
    }
}
`;

// --- GRAPHQL ABONELİKLERİ (SUBSCRIPTIONS) ---
const NEW_MESSAGE_SUB = `#graphql
    subscription NewMessage($conversationId: ID!) {
        newMessage(conversationId: $conversationId) {
            _id: id
            conversationId
            senderId
            text
            photos
            location
            type
            isRead
            createdAt
            offer {
                _id: id
                status
                price
                pricePer
                note
            }
        }
    }
`;

const CONVERSATION_UPDATED_SUB = `#graphql
    subscription ConversationUpdated($userId: ID!) {
        conversationUpdated(userId: $userId) {
            _id: id
        }
    }
`;

const OFFER_UPDATED_SUB = `#graphql
    subscription OfferUpdated($conversationId: ID!) {
        offerUpdated(conversationId: $conversationId) {
            _id: id
            status
        }
    }
`;

function MessagesContent() {
    const router = useRouter();
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        libraries: LIBRARIES
    });

    const searchParams = useSearchParams();
    const targetListingId = searchParams.get('listingId');

    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [wsClient, setWsClient] = useState<Client | null>(null);
    const [conversations, setConversations] = useState<any[]>([]);
    const [isConversationsLoading, setIsConversationsLoading] = useState(true);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [messages, setMessages] = useState<any[]>([]);

    const [inputText, setInputText] = useState('');
    const [isMenuOpen, setIsMenuOpen] = useState(true);

    // Not: GraphQL Schema'da user_typing subscription'ı olmadığı için isPeerTyping sabit bırakıldı.
    const [isPeerTyping, setIsPeerTyping] = useState(false);

    // modals
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [isSendingLocation, setIsSendingLocation] = useState(false);
    const [selectedMapLocation, setSelectedMapLocation] = useState({ lat: 38.4237, lng: 27.1428 });

    const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
    const [offerPrice, setOfferPrice] = useState<string>('');
    const [offerPricePer, setOfferPricePer] = useState<'One Time' | 'Per Month' | 'Per Session'>('One Time');

    // fullscreen scroll lock for conversation page
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const token = localStorage.getItem('accessToken');
        if (!token) {
            router.push('/login');
            return;
        }

        // Merkezi client'i çağır
        const client = getWsClient();
        if(!client) return;

        setWsClient(client);

        // Kullanıcı verisini ve sohbet listesini çek
        fetchGraphQL(CHECK_AUTH).then(userData => {
            setCurrentUserId(userData.getMe?._id);
            fetchConversations();
        }).catch(err => console.log("Kullanıcı verisi alınamadı", err));

        // DİKKAT: Burada return () => client.dispose(); SİLDİK.
        // Çünkü client'in tüm uygulamada açık kalmasını istiyoruz.
    }, [router]);

    // 2. Global Abonelikler (Kullanıcıya özel konuşma güncellemeleri)
    useEffect(() => {
        if (!wsClient || !currentUserId) return;

        const unsubscribeConv = wsClient.subscribe(
            { query: CONVERSATION_UPDATED_SUB, variables: { userId: currentUserId } },
            {
                next: () => fetchConversations(),
                error: (err) => console.log("Sohbet Güncelleme Abonelik Hatası:", err),
                complete: () => {}
            }
        );

        return () => {
            unsubscribeConv();
        };
    }, [wsClient, currentUserId]);

    // 3. Aktif Sohbet Abonelikleri (Yeni Mesaj ve Teklif Güncellemeleri)
    useEffect(() => {
        if (!wsClient || !activeConversationId) return;

        const unsubscribeMsg = wsClient.subscribe(
            { query: NEW_MESSAGE_SUB, variables: { conversationId: activeConversationId } },
            {
                next: (data: any) => {
                    const msg = data?.data?.newMessage;
                    if (msg) {
                        setMessages(prev => {
                            if (prev.some(m => String(m._id) === String(msg._id))) return prev;
                            return [msg, ...prev];
                        });
                    }
                },
                error: (err) => console.log("Yeni Mesaj Abonelik Hatası:", err),
                complete: () => {}
            }
        );

        const unsubscribeOffer = wsClient.subscribe(
            { query: OFFER_UPDATED_SUB, variables: { conversationId: activeConversationId } },
            {
                next: (data: any) => {
                    const offer = data?.data?.offerUpdated;
                    if (offer) {
                        setMessages(prev => prev.map(m => {
                            if (m.offer && m.offer._id === offer._id) return { ...m, offer: { ...m.offer, status: offer.status } };
                            return m;
                        }));
                    }
                },
                error: (err) => console.log("Teklif Güncelleme Abonelik Hatası:", err),
                complete: () => {}
            }
        );

        return () => {
            unsubscribeMsg();
            unsubscribeOffer();
        };
    }, [wsClient, activeConversationId]);

    // İlan ID'siyle gelindiyse varolan sohbeti seç
    useEffect(() => {
        if (targetListingId && conversations.length > 0) {
            const existingConv = conversations.find(c => {
                const cListingId = typeof c.listing === 'object' ? c.listing?._id : c.listing;
                return cListingId === targetListingId;
            });

            if (existingConv && activeConversationId !== existingConv._id) {
                handleSelectConversation(existingConv._id);
            }
        }
    }, [targetListingId, conversations]);

    const fetchConversations = async () => {
        setIsConversationsLoading(true);
        try {
            const data = await fetchGraphQL(GET_CONVERSATIONS);
            if (data.getConversations?.conversations) {
                const mappedConvs = data.getConversations.conversations.map((c: any) => ({
                    ...c,
                    unreadCount: {
                        seller: c.unreadSeller,
                        buyer: c.unreadBuyer
                    }
                }));
                setConversations(mappedConvs);
            }
        } catch (err) {
            console.log('Sohbetler çekilemedi', err);
        } finally {
            setIsConversationsLoading(false);
        }
    };

    const handleSelectConversation = async (convId: string) => {
        setActiveConversationId(convId);
        setIsMenuOpen(false);

        // UI'da (Sol menüde) kırmızı rozeti anında sıfırla (Optimistic Update)
        setConversations(prev => prev.map(conv => {
            if (conv._id === convId) {
                const isSeller = conv.sellerId === currentUserId || conv.seller?._id === currentUserId;
                return {
                    ...conv,
                    unreadCount: {
                        ...conv.unreadCount,
                        [isSeller ? 'seller' : 'buyer']: 0
                    }
                };
            }
            return conv;
        }));

        try {
            const data = await fetchGraphQL(GET_MESSAGES, { conversationId: convId });
            if (data.getMessages?.messages) {
                setMessages([...data.getMessages.messages].reverse());
            }
        } catch (err) {
            console.log('Mesajlar çekilemedi', err);
        }
    };

    const activeConvData = conversations.find(c => c._id === activeConversationId);

    const sendMessageToApi = async (payload: {text?: string, locationUrl?: string, offerPrice?: string}) => {
        let resolvedListingId = targetListingId;
        if (activeConvData) {
            resolvedListingId = typeof activeConvData.listing === 'object'
                ? activeConvData.listing._id
                : activeConvData.listing;
        }

        if (!resolvedListingId) {
            alert("İlan bilgisi bulunamadı, mesaj gönderilemiyor.");
            return;
        }

        const inputPayload: any = {
            listingId: resolvedListingId,
        };

        if (activeConversationId) inputPayload.conversationId = activeConversationId;
        if (payload.text) inputPayload.text = payload.text;
        if (payload.locationUrl) inputPayload.location = payload.locationUrl;

        if (payload.offerPrice) {
            inputPayload.offerPrice = parseFloat(payload.offerPrice);
            inputPayload.offerPricePer = offerPricePer;
        }

        try {
            const data = await fetchGraphQL(SEND_MESSAGE, { input: inputPayload });
            const newMessage = data.sendMessage;

            if (!activeConversationId && newMessage.conversationId) {
                setActiveConversationId(newMessage.conversationId);
                fetchConversations();
            }

            if (newMessage) {
                setMessages(prev => {
                    if (prev.some(m => m._id === newMessage._id)) return prev;
                    return [newMessage, ...prev];
                });
                fetchConversations();
            }

        } catch (err: any) {
            console.log("Mesaj Gönderim Hatası:", err);
            alert("Mesaj gönderilemedi: " + err.message);
        }
    };

    const handleTextSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputText.trim()) return;
        sendMessageToApi({ text: inputText });
        setInputText('');
    };

    const handleLocationSubmit = (lat: number, lng: number) => {
        const googleMapsUrl = `https://www.google.com/maps?q=$${lat},${lng}`;
        setIsSendingLocation(true);
        sendMessageToApi({ locationUrl: googleMapsUrl }).finally(() => {
            setIsSendingLocation(false);
            setIsLocationModalOpen(false);
        });
    };

    const handleOfferSubmit = () => {
        if(!offerPrice) return;
        sendMessageToApi({ offerPrice: offerPrice });
        setIsOfferModalOpen(false);
        setOfferPrice('');
    };

    const handleOfferAction = async (offerId: string, action: 'accepted' | 'rejected' | 'cancel') => {
        try {
            if (action === 'cancel') {
                await fetchGraphQL(CANCEL_OFFER, { offerId });
            } else {
                await fetchGraphQL(RESPOND_TO_OFFER, { offerId, action });
            }

            if (activeConversationId) {
                handleSelectConversation(activeConversationId);
            }
        } catch (err: any) {
            alert(err.message || 'İşlem başarısız');
        }
    };

    const shareCurrentLocation = () => {
        if (!navigator.geolocation) return alert('GPS desteklenmiyor.');
        setIsSendingLocation(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => handleLocationSubmit(pos.coords.latitude, pos.coords.longitude),
            () => { alert('Konum alınamadı.'); setIsSendingLocation(false); }
        );
    };

    const scrollbarStyle = `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(34, 211, 238, 0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(34, 211, 238, 0.6); }
    `;

    if (!currentUserId) {
        return (
            <div className="min-h-screen pt-28 flex flex-col items-center justify-center bg-[#0B0F19]">
                <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mb-4" />
                <p className="text-cyan-400 font-bold uppercase tracking-widest animate-pulse">Sohbetler Yükleniyor...</p>
            </div>
        );
    }

    return (
        <>
            <style>{scrollbarStyle}</style>

            <div className="fixed top-[80px] bottom-0 left-0 right-0 flex bg-[#0B0F19] overflow-hidden z-40">

                {/* left sidebar */}
                <div className={`${isMenuOpen ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-80 h-full bg-gradient-to-b from-black/60 via-[#0B0F19] to-cyan-950/20 backdrop-blur-xl border-r border-cyan-500/10 shrink-0`}>
                    <div className="p-5 border-b border-white/10 bg-white/5">
                        <h2 className="text-xl font-black text-white px-2">Sohbetlerim</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar py-3 space-y-2 px-3">
                        {isConversationsLoading ? (
                            [...Array(6)].map((_, i) => (
                                <div key={i} className="w-full p-3 rounded-2xl border border-white/5 bg-white/5 animate-pulse flex gap-3 items-center">
                                    <div className="w-12 h-12 rounded-full bg-white/10 flex-shrink-0"></div>
                                    <div className="flex-1 space-y-3 py-1">
                                        <div className="h-3 bg-white/10 rounded w-1/2"></div>
                                        <div className="h-2 bg-white/5 rounded w-3/4"></div>
                                    </div>
                                </div>
                            ))
                        ) : conversations.length === 0 ? (
                            <p className="text-gray-500 text-sm italic text-center mt-5">Henüz sohbetiniz yok.</p>
                        ) : (
                            conversations.map((conv) => {
                                const isSeller = conv.sellerId === currentUserId || conv.seller?._id === currentUserId;
                                const targetUser = isSeller ? conv.buyer : conv.seller;

                                if (!targetUser) return null;

                                return (
                                    <button
                                        key={conv._id}
                                        onClick={() => handleSelectConversation(conv._id)}
                                        className={`w-full text-left p-3 rounded-2xl transition-all border ${activeConversationId === conv._id ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-white/5 border-transparent hover:bg-white/10'} flex gap-3 items-center`}
                                    >
                                        <div className="w-12 h-12 rounded-full flex-shrink-0 border border-white/10 overflow-hidden bg-gray-800">
                                            {targetUser.profile_photo ? (
                                                <img src={targetUser.profile_photo} alt="" className="w-full h-full object-cover" />
                                            ) : ( <div className="w-full h-full flex items-center justify-center font-bold text-gray-400 uppercase">{targetUser.name?.charAt(0) || targetUser.username?.charAt(0) || 'U'}</div> ) }
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-baseline mb-1">
                                                <h3 className="font-bold text-white text-sm truncate">{targetUser.username || targetUser.name}</h3>
                                                <span className="text-[10px] text-gray-500 whitespace-nowrap ml-2">
                                                    {conv.lastMessage?.sentAt ? new Date(Number(conv.lastMessage.sentAt) || conv.lastMessage.sentAt).toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit'}) : ''}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center gap-2">
                                                <p className={`text-xs truncate ${conv.unreadCount?.[isSeller ? 'seller' : 'buyer'] > 0 ? 'text-white font-bold' : 'text-gray-400'}`}>
                                                    {conv.lastMessage?.preview || 'İlan: ' + (conv.listing?.title || 'Silinmiş')}
                                                </p>
                                                {conv.unreadCount?.[isSeller ? 'seller' : 'buyer'] > 0 && (
                                                    <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                                                        {conv.unreadCount[isSeller ? 'seller' : 'buyer']}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* right conversation area */}
                <div className={`${!isMenuOpen ? 'flex' : 'hidden'} md:flex flex-1 flex-col h-full bg-gradient-to-br from-[#0B0F19] via-[#0B0F19] to-indigo-950/10 relative min-w-0`}>

                    {/* modals */}
                    {isLocationModalOpen && (
                        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md transition-all">
                            <div className="bg-[#0B0F19] border border-white/10 rounded-[2.5rem] p-8 w-full max-w-md shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-200">
                                <h3 className="text-2xl font-black text-white mb-6 text-center tracking-tight">KONUM <span className="text-rose-500">PAYLAŞ</span></h3>
                                <div className="space-y-4">
                                    <button type="button" onClick={shareCurrentLocation} disabled={isSendingLocation} className="w-full flex items-center justify-between p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 text-cyan-400 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-cyan-500/20 rounded-xl"><Navigation size={20} /></div>
                                            <span className="font-bold text-base">Mevcut Konum</span>
                                        </div>
                                        {isSendingLocation ? <Loader2 className="animate-spin" /> : <ArrowRight />}
                                    </button>
                                    <div className="w-full h-48 bg-gray-900 rounded-xl overflow-hidden relative border border-white/10">
                                        {isLoaded ? (
                                            <GoogleMap mapContainerStyle={mapContainerStyle} center={selectedMapLocation} zoom={14} onClick={(e) => e.latLng && setSelectedMapLocation({lat: e.latLng.lat(), lng: e.latLng.lng()})} options={{disableDefaultUI: true, zoomControl: true, styles: darkMapStyle}}>
                                                <Marker position={selectedMapLocation} />
                                            </GoogleMap>
                                        ) : ( <div className="flex w-full h-full items-center justify-center text-rose-500"><Loader2 className="animate-spin" size={32} /></div> )}
                                    </div>
                                    <button type="button" onClick={() => handleLocationSubmit(selectedMapLocation.lat, selectedMapLocation.lng)} disabled={!isLoaded || isSendingLocation} className="w-full flex items-center justify-center p-4 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-bold transition-all shadow-[0_0_15px_rgba(244,63,94,0.3)] disabled:opacity-50">
                                        {isSendingLocation ? <Loader2 className="animate-spin" /> : 'İşaretli Konumu Gönder'}
                                    </button>
                                </div>
                                <button type="button" onClick={() => setIsLocationModalOpen(false)} className="mt-6 w-full py-2 text-gray-500 hover:text-white font-medium transition-colors">Vazgeç</button>
                            </div>
                        </div>
                    )}

                    {isOfferModalOpen && (
                        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md transition-all">
                            <div className="bg-[#0B0F19] border border-white/10 rounded-[2.5rem] p-8 w-full max-w-md shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-200">
                                <h3 className="text-2xl font-black text-white mb-6 text-center tracking-tight">TEKLİF <span className="text-yellow-500">GÖNDER</span></h3>
                                <div className="space-y-4">
                                    <div className="relative">
                                        <span className="absolute left-4 top-4 text-emerald-500 font-black">₺</span>
                                        <input type="number" placeholder="Teklif Ettiğiniz Tutar" value={offerPrice} onChange={(e) => setOfferPrice(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-10 pr-4 text-white outline-none focus:border-yellow-500/50 transition-colors" />
                                    </div>
                                    <select value={offerPricePer} onChange={(e) => setOfferPricePer(e.target.value as any)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-gray-300 outline-none focus:border-yellow-500/50 appearance-none">
                                        <option value="One Time" className="bg-[#0B0F19]">Tek Sefer</option>
                                        <option value="Per Month" className="bg-[#0B0F19]">Aylık</option>
                                        <option value="Per Session" className="bg-[#0B0F19]">Seans Başı</option>
                                    </select>
                                    <button type="button" onClick={handleOfferSubmit} className="w-full flex justify-center items-center p-4 rounded-2xl bg-yellow-500 hover:bg-yellow-600 text-black font-black transition-all shadow-[0_0_20px_rgba(234,179,8,0.3)]">Teklifi İlet</button>
                                </div>
                                <button type="button" onClick={() => setIsOfferModalOpen(false)} className="mt-6 w-full py-2 text-gray-500 hover:text-white font-medium transition-colors">Vazgeç</button>
                            </div>
                        </div>
                    )}

                    {/* conversation header */}
                    <div className="bg-black/40 backdrop-blur-xl border-b border-white/10 p-5 flex items-center justify-between z-10 shrink-0">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setIsMenuOpen(true)} className="md:hidden text-gray-400 hover:text-white">
                                <ArrowLeft />
                            </button>

                            {activeConversationId || targetListingId ? (
                                <div className="flex items-center gap-3">
                                    <div>
                                        {activeConvData ? (
                                            <>
                                                <h2 className="font-bold text-white uppercase">{activeConvData.seller?._id === currentUserId ? activeConvData.buyer?.username : activeConvData.seller?.username}</h2>
                                                {isPeerTyping ? (
                                                    <p className="text-xs text-emerald-400 font-bold animate-pulse flex items-center gap-1">Yazıyor...</p>
                                                ) : (
                                                    <p className="text-xs text-cyan-400 flex items-center gap-1 truncate max-w-[200px] sm:max-w-xs">İlan: {activeConvData.listing?.title}</p>
                                                )}
                                            </>
                                        ) : (
                                            <h2 className="font-bold text-white">Yeni Sohbet Başlatılıyor...</h2>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <h2 className="text-gray-500 font-medium">Bir sohbet seçin veya başlatın</h2>
                            )}
                        </div>
                    </div>

                    {/* message bubbles */}
                    <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 flex flex-col-reverse gap-4 custom-scrollbar">
                        {!activeConversationId && !targetListingId && (
                            <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-50">
                                <Store size={64} className="mb-4" />
                                <p className="text-lg">Mesajlaşmaya başlamak için bir sohbet seçin.</p>
                            </div>
                        )}

                        {messages.map((msg) => {
                            const isSystem = msg.type === 'system';
                            const isAdmin = msg.type === 'admin';
                            const senderIdStr = typeof msg.sender === 'object' ? msg.sender?._id : (msg.senderId || msg.sender);
                            const isMe = String(senderIdStr) === String(currentUserId);

                            if (isSystem) {
                                return (
                                    <div key={msg._id || Math.random()} className="flex justify-center w-full animate-in fade-in zoom-in-95 duration-300 my-2">
                                        <div className="px-5 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-[11px] font-bold text-gray-400 uppercase tracking-widest text-center shadow-inner">
                                            {msg.text}
                                        </div>
                                    </div>
                                );
                            }

                            if (isAdmin) {
                                return (
                                    <div key={msg._id || Math.random()} className="flex flex-col justify-center items-center w-full animate-in fade-in zoom-in-95 duration-300 my-4">
                                        <span className="text-[10px] mb-1.5 uppercase font-black tracking-widest text-rose-500 flex items-center gap-1">
                                            <ShieldCheck size={14} /> Sistem Moderatörü
                                        </span>
                                        <div className="px-5 py-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 backdrop-blur-md text-sm font-medium text-rose-200 text-center shadow-[0_0_15px_rgba(244,63,94,0.15)] max-w-[85%]">
                                            {msg.text}
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <div key={msg._id || Math.random()} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                                    <div className={`max-w-[85%] sm:max-w-[75%] p-4 rounded-3xl ${isMe ? 'bg-cyan-600 text-white rounded-tr-sm shadow-[0_4px_15px_rgba(8,145,178,0.3)]' : 'bg-white/5 text-gray-200 rounded-tl-sm border border-white/10'}`}>

                                        {msg.text && <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>}

                                        {msg.photos && msg.photos.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {msg.photos.map((p: string, idx: number) => (
                                                    <img key={idx} src={p} alt="ek" className="w-40 h-40 object-cover rounded-xl border border-white/20 hover:scale-105 transition-transform cursor-pointer" />
                                                ))}
                                            </div>
                                        )}

                                        {msg.location && (
                                            <div className="mt-2 w-full sm:w-72 h-48 rounded-xl overflow-hidden border border-white/20 relative bg-black/50">
                                                <iframe
                                                    src={msg.location.replace('www.google.com', 'maps.google.com') + '&output=embed&z=15'}
                                                    width="100%" height="100%" frameBorder="0" style={{border:0}} aria-hidden="false" tabIndex={0}
                                                ></iframe>
                                                <a href={msg.location} target="_blank" rel="noreferrer" className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-lg text-[10px] font-bold text-white flex items-center gap-1.5 hover:bg-black/90 transition border border-white/10 shadow-lg">
                                                    <MapPin size={12} className="text-rose-400"/> Haritada Aç
                                                </a>
                                            </div>
                                        )}

                                        {msg.offer && typeof msg.offer === 'object' && (
                                            <div className="mt-3 bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-xl w-full sm:w-64">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-1.5"><Tag size={16} className="text-yellow-500"/> <span className="text-xs font-black text-yellow-500 uppercase tracking-widest">Teklif</span></div>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${msg.offer.status === 'Pending' ? 'bg-yellow-500/20 text-yellow-400' : msg.offer.status === 'Accepted' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                                        {msg.offer.status === 'Pending' ? 'Bekliyor' : msg.offer.status === 'Accepted' ? 'Kabul Edildi' : msg.offer.status === 'Rejected' ? 'Reddedildi' : 'İptal'}
                                                    </span>
                                                </div>
                                                <div className="text-3xl font-black text-white mb-1">{msg.offer.price} ₺</div>
                                                <div className="text-xs font-medium text-gray-400 mb-3">{msg.offer.pricePer === 'One Time' ? 'Tek Sefer' : msg.offer.pricePer === 'Per Month' ? 'Aylık' : 'Seans Başı'}</div>

                                                {!isMe && msg.offer.status === 'Pending' && (
                                                    <div className="flex gap-2 mt-4 pt-4 border-t border-yellow-500/20">
                                                        <button onClick={() => handleOfferAction(msg.offer._id, 'accepted')} className="flex-1 py-2 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 font-bold text-xs rounded-lg transition active:scale-95">Kabul Et</button>
                                                        <button onClick={() => handleOfferAction(msg.offer._id, 'rejected')} className="flex-1 py-2 bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 font-bold text-xs rounded-lg transition active:scale-95">Reddet</button>
                                                    </div>
                                                )}

                                                {isMe && msg.offer.status === 'Pending' && (
                                                    <div className="mt-4 pt-4 border-t border-yellow-500/20">
                                                        <button onClick={() => handleOfferAction(msg.offer._id, 'cancel')} className="w-full py-2 bg-rose-500/10 text-rose-500/70 border border-rose-500/20 hover:bg-rose-500 hover:text-white hover:shadow-[0_0_15px_rgba(244,63,94,0.4)] font-bold text-xs rounded-lg transition-all duration-300 active:scale-95">Teklifi İptal Et</button>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="flex items-center justify-end gap-1.5 mt-2 opacity-70">
                                            <span className="text-[10px] block text-right">
                                                {msg.createdAt ? new Date(Number(msg.createdAt) || msg.createdAt).toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit'}) : 'Şimdi'}
                                            </span>
                                            {isMe && (
                                                msg.isRead ? <CheckCheck size={14} className="text-cyan-200" /> : <Check size={14} className="text-gray-300" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* text message bar */}
                    <div className="bg-black/60 backdrop-blur-2xl border-t border-white/10 p-4 pb-6 md:pb-8 shrink-0">
                        <div className="flex items-end gap-3">
                            <div className="flex gap-2">
                                <button type="button" onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); setIsLocationModalOpen(true); }} className="p-3.5 rounded-2xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-all active:scale-90"><MapPin size={22} /></button>
                                <button type="button" onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); setIsOfferModalOpen(true); }} className="p-3.5 rounded-2xl bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 transition-all active:scale-90"><Tag size={22} /></button>
                            </div>
                            <form onSubmit={handleTextSubmit} className="flex-1 flex items-center gap-3">
                                <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 focus-within:border-cyan-500/40 transition-all">
                                    <input
                                        type="text"
                                        value={inputText}
                                        onChange={(e) => setInputText(e.target.value)}
                                        placeholder="Mesajınızı yazın..."
                                        className="w-full bg-transparent outline-none text-sm"
                                        disabled={!activeConversationId && !targetListingId}
                                    />
                                </div>
                                <button type="submit" disabled={(!inputText.trim()) || (!activeConversationId && !targetListingId)} className="p-3.5 rounded-2xl bg-cyan-500 text-black hover:bg-cyan-400 disabled:opacity-30 disabled:hover:bg-cyan-500 transition-all shadow-[0_0_15px_rgba(34,211,238,0.2)]"><Send size={22} /></button>
                            </form>
                        </div>
                    </div>

                </div>
            </div>
        </>
    );
}

export default function MessagesPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen pt-28 flex flex-col items-center justify-center bg-[#0B0F19]">
                <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mb-4" />
                <p className="text-cyan-400 font-bold uppercase tracking-widest animate-pulse">Sohbetler Yükleniyor...</p>
            </div>
        }>
            <MessagesContent />
        </Suspense>
    );
}