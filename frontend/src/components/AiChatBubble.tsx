"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import { Sparkles, X, Send, MapPin, Tag, BadgeCheck, Plus } from 'lucide-react';

/* ---------------- GraphQL ---------------- */

const ASK_CHATBOT = gql`
    mutation AskChatbot($input: askChatbotInput!) {
        askChatbot(input: $input) {
            aiConversationId
            message
            messageAfter
            title
            listings {
                note
                listing {
                    id
                    title
                    description
                    price
                    location
                    type
                    condition
                    category
                    photos
                    owner {
                        id
                        username
                        name
                        surname
                        profile_photo
                        is_verified
                    }
                }
            }
        }
    }
`;

/* ---------------- Types ---------------- */

interface Owner {
    id: string;
    username?: string | null;
    name?: string | null;
    surname?: string | null;
    profile_photo?: string | null;
    is_verified?: boolean | null;
}

interface ChatListing {
    id: string;
    title: string;
    description?: string | null;
    price?: number | null;
    location?: string | null;
    type?: string | null;
    condition?: string | null;
    category?: string | null;
    photos?: string[] | null;
    owner?: Owner | null;
}

interface PresentedListing {
    note?: string | null;
    listing: ChatListing;
}

interface AIResponse {
    aiConversationId: string;
    message: string;
    messageAfter?: string | null;
    title?: string | null;
    listings: PresentedListing[];
}

interface AskChatbotResult {
    askChatbot: AIResponse;
}

interface AskChatbotVars {
    input: {
        message: string;
        aiConversationId?: string;
    };
}

type Role = 'user' | 'ai';

interface UIMessage {
    id: string;
    role: Role;
    text: string;
    messageAfter?: string | null;
    listings?: PresentedListing[];
}

/* ---------------- Helpers ---------------- */

const CONDITION_LABELS: Record<string, string> = {
    new: 'Sıfır',
    like_new: 'Sıfır Gibi',
    good: 'İyi',
    fair: 'Orta',
    used: 'Kullanılmış',
};

const THINKING_STEPS = [
    'Düşünüyorum...',
    'İlanları tarıyorum...',
    'En uygun seçenekleri buluyorum...',
    'Neredeyse hazır...',
];

const formatPrice = (price?: number | null) =>
    price ? `${Number(price).toLocaleString('tr-TR')} ₺` : 'Ücretsiz';

const ownerDisplayName = (owner?: Owner | null) => {
    if (!owner) return null;
    if (owner.username) return `@${owner.username}`;
    const full = [owner.name, owner.surname].filter(Boolean).join(' ');
    return full || null;
};

/* ---------------- Listing Card ---------------- */

function ListingCard({ item }: { item: PresentedListing }) {
    const l = item.listing;
    const photo = l.photos?.[0];
    const ownerName = ownerDisplayName(l.owner);

    return (
        <Link
            href={`/listings/${l.id}`}
            className="block bg-white/5 border border-white/10 hover:border-cyan-500/40 rounded-xl overflow-hidden transition-all hover:shadow-[0_0_15px_rgba(34,211,238,0.15)]"
        >
            <div className="flex gap-3 p-3">
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-black/40 shrink-0 flex items-center justify-center border border-white/5">
                    {photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photo} alt={l.title} className="w-full h-full object-cover" />
                    ) : (
                        <Tag size={20} className="text-white/20" />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-gray-100 line-clamp-1">{l.title}</h4>
                    <p className="text-base font-black text-emerald-400 mt-0.5">{formatPrice(l.price)}</p>
                    <div className="flex items-center gap-2 mt-1">
                        {l.location && (
                            <span className="flex items-center text-[11px] text-gray-400 min-w-0">
                                <MapPin size={11} className="mr-0.5 text-cyan-400 shrink-0" />
                                <span className="truncate">{l.location}</span>
                            </span>
                        )}
                        {l.condition && (
                            <span className="px-1.5 py-0.5 bg-cyan-500/10 border border-cyan-500/20 rounded text-[10px] font-bold text-cyan-300 shrink-0">
                                {CONDITION_LABELS[l.condition] || l.condition}
                            </span>
                        )}
                    </div>
                    {ownerName && (
                        <div className="flex items-center gap-1 mt-1.5 min-w-0">
                            <span className="text-[11px] text-gray-500 truncate">{ownerName}</span>
                            {l.owner?.is_verified && (
                                <BadgeCheck size={12} className="text-cyan-400 shrink-0" />
                            )}
                        </div>
                    )}
                </div>
            </div>
            {item.note && (
                <div className="px-3 pb-3 -mt-1">
                    <p className="text-[11px] text-gray-400 leading-snug border-l-2 border-cyan-500/40 pl-2">
                        {item.note}
                    </p>
                </div>
            )}
        </Link>
    );
}

