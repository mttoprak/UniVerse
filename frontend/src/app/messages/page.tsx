"use client";

import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Send, MapPin, Loader2, ArrowLeft, ArrowRight, MoreVertical, Image as ImageIcon, Navigation, Map } from 'lucide-react';

interface Message {
    id: string;
    senderId: string;
    text?: string;
    location?: { lat: number; lng: number };
    type: 'text' | 'location' | 'image';
    timestamp: Date;
}

const CURRENT_USER_ID = "user_123";

export default function MessagesPage() {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');

    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [isSendingLocation, setIsSendingLocation] = useState(false);
    const [manualLocation] = useState({ lat: 38.4237, lng: 27.1428 });

    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const newSocket = io('http://localhost:5000');
        setSocket(newSocket);
        newSocket.on('connect', () => console.log('Socket bağlandı:', newSocket.id));
        newSocket.on('receive_message', (msg: Message) => setMessages((prev) => [...prev, msg]));
        return () => { newSocket.disconnect(); };
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputText.trim() || !socket) return;
        const newMessage: Message = {
            id: Math.random().toString(36).substring(7),
            senderId: CURRENT_USER_ID,
            text: inputText,
            type: 'text',
            timestamp: new Date(),
        };
        socket.emit('send_message', newMessage);
        setMessages((prev) => [...prev, newMessage]);
        setInputText('');
    };

    const sendLocationMessage = (lat: number, lng: number) => {
        const newMsg: Message = {
            id: Math.random().toString(36).substring(7),
            senderId: CURRENT_USER_ID,
            location: { lat, lng },
            type: 'location',
            timestamp: new Date(),
        };
        socket?.emit('send_message', newMsg);
        setMessages((prev) => [...prev, newMsg]);
        setIsLocationModalOpen(false);
        setIsSendingLocation(false);
    };

    const shareCurrentLocation = () => {
        if (!navigator.geolocation) return alert('GPS desteklenmiyor.');
        setIsSendingLocation(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => sendLocationMessage(pos.coords.latitude, pos.coords.longitude),
            () => { alert('Konum alınamadı.'); setIsSendingLocation(false); }
        );
    };

    return (
        <div className="min-h-screen pt-24 pb-12 px-4 md:px-8 max-w-5xl mx-auto flex flex-col h-screen relative overflow-hidden text-gray-100">

            {/* MODAL: Fixed ve Portal mantığıyla en dışta */}
            {isLocationModalOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md transition-all">
                    <div className="bg-[#0B0F19] border border-white/10 rounded-[2.5rem] p-8 w-full max-w-md shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-200">
                        <h3 className="text-2xl font-black text-white mb-6 text-center tracking-tight">KONUM <span className="text-rose-500">PAYLAŞ</span></h3>

                        <div className="space-y-4">
                            <button
                                type="button"
                                onClick={shareCurrentLocation}
                                disabled={isSendingLocation}
                                className="w-full flex items-center justify-between p-5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 text-cyan-400 transition-all active:scale-[0.98]"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-cyan-500/20 rounded-xl"><Navigation size={24} /></div>
                                    <span className="font-bold text-lg">Mevcut Konum</span>
                                </div>
                                {isSendingLocation ? <Loader2 className="animate-spin" /> : <ArrowRight />}
                            </button>

                            <button
                                type="button"
                                onClick={() => sendLocationMessage(manualLocation.lat, manualLocation.lng)}
                                className="w-full flex items-center justify-between p-5 rounded-2xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400 transition-all active:scale-[0.98]"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-rose-500/20 rounded-xl"><Map size={24} /></div>
                                    <span className="font-bold text-lg">Haritadan Seç</span>
                                </div>
                                <ArrowRight />
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={() => setIsLocationModalOpen(false)}
                            className="mt-8 w-full py-3 text-gray-500 hover:text-white font-medium transition-colors"
                        >
                            Vazgeç
                        </button>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-t-3xl p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <ArrowLeft className="text-gray-400 cursor-pointer hover:text-white" />
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 border-2 border-white/10" />
                        <div>
                            <h2 className="font-bold text-white">Ahmet Emin GENÇ</h2>
                            <p className="text-xs text-cyan-400 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" /> Çevrimiçi</p>
                        </div>
                    </div>
                </div>
                <MoreVertical className="text-gray-500" />
            </div>

            {/* Chat Area */}
            <div className="flex-1 bg-black/20 border-x border-white/10 p-6 overflow-y-auto space-y-4 scrollbar-hide">
                {messages.map((msg) => {
                    const isMe = msg.senderId === CURRENT_USER_ID;
                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                            <div className={`max-w-[75%] p-4 rounded-2xl ${isMe ? 'bg-cyan-600 text-white rounded-tr-none shadow-[0_4px_15px_rgba(8,145,178,0.3)]' : 'bg-white/5 text-gray-200 rounded-tl-none border border-white/10'}`}>
                                {msg.type === 'text' && <p className="text-sm leading-relaxed">{msg.text}</p>}
                                {msg.type === 'location' && msg.location && (
                                    <a href={`https://www.google.com/maps?q=${msg.location.lat},${msg.location.lng}`} target="_blank" className="block space-y-3 group">
                                        <div className="flex items-center gap-2"><MapPin size={16} className="text-rose-400" /> <span className="font-bold text-xs uppercase tracking-wider">Konum Paylaşıldı</span></div>
                                        <div className="w-full h-32 rounded-xl bg-gray-900 overflow-hidden relative border border-white/10">
                                            <div className="absolute inset-0 bg-cyan-500/10 mix-blend-overlay group-hover:bg-transparent transition-all" />
                                            <div className="w-full h-full flex items-center justify-center"><MapPin className="text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]" size={32} /></div>
                                        </div>
                                    </a>
                                )}
                                <span className="text-[10px] opacity-50 block mt-2 text-right">{new Date(msg.timestamp).toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit'})}</span>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Bottom Input Area */}
            <div className="bg-black/60 backdrop-blur-2xl border border-white/10 rounded-b-3xl p-4">
                <div className="flex items-end gap-3">

                    {/* KRİTİK DEĞİŞİKLİK: Form dışında onPointerDown ile tetikleme */}
                    <button
                        type="button"
                        onPointerDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsLocationModalOpen(true);
                        }}
                        className="p-3.5 rounded-2xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-all active:scale-90"
                    >
                        <MapPin size={22} />
                    </button>

                    <form onSubmit={sendMessage} className="flex-1 flex items-center gap-3">
                        <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 focus-within:border-cyan-500/40 transition-all">
                            <input
                                type="text"
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                placeholder="Mesajınızı yazın..."
                                className="w-full bg-transparent outline-none text-sm"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={!inputText.trim()}
                            className="p-3.5 rounded-2xl bg-cyan-500 text-black hover:bg-cyan-400 disabled:opacity-30 disabled:hover:bg-cyan-500 transition-all shadow-[0_0_15px_rgba(34,211,238,0.2)]"
                        >
                            <Send size={22} />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}