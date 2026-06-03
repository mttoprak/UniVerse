"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Send, MapPin, Loader2, ArrowLeft, ArrowRight, Navigation, Tag, Store, CheckCheck, Check } from 'lucide-react';
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

export default function MessagesPage() {
    const router = useRouter();
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""
    });

    const searchParams = useSearchParams();
    const targetListingId = searchParams.get('listingId');

    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [socket, setSocket] = useState<Socket | null>(null);
    const [conversations, setConversations] = useState<any[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [messages, setMessages] = useState<any[]>([]);

    const [inputText, setInputText] = useState('');
    const [isMenuOpen, setIsMenuOpen] = useState(true);

    // Modals
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [isSendingLocation, setIsSendingLocation] = useState(false);
    const [selectedMapLocation, setSelectedMapLocation] = useState({ lat: 38.4237, lng: 27.1428 });

    const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
    const [offerPrice, setOfferPrice] = useState<string>('');
    const [offerPricePer, setOfferPricePer] = useState<'One Time' | 'Per Month' | 'Per Session'>('One Time');

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        const initializeChat = async () => {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                router.push('/login');
                return;
            }

            try {
                const userRes = await fetch(`${API_URL}/api/auth/me`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const userText = await userRes.text();
                const userData = JSON.parse(userText);

                const myId = userData.user?._id || userData._id;
                setCurrentUserId(myId);

                const newSocket = io(API_URL, {
                    withCredentials: true,
                    extraHeaders: { Authorization: `Bearer ${token}` }
                });
                setSocket(newSocket);

                newSocket.on('connect', () => console.log('Socket bağlandı:', newSocket.id));
                newSocket.on('new_message', (msg) => {
                    setMessages((prev) => {
                        if (prev.some(m => m._id === msg._id)) return prev;
                        return [...prev, msg];
                    });
                    scrollToBottom();
                });

                fetchConversations(token);

            } catch (err) {
                console.error("Başlangıç hatası:", err);
            }
        };

        initializeChat();

        return () => {
            if (socket) socket.disconnect();
            document.body.style.overflow = 'auto';
        };
    }, []);

    const scrollbarStyle = `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(34, 211, 238, 0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(34, 211, 238, 0.6); }
    `;

    const safeFetch = async (url: string, options: any) => {
        const res = await fetch(url, options);
        const text = await res.text();
        try {
            const data = JSON.parse(text);
            return { res, data };
        } catch (e) {
            console.error(`[API Hatası] Adres: ${url}\nGelen Veri:`, text.substring(0, 200));
            throw new Error("Sunucudan geçersiz bir veri döndü.");
        }
    };

    const fetchConversations = async (token: string) => {
        try {
            const { data } = await safeFetch(`${API_URL}/api/messaging/conversations`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (data.conversations) setConversations(data.conversations);
        } catch (err) {
            console.error('Sohbetler çekilemedi', err);
        }
    };

    const handleSelectConversation = async (convId: string) => {
        setActiveConversationId(convId);
        setIsMenuOpen(false);
        const token = localStorage.getItem('accessToken');

        try {
            const { data } = await safeFetch(`${API_URL}/api/messaging/${convId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (data.messages) {
                setMessages(data.messages);
                scrollToBottom();
            }
            if (socket) socket.emit('join_conversation', convId);
        } catch (err) {
            console.error('Mesajlar çekilemedi', err);
        }
    };

    const scrollToBottom = () => setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

    const activeConvData = conversations.find(c => c._id === activeConversationId);

    const sendMessageToApi = async (payload: {text?: string, locationUrl?: string, offerPrice?: string}) => {
        const token = localStorage.getItem('accessToken');
        if (!token) return;

        const formData = new FormData();

        let resolvedListingId = targetListingId;
        if (activeConvData && activeConvData.listing?._id) {
            resolvedListingId = activeConvData.listing._id;
        } else if (activeConvData && activeConvData.listing) {
            resolvedListingId = typeof activeConvData.listing === 'string' ? activeConvData.listing : activeConvData.listing._id;
        }

        if (!resolvedListingId) {
            alert("İlan bilgisi bulunamadı, mesaj gönderilemiyor.");
            return;
        }

        formData.append('listingId', resolvedListingId);

        if (payload.text) formData.append('text', payload.text);
        if (payload.locationUrl) formData.append('location', payload.locationUrl);
        if (payload.offerPrice) {
            formData.append('offerPrice', payload.offerPrice);
            formData.append('offerPricePer', offerPricePer);
        }

        try {
            const { res, data } = await safeFetch(`${API_URL}/api/messaging`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (!res.ok) {
                const errorMsg = data.errors ? JSON.stringify(data.errors) : (data.message || 'Gönderim başarısız');
                throw new Error(errorMsg);
            }

            if (data.isNewConversation && data.conversationId) {
                setActiveConversationId(data.conversationId);
                fetchConversations(token);
                if (socket) socket.emit('join_conversation', data.conversationId);
            }

            if (data.message) {
                setMessages(prev => {
                    if (prev.some(m => m._id === data.message._id)) return prev;
                    return [...prev, data.message];
                });
                scrollToBottom();
                fetchConversations(token);
            }

        } catch (err: any) {
            console.error("Mesaj Gönderim Hatası:", err);
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
        const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
        setIsSendingLocation(true);
        sendMessageToApi({ locationUrl: googleMapsUrl }).finally(() => {
            setIsSendingLocation(false);
            setIsLocationModalOpen(false);
        });
    };

    const handleOfferSubmit = () => {
        if(!offerPrice) return;
        sendMessageToApi({ offerPrice: offerPrice }).finally(() => {
            setIsOfferModalOpen(false);
            setOfferPrice('');
        });
    };

    const shareCurrentLocation = () => {
        if (!navigator.geolocation) return alert('GPS desteklenmiyor.');
        setIsSendingLocation(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => handleLocationSubmit(pos.coords.latitude, pos.coords.longitude),
            () => { alert('Konum alınamadı.'); setIsSendingLocation(false); }
        );
    };

    if (!currentUserId) {
        return (
            <div className="fixed top-[80px] left-0 right-0 bottom-0 flex overflow-hidden text-gray-100 bg-[#0B0F19] z-40">
                <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mb-4" />
                <p className="text-cyan-400 font-bold uppercase tracking-widest animate-pulse">Sohbetler Yükleniyor...</p>
            </div>
        );
    }

    return (
        <div className="fixed top-[80px] bottom-0 left-0 right-0 flex bg-[#0B0F19] overflow-hidden z-40">
            <style>{scrollbarStyle}</style>

            {/* SOL SİDEBAR */}
            <div className={`${isMenuOpen ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-80 h-full bg-black/40 backdrop-blur-xl border-r border-white/10 shrink-0`}>
                <div className="p-5 border-b border-white/10 bg-white/5">
                    <h2 className="text-xl font-black text-white px-2">Sohbetlerim</h2>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar py-3 space-y-2 px-3">
                    {conversations.length === 0 && (
                        <p className="text-gray-500 text-sm italic text-center mt-5">Henüz sohbetiniz yok.</p>
                    )}
                    {conversations.map((conv) => {
                        const isSeller = conv.seller?._id === currentUserId;
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
                                            {conv.lastMessage?.sentAt ? new Date(conv.lastMessage.sentAt).toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit'}) : ''}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center gap-2">
                                        <p className={`text-xs truncate ${conv.unreadCount?.[isSeller ? 'seller' : 'buyer'] > 0 ? 'text-white font-bold' : 'text-gray-400'}`}>
                                            {conv.lastMessage?.preview || 'İlan: ' + (conv.listing?.title || 'Silinmiş')}
                                        </p>
                                        {/* Okunmadı rozeti */}
                                        {conv.unreadCount?.[isSeller ? 'seller' : 'buyer'] > 0 && (
                                            <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                                                {conv.unreadCount[isSeller ? 'seller' : 'buyer']}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* SAĞ SOHBET ALANI */}
            <div className={`${!isMenuOpen ? 'flex' : 'hidden'} md:flex flex-1 flex-col bg-black/20 relative min-w-0 h-full`}>

                {/* MODALS */}
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

                {/* SOHBET HEADER */}
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
                                            <p className="text-xs text-cyan-400 flex items-center gap-1">İlan: {activeConvData.listing?.title}</p>
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

                {/* MESAJ BALONCUKLARI */}
                <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
                    {!activeConversationId && !targetListingId && (
                        <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-50">
                            <Store size={64} className="mb-4" />
                            <p className="text-lg">Mesajlaşmaya başlamak için bir sohbet seçin.</p>
                        </div>
                    )}

                    {messages.map((msg) => {
                        const senderIdStr = typeof msg.sender === 'object' ? msg.sender?._id : msg.sender;
                        const isMe = senderIdStr === currentUserId;

                        return (
                            <div key={msg._id || Math.random()} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                                <div className={`max-w-[85%] sm:max-w-[75%] p-4 rounded-3xl ${isMe ? 'bg-cyan-600 text-white rounded-tr-sm shadow-[0_4px_15px_rgba(8,145,178,0.3)]' : 'bg-white/5 text-gray-200 rounded-tl-sm border border-white/10'}`}>

                                    {/* 1. Metin */}
                                    {msg.text && <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>}

                                    {/* 2. Fotoğraflar */}
                                    {msg.photos && msg.photos.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {msg.photos.map((p: string, idx: number) => (
                                                <img key={idx} src={p} alt="ek" className="w-40 h-40 object-cover rounded-xl border border-white/20 hover:scale-105 transition-transform cursor-pointer" />
                                            ))}
                                        </div>
                                    )}

                                    {/* 3. Konum Haritası Preview (iframe ile embed) */}
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

                                    {/* 4. Zenginleştirilmiş Teklif (Offer) Kartı */}
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

                                            {/* Teklifi alan kişi için aksiyon butonları */}
                                            {!isMe && msg.offer.status === 'Pending' && (
                                                <div className="flex gap-2 mt-4 pt-4 border-t border-yellow-500/20">
                                                    <button className="flex-1 py-2 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 font-bold text-xs rounded-lg transition">Kabul Et</button>
                                                    <button className="flex-1 py-2 bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 font-bold text-xs rounded-lg transition">Reddet</button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* 5. Zaman ve Okundu Bilgisi (Çift Tik) */}
                                    <div className="flex items-center justify-end gap-1.5 mt-2 opacity-70">
                                        <span className="text-[10px] block text-right">
                                            {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit'}) : 'Şimdi'}
                                        </span>
                                        {isMe && (
                                            msg.isRead ? <CheckCheck size={14} className="text-cyan-200" /> : <Check size={14} className="text-gray-300" />
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* MESAJ YAZMA ALANI */}
                <div className="bg-black/60 backdrop-blur-2xl border-t border-white/10 p-4 pb-6 md:pb-8 shrink-0">
                    <div className="flex items-end gap-3">
                        <div className="flex gap-2">
                            <button type="button" onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); setIsLocationModalOpen(true); }} className="p-3.5 rounded-2xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-all active:scale-90"><MapPin size={22} /></button>
                            <button type="button" onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); setIsOfferModalOpen(true); }} className="p-3.5 rounded-2xl bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 transition-all active:scale-90"><Tag size={22} /></button>
                        </div>
                        <form onSubmit={handleTextSubmit} className="flex-1 flex items-center gap-3">
                            <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 focus-within:border-cyan-500/40 transition-all">
                                <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Mesajınızı yazın..." className="w-full bg-transparent outline-none text-sm" disabled={!activeConversationId && !targetListingId} />
                            </div>
                            <button type="submit" disabled={(!inputText.trim()) || (!activeConversationId && !targetListingId)} className="p-3.5 rounded-2xl bg-cyan-500 text-black hover:bg-cyan-400 disabled:opacity-30 disabled:hover:bg-cyan-500 transition-all shadow-[0_0_15px_rgba(34,211,238,0.2)]"><Send size={22} /></button>
                        </form>
                    </div>
                </div>

            </div>
        </div>
    );
}