/* ---------------- Main Widget ---------------- */

export default function AiChatBubble() {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<UIMessage[]>([]);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [conversationTitle, setConversationTitle] = useState<string | null>(null);
    const [thinkingStep, setThinkingStep] = useState(0);

    const scrollRef = useRef<HTMLDivElement>(null);

    const [askChatbot, { loading }] = useMutation<AskChatbotResult, AskChatbotVars>(ASK_CHATBOT);

    // Auto-scroll to newest
    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages, loading]);

    // Cycle the thinking status text
    useEffect(() => {
        if (!loading) {
            setThinkingStep(0);
            return;
        }
        const interval = setInterval(() => {
            setThinkingStep((prev) => (prev + 1) % THINKING_STEPS.length);
        }, 2000);
        return () => clearInterval(interval);
    }, [loading]);

    const startNewChat = () => {
        setMessages([]);
        setConversationId(null);
        setConversationTitle(null);
        setInput('');
    };

    const handleSend = async () => {
        const text = input.trim();
        if (!text || loading) return;

        setMessages((prev) => [
            ...prev,
            { id: crypto.randomUUID(), role: 'user', text },
        ]);
        setInput('');

        try {
            const { data } = await askChatbot({
                variables: {
                    input: {
                        message: text,
                        // Only include aiConversationId once we have one — never send null.
                        ...(conversationId ? { aiConversationId: conversationId } : {}),
                    },
                },
            });

            const res = data?.askChatbot;
            if (!res) throw new Error('empty');

            if (res.aiConversationId) setConversationId(res.aiConversationId);
            if (res.title) setConversationTitle(res.title);

            setMessages((prev) => [
                ...prev,
                {
                    id: crypto.randomUUID(),
                    role: 'ai',
                    text: res.message,
                    messageAfter: res.messageAfter,
                    listings: res.listings,
                },
            ]);
        } catch {
            setMessages((prev) => [
                ...prev,
                {
                    id: crypto.randomUUID(),
                    role: 'ai',
                    text: 'Bir şeyler ters gitti. Lütfen tekrar dene.',
                },
            ]);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="fixed bottom-24 right-6 z-[9900]">

            {/* Chat Panel — absolutely anchored above the button */}
            {isOpen && (
                <div className="absolute bottom-20 right-0 w-[calc(100vw-3rem)] sm:w-[400px] h-[600px] max-h-[calc(100vh-11rem)] bg-[#0B0F19]/95 backdrop-blur-2xl border border-cyan-500/20 rounded-3xl shadow-[0_10px_40px_rgba(34,211,238,0.15)] flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300">

                    {/* Header (fixed) */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/30 shrink-0">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="p-1.5 bg-cyan-500/20 rounded-lg shrink-0">
                                <Sparkles size={16} className="text-cyan-400" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-sm font-black text-white truncate" title={conversationTitle || 'UniVerse AI'}>
                                    {conversationTitle || 'UniVerse AI'}
                                </h3>
                                <p className="text-[10px] text-cyan-400/70 uppercase tracking-wider">
                                    Yapay Zeka Asistanı
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                            {messages.length > 0 && (
                                <button
                                    onClick={startNewChat}
                                    title="Yeni sohbet"
                                    className="flex items-center gap-1 px-2 py-1.5 text-cyan-300 hover:text-white hover:bg-cyan-500/20 border border-cyan-500/20 rounded-lg transition-colors text-[11px] font-bold"
                                >
                                    <Plus size={14} />
                                    Yeni
                                </button>
                            )}
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Messages (scrollable) */}
                    <div
                        ref={scrollRef}
                        className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-cyan-500/30 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-cyan-500/50 [scrollbar-width:thin] [scrollbar-color:rgba(34,211,238,0.3)_transparent]"
                    >
                        {messages.length === 0 && !loading && (
                            <div className="h-full flex flex-col items-center justify-center text-center px-4">
                                <div className="p-3 bg-cyan-500/10 rounded-2xl mb-3">
                                    <Sparkles size={28} className="text-cyan-400" />
                                </div>
                                <h4 className="text-base font-bold text-white mb-1">Merhaba ${}! 👋</h4>
                                <p className="text-sm text-gray-400 leading-relaxed">
                                    Aradığın ürünü tarif et, senin için en uygun ilanları bulayım.
                                </p>
                            </div>
                        )}

                        {messages.map((msg) => {
                            if (msg.role === 'user') {
                                return (
                                    <div key={msg.id} className="flex justify-end">
                                        <div className="max-w-[85%] bg-cyan-600 text-white rounded-2xl rounded-br-md px-4 py-2.5 text-sm break-words">
                                            {msg.text}
                                        </div>
                                    </div>
                                );
                            }

                            // AI turn: one grouped container holding text + cards + follow-up
                            const hasListings = msg.listings && msg.listings.length > 0;
                            return (
                                <div key={msg.id} className="flex justify-start">
                                    <div className="w-full bg-white/5 border border-white/10 rounded-2xl rounded-bl-md p-3 space-y-3">
                                        {/* Intro text */}
                                        <p className="text-sm text-gray-200 break-words px-1">{msg.text}</p>

                                        {/* Listing cards */}
                                        {hasListings && (
                                            <div className="space-y-2">
                                                {msg.listings!.map((item) => (
                                                    <ListingCard key={item.listing.id} item={item} />
                                                ))}
                                            </div>
                                        )}

                                        {/* Follow-up text below cards */}
                                        {msg.messageAfter && (
                                            <p className="text-sm text-gray-200 break-words px-1">{msg.messageAfter}</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Thinking indicator */}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-white/5 border border-white/10 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2.5">
                                    <div className="flex gap-1">
                                        <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                        <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                        <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" />
                                    </div>
                                    <span className="text-xs text-cyan-300/80">{THINKING_STEPS[thinkingStep]}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input (fixed) */}
                    <div className="p-3 border-t border-white/10 bg-black/30 shrink-0">
                        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1 focus-within:border-cyan-500/50 transition-colors">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Bir şey sor..."
                                disabled={loading}
                                className="flex-1 min-w-0 bg-transparent py-2 text-sm text-gray-200 outline-none placeholder:text-gray-500 disabled:opacity-50"
                            />
                            <button
                                onClick={handleSend}
                                disabled={loading || !input.trim()}
                                className="p-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-white/5 disabled:text-gray-600 text-white rounded-lg transition-colors shrink-0"
                            >
                                <Send size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Button */}
            <button
                onClick={() => setIsOpen((v) => !v)}
                className="w-14 h-14 bg-cyan-600 hover:bg-cyan-500 text-[#0B0F19] rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all hover:scale-110 relative group"
            >
                {isOpen ? <X size={26} /> : <Sparkles size={26} />}
                {!isOpen && (
                    <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-black/80 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity border border-white/10 whitespace-nowrap shadow-xl">
                        AI Asistan
                    </div>
                )}
            </button>
        </div>
    );
}