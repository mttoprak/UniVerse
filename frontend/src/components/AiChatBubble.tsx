"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { gql } from '@apollo/client';
import { useMutation, useQuery, useLazyQuery } from '@apollo/client/react';
import { Sparkles, X, Send, MapPin, Tag, BadgeCheck, Plus, Maximize2, History, Loader2, MessageSquare, Check, GitCompare } from 'lucide-react';

/* ---------------- Listing selection shape reused across queries ---------------- */

const LISTING_FIELDS = `
    id
    title
    description
    price
    location
    type
    condition
    category
    photos
    owner { id username name surname profile_photo is_verified }
`;

// History resolver's Listing may not expose `owner`. If it does, swap this back
// to LISTING_FIELDS. Kept separate so the live query can request owner while
// history omits it (avoids GRAPHQL_VALIDATION_FAILED on a missing field).
const LISTING_FIELDS_HISTORY = `
    id
    title
    description
    price
    location
    type
    condition
    category
    photos
`;

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
                listing { ${LISTING_FIELDS} }
            }
            comparison {
                listings {
                    note
                    listing { ${LISTING_FIELDS} }
                }
                attributes {
                    label
                    values { listingId value isBest }
                }
                comment
                assumptionNote
            }
        }
    }
`;

const GET_ME = gql`
    query GetMe {
        getMe { id username name surname }
    }
`;

export const AI_CONVERSATION_PREVIEWS = gql`
    query AiConversationPreviews {
        aiConversationPreviews {
            conversations {
                aiConversationId
                title
                updatedAt
            }
        }
    }
`;

export const AI_CONVERSATION_HISTORY = gql`
    query AiConversationHistory($aiConversationId: ID!) {
        aiConversationHistory(aiConversationId: $aiConversationId) {
            aiConversationId
            messages {
                role
                text
                listings {
                    note
                    listing { ${LISTING_FIELDS_HISTORY} }
                }
                comparison {
                    listings {
                        note
                        listing { ${LISTING_FIELDS_HISTORY} }
                    }
                    attributes {
                        label
                        values { listingId value isBest }
                    }
                    comment
                    assumptionNote
                }
            }
        }
    }
`;
/* ---------------- Types ---------------- */

export interface Owner {
    id: string;
    username?: string | null;
    name?: string | null;
    surname?: string | null;
    profile_photo?: string | null;
    is_verified?: boolean | null;
}

export interface ChatListing {
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

export interface PresentedListing {
    note?: string | null;
    listing: ChatListing;
}

/* --- Comparison shapes --- */
export interface ComparisonValue {
    listingId: string;
    value: string;
    isBest: boolean;
}
export interface ComparisonAttribute {
    label: string;
    values: ComparisonValue[];
}
export interface ComparisonListing {
    listing: ChatListing;
    note?: string | null;
}
export interface PresentedComparison {
    listings: ComparisonListing[];
    attributes?: ComparisonAttribute[] | null; // null => advisory mode
    comment: string;
    assumptionNote?: string | null;
}

interface AIResponse {
    aiConversationId: string;
    message: string;
    messageAfter?: string | null;
    title?: string | null;
    listings: PresentedListing[];
    comparison?: PresentedComparison | null;
}

interface AskChatbotResult { askChatbot: AIResponse; }
interface AskChatbotVars { input: { message: string; aiConversationId?: string }; }

interface GetMeResult {
    getMe: { id: string; username?: string | null; name?: string | null; surname?: string | null } | null;
}

export interface ConversationPreview {
    aiConversationId: string;
    title?: string | null;
    updatedAt: string;
}
export interface PreviewsResult {
    aiConversationPreviews: { conversations: ConversationPreview[] };
}

export interface HistoryMessage {
    role: string;                 // "user" | "assistant"
    text?: string | null;
    listings: PresentedListing[];
    comparison?: PresentedComparison | null;
}
export interface HistoryResult {
    aiConversationHistory: { aiConversationId: string; messages: HistoryMessage[] };
}

export type Role = 'user' | 'ai';

export interface UIMessage {
    id: string;
    role: Role;
    text: string;
    messageAfter?: string | null;
    listings?: PresentedListing[];
    comparison?: PresentedComparison | null;
    // When set, this user message is a comparison request and renders as a styled
    // chip instead of the raw "karşılaştır: id id" text.
    compareMeta?: { count: number } | null;
}

/* ---------------- Shared handoff (imported by /AI page) ---------------- */

export const AI_HANDOFF_KEY = 'ai_chat_handoff';
export interface AiHandoff {
    conversationId: string | null;
    conversationTitle: string | null;
    messages: UIMessage[];
    // Optional: an auto-message to send on arrival (used by feed "Karşılaştır").
    autoSend?: string | null;
    // How many listings the compare request covers, for the styled chip.
    autoSendCompareCount?: number | null;
}

/* ---------------- Shared helpers ---------------- */

export const CONDITION_LABELS: Record<string, string> = {
    new: 'Sıfır',
    like_new: 'Sıfır Gibi',
    good: 'İyi',
    fair: 'Orta',
    used: 'Kullanılmış',
};

export const THINKING_STEPS = [
    'Düşünüyorum...',
    'İlanları tarıyorum...',
    'En uygun seçenekleri buluyorum...',
    'Neredeyse hazır...',
];

export const SCROLLBAR_CYAN =
    '[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-cyan-500/30 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-cyan-500/50 [scrollbar-width:thin] [scrollbar-color:rgba(34,211,238,0.3)_transparent]';
export const SCROLLBAR_GRAY =
    '[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/20 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.1)_transparent]';

export const formatPrice = (price?: number | null) =>
    price ? `${Number(price).toLocaleString('tr-TR')} ₺` : 'Ücretsiz';

export const ownerDisplayName = (owner?: Owner | null) => {
    if (!owner) return null;
    if (owner.username) return `@${owner.username}`;
    const full = [owner.name, owner.surname].filter(Boolean).join(' ');
    return full || null;
};

export const historyToUIMessages = (msgs: HistoryMessage[]): UIMessage[] =>
    msgs.map((m) => ({
        id: crypto.randomUUID(),
        role: m.role === 'user' ? 'user' : 'ai',
        text: m.text || '',
        listings: m.listings,
        comparison: m.comparison ?? null,
    }));

export const formatConvDate = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
};

/* ---------------- Listing Card ---------------- */

export function ListingCard({ item }: { item: PresentedListing | ComparisonListing }) {
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
                            {l.owner?.is_verified && <BadgeCheck size={12} className="text-cyan-400 shrink-0" />}
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

/* ---------------- Comparison View (reusable: live chat + history) ---------------- */

export function ComparisonView({ comparison }: { comparison: PresentedComparison }) {
    const { listings, attributes, comment, assumptionNote } = comparison;
    const isStructured = !!attributes && attributes.length > 0;

    // Fast lookup: attribute label -> (listingId -> value)
    const valueFor = (attr: ComparisonAttribute, listingId: string) =>
        attr.values.find((v) => v.listingId === listingId);

    return (
        <div className="space-y-3">
            {isStructured ? (
                /* ---------- Structured mode: side-by-side table ---------- */
                <div className={`overflow-x-auto -mx-1 px-1 ${SCROLLBAR_CYAN}`}>
                    <table className="w-full border-separate border-spacing-0 min-w-[420px]">
                        {/* Listing columns */}
                        <thead>
                        <tr>
                            <th className="sticky left-0 z-10 bg-[#0B0F19] w-20 align-bottom" />
                            {listings.map((cl) => (
                                <th key={cl.listing.id} className="p-1 align-bottom min-w-[140px]">
                                    <Link
                                        href={`/listings/${cl.listing.id}`}
                                        className="block bg-white/5 border border-white/10 hover:border-cyan-500/40 rounded-xl p-2 transition-colors"
                                    >
                                        <div className="w-full h-20 rounded-lg overflow-hidden bg-black/40 flex items-center justify-center border border-white/5 mb-2">
                                            {cl.listing.photos?.[0] ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={cl.listing.photos[0]} alt={cl.listing.title} className="w-full h-full object-cover" />
                                            ) : (
                                                <Tag size={18} className="text-white/20" />
                                            )}
                                        </div>
                                        <p className="text-[12px] font-bold text-gray-100 line-clamp-2 leading-tight text-left">{cl.listing.title}</p>
                                        <p className="text-sm font-black text-emerald-400 mt-1 text-left">{formatPrice(cl.listing.price)}</p>
                                    </Link>
                                </th>
                            ))}
                        </tr>
                        </thead>
                        {/* Attribute rows */}
                        <tbody>
                        {attributes!.map((attr, i) => (
                            <tr key={`${attr.label}-${i}`}>
                                <td className="sticky left-0 z-10 bg-[#0B0F19] pr-2 py-1.5 align-middle">
                                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">{attr.label}</span>
                                </td>
                                {listings.map((cl) => {
                                    const cell = valueFor(attr, cl.listing.id);
                                    const best = cell?.isBest;
                                    return (
                                        <td key={cl.listing.id} className="p-1 align-middle">
                                            <div
                                                className={`rounded-lg px-2.5 py-2 text-[12px] text-center border transition-colors ${
                                                    best
                                                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-bold'
                                                        : 'bg-white/[0.03] border-white/5 text-gray-300'
                                                }`}
                                            >
                                                    <span className="inline-flex items-center gap-1 justify-center">
                                                        {best && <Check size={12} className="text-emerald-400 shrink-0" />}
                                                        <span className="break-words">{cell?.value ?? '—'}</span>
                                                    </span>
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                /* ---------- Advisory mode: just the cards ---------- */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {listings.map((cl) => (
                        <ListingCard key={cl.listing.id} item={cl} />
                    ))}
                </div>
            )}

            {/* AI guidance */}
            {comment && (
                <div className="bg-cyan-500/[0.07] border border-cyan-500/20 rounded-xl p-3">
                    <p className="text-sm text-gray-200 break-words leading-relaxed">{comment}</p>
                </div>
            )}

            {/* Assumption note (subtle) */}
            {assumptionNote && (
                <p className="text-[11px] text-gray-500 italic px-1">{assumptionNote}</p>
            )}
        </div>
    );
}

/* ---------------- Compare request chip (user's compare message) ---------------- */

export function CompareRequestChip({ count }: { count: number }) {
    return (
        <div className="inline-flex items-center gap-2 bg-cyan-600 text-white rounded-2xl rounded-br-md px-4 py-2.5">
            <GitCompare size={16} className="shrink-0" />
            <span className="text-sm font-bold">Karşılaştırma: {count} ilan</span>
        </div>
    );
}

/* ---------------- AI message renderer (shared) ---------------- */

export function AiMessageBody({ msg }: { msg: UIMessage }) {
    const hasComparison = !!msg.comparison;
    const hasListings = !hasComparison && msg.listings && msg.listings.length > 0;

    return (
        <div className="w-full bg-white/5 border border-white/10 rounded-2xl rounded-bl-md p-3 space-y-3">
            {msg.text && <p className="text-sm text-gray-200 break-words px-1">{msg.text}</p>}

            {/* Comparison takes priority over the normal listings render */}
            {hasComparison && <ComparisonView comparison={msg.comparison!} />}

            {hasListings && (
                <div className="space-y-2">
                    {msg.listings!.map((item) => (
                        <ListingCard key={item.listing.id} item={item} />
                    ))}
                </div>
            )}

            {msg.messageAfter && <p className="text-sm text-gray-200 break-words px-1">{msg.messageAfter}</p>}
        </div>
    );
}

/* ---------------- Main Widget ---------------- */

export default function AiChatBubble() {
    const router = useRouter();
    const pathname = usePathname();

    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<UIMessage[]>([]);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [conversationTitle, setConversationTitle] = useState<string | null>(null);
    const [thinkingStep, setThinkingStep] = useState(0);

    const scrollRef = useRef<HTMLDivElement>(null);

    const [askChatbot, { loading }] = useMutation<AskChatbotResult, AskChatbotVars>(ASK_CHATBOT);
    const { data: meData } = useQuery<GetMeResult>(GET_ME);
    const firstName = meData?.getMe?.name || meData?.getMe?.username || null;

    const [loadPreviews, { data: previewsData, loading: previewsLoading }] =
        useLazyQuery<PreviewsResult>(AI_CONVERSATION_PREVIEWS, { fetchPolicy: 'network-only' });
    const [loadHistory, { loading: historyLoading }] =
        useLazyQuery<HistoryResult>(AI_CONVERSATION_HISTORY, { fetchPolicy: 'network-only' });

    const previews = previewsData?.aiConversationPreviews?.conversations ?? [];
    const showRecent = messages.length === 0 && !loading && !historyLoading;

    useEffect(() => {
        if (isOpen) loadPreviews();
    }, [isOpen, loadPreviews]);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages, loading]);

    useEffect(() => {
        if (!loading) { setThinkingStep(0); return; }
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
        loadPreviews();
    };

    const selectConversation = async (conv: ConversationPreview) => {
        try {
            const { data } = await loadHistory({ variables: { aiConversationId: conv.aiConversationId } });
            const hist = data?.aiConversationHistory;
            if (!hist) return;
            setConversationId(hist.aiConversationId);
            setConversationTitle(conv.title || 'Sohbet');
            setMessages(historyToUIMessages(hist.messages));
        } catch (err) {
            console.error('History load failed:', err);
            setConversationId(conv.aiConversationId);
            setConversationTitle(conv.title || 'Sohbet');
            setMessages([
                { id: crypto.randomUUID(), role: 'ai', text: 'Bu sohbet yüklenemedi. Lütfen tekrar dene.' },
            ]);
        }
    };

    const openFullPage = () => {
        const handoff: AiHandoff = { conversationId, conversationTitle, messages };
        try {
            sessionStorage.setItem(AI_HANDOFF_KEY, JSON.stringify(handoff));
        } catch { /* storage unavailable */ }
        setIsOpen(false);
        router.push('/AI');
    };

    const handleSend = async () => {
        const text = input.trim();
        if (!text || loading) return;

        setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'user', text }]);
        setInput('');

        try {
            const { data } = await askChatbot({
                variables: {
                    input: {
                        message: text,
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
                    comparison: res.comparison ?? null,
                },
            ]);
        } catch {
            setMessages((prev) => [
                ...prev,
                { id: crypto.randomUUID(), role: 'ai', text: 'Bir şeyler ters gitti. Lütfen tekrar dene.' },
            ]);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    // Hide the floating bubble on routes where it would cover the page's own input,
    // or where an AI assistant doesn't belong (auth / admin).
    const hideBubble =
        pathname === '/AI' ||
        pathname?.startsWith('/AI/') ||
        pathname === '/messages' ||
        pathname?.startsWith('/messages/') ||
        pathname === '/login' ||
        pathname === '/register' ||
        pathname?.startsWith('/admin');
    if (hideBubble) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[9900]">

            {/* Chat Panel */}
            {isOpen && (
                <div className="absolute bottom-20 right-0 w-[calc(100vw-3rem)] sm:w-[420px] h-[85vh] max-h-[calc(100vh-6rem)] bg-[#0B0F19]/95 backdrop-blur-2xl border border-cyan-500/20 rounded-3xl shadow-[0_10px_40px_rgba(34,211,238,0.15)] flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300">

                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/30 shrink-0">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="p-1.5 bg-cyan-500/20 rounded-lg shrink-0">
                                <Sparkles size={16} className="text-cyan-400" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-sm font-black text-white truncate" title={conversationTitle || 'UniVerse AI'}>
                                    {conversationTitle || 'UniVerse AI'}
                                </h3>
                                <p className="text-[10px] text-cyan-400/70 uppercase tracking-wider">Yapay Zeka Asistanı</p>
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
                            <button onClick={openFullPage} title="Tam sayfa" className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                                <Maximize2 size={16} />
                            </button>
                            <button onClick={() => setIsOpen(false)} title="Kapat" className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Recent conversations */}
                    {showRecent && (
                        <div className="shrink-0 border-b border-white/5 bg-white/[0.02]">
                            <div className="flex items-center gap-1.5 px-4 pt-3 pb-2">
                                <History size={12} className="text-gray-500" />
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Son Sohbetler</span>
                            </div>
                            <div className={`max-h-[168px] overflow-y-auto px-3 pb-3 space-y-1 ${SCROLLBAR_GRAY}`}>
                                {previewsLoading && (
                                    <div className="py-6 flex items-center justify-center">
                                        <Loader2 size={18} className="text-gray-500 animate-spin" />
                                    </div>
                                )}
                                {!previewsLoading && previews.length === 0 && (
                                    <div className="py-6 flex flex-col items-center justify-center text-center">
                                        <MessageSquare size={22} className="text-gray-600 mb-1.5" />
                                        <p className="text-xs text-gray-500">Henüz geçmiş sohbetin yok.</p>
                                    </div>
                                )}
                                {!previewsLoading && previews.map((conv) => (
                                    <button
                                        key={conv.aiConversationId}
                                        onClick={() => selectConversation(conv)}
                                        className="w-full text-left px-3 py-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-white/10 transition-colors group"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-[13px] text-gray-300 group-hover:text-white truncate">
                                                {conv.title || 'İsimsiz Sohbet'}
                                            </span>
                                            <span className="text-[10px] text-gray-600 shrink-0">{formatConvDate(conv.updatedAt)}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Messages */}
                    <div ref={scrollRef} className={`flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4 ${SCROLLBAR_CYAN}`}>
                        {historyLoading && (
                            <div className="h-full flex items-center justify-center">
                                <Loader2 size={24} className="text-cyan-400 animate-spin" />
                            </div>
                        )}

                        {showRecent && (
                            <div className="h-full flex flex-col items-center justify-center text-center px-4">
                                <div className="p-3 bg-cyan-500/10 rounded-2xl mb-3">
                                    <Sparkles size={28} className="text-cyan-400" />
                                </div>
                                <h4 className="text-base font-bold text-white mb-1">
                                    Merhaba{firstName ? ` ${firstName}` : ''}! 👋
                                </h4>
                                <p className="text-sm text-gray-400 leading-relaxed">
                                    Aradığın ürünü tarif et, senin için en uygun ilanları bulayım.
                                </p>
                            </div>
                        )}

                        {!historyLoading && messages.map((msg) => {
                            if (msg.role === 'user') {
                                return (
                                    <div key={msg.id} className="flex justify-end">
                                        {msg.compareMeta ? (
                                            <CompareRequestChip count={msg.compareMeta.count} />
                                        ) : (
                                            <div className="max-w-[85%] bg-cyan-600 text-white rounded-2xl rounded-br-md px-4 py-2.5 text-sm break-words">
                                                {msg.text}
                                            </div>
                                        )}
                                    </div>
                                );
                            }
                            return (
                                <div key={msg.id} className="flex justify-start">
                                    <AiMessageBody msg={msg} />
                                </div>
                            );
                        })}

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

                    {/* Input */}
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

            {/* Floating Button — tooltip ABOVE */}
            <button
                onClick={() => setIsOpen((v) => !v)}
                className="w-14 h-14 bg-cyan-600 hover:bg-cyan-500 text-[#0B0F19] rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all hover:scale-110 relative group"
            >
                {isOpen ? <X size={26} /> : <Sparkles size={26} />}
                {!isOpen && (
                    <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/80 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity border border-white/10 whitespace-nowrap shadow-xl">
                        AI Asistan
                    </div>
                )}
            </button>
        </div>
    );
}