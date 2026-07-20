"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { gql } from '@apollo/client';
import { useMutation, useQuery, useLazyQuery } from '@apollo/client/react';
import { Sparkles, Send, Plus, ArrowLeft, Loader2, MessageSquare, History, X, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import {
    AI_CONVERSATION_PREVIEWS,
    AI_CONVERSATION_HISTORY,
    AI_HANDOFF_KEY,
    AiMessageBody,
    CompareRequestChip,
    historyToUIMessages,
    formatConvDate,
    THINKING_STEPS,
    SCROLLBAR_CYAN,
    type AiHandoff,
    type UIMessage,
    type PresentedListing,
    type PresentedComparison,
    type ConversationPreview,
    type PreviewsResult,
    type HistoryResult,
} from '@/components/AiChatBubble';

/* ---------------- GraphQL (local to page) ---------------- */

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
                    id title description price location type condition category photos
                    owner { id username name surname profile_photo is_verified }
                }
            }
            comparison {
                listings {
                    note
                    listing {
                        id title description price location type condition category photos
                        owner { id username name surname profile_photo is_verified }
                    }
                }
                attributes { label values { listingId value isBest } }
                comment
                assumptionNote
            }
        }
    }
`;

const GET_ME = gql`
    query GetMe { getMe { id username name surname } }
`;

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

/* ---------------- Page ---------------- */

export default function AIPage() {
    const router = useRouter();

    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<UIMessage[]>([]);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [conversationTitle, setConversationTitle] = useState<string | null>(null);
    const [thinkingStep, setThinkingStep] = useState(0);

    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);
    // Guards so the auto-send from a feed handoff only fires once.
    const autoSentRef = useRef(false);

    const [askChatbot, { loading }] = useMutation<AskChatbotResult, AskChatbotVars>(ASK_CHATBOT);
    const { data: meData } = useQuery<GetMeResult>(GET_ME);
    const firstName = meData?.getMe?.name || meData?.getMe?.username || null;

    const { data: previewsData, loading: previewsLoading, refetch: refetchPreviews } =
        useQuery<PreviewsResult>(AI_CONVERSATION_PREVIEWS, { fetchPolicy: 'cache-and-network' });
    const previews = previewsData?.aiConversationPreviews?.conversations ?? [];

    const [loadHistory, { loading: historyLoading }] =
        useLazyQuery<HistoryResult>(AI_CONVERSATION_HISTORY, { fetchPolicy: 'network-only' });

    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        if (!token) router.push('/login');
    }, [router]);

    // Send a message programmatically (used by both the input and the feed auto-send).
    // compareCount, when given, renders the user's message as a styled compare chip.
    const sendMessage = useCallback(async (text: string, convId: string | null, compareCount?: number) => {
        const trimmed = text.trim();
        if (!trimmed) return;

        setMessages((prev) => [
            ...prev,
            {
                id: crypto.randomUUID(),
                role: 'user',
                text: trimmed,
                compareMeta: compareCount ? { count: compareCount } : null,
            },
        ]);

        try {
            const { data } = await askChatbot({
                variables: {
                    input: {
                        message: trimmed,
                        ...(convId ? { aiConversationId: convId } : {}),
                    },
                },
            });
            const res = data?.askChatbot;
            if (!res) throw new Error('empty');

            const wasNew = !convId;
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

            if (wasNew) refetchPreviews();
        } catch {
            setMessages((prev) => [
                ...prev,
                { id: crypto.randomUUID(), role: 'ai', text: 'Bir şeyler ters gitti. Lütfen tekrar dene.' },
            ]);
        }
    }, [askChatbot, refetchPreviews]);

    // Keep the latest sendMessage in a ref so the mount effect can call it
    // without depending on its (changing) identity.
    const sendMessageRef = useRef(sendMessage);
    useEffect(() => { sendMessageRef.current = sendMessage; }, [sendMessage]);

    // Pick up handoff from the bubble / feed — runs EXACTLY ONCE on mount.
    useEffect(() => {
        if (autoSentRef.current) return;
        autoSentRef.current = true; // never run this block twice

        try {
            const raw = sessionStorage.getItem(AI_HANDOFF_KEY);
            if (!raw) return;

            const handoff: AiHandoff = JSON.parse(raw);
            sessionStorage.removeItem(AI_HANDOFF_KEY); // consume immediately

            setConversationId(handoff.conversationId);
            setConversationTitle(handoff.conversationTitle);
            setMessages(handoff.messages || []);

            // Feed "Karşılaştır" handoff: auto-send the prefilled compare message.
            if (handoff.autoSend) {
                const msg = handoff.autoSend;
                const count = handoff.autoSendCompareCount ?? undefined;
                // Defer so the seeded state (messages/conversationId) is committed first.
                setTimeout(() => sendMessageRef.current(msg, handoff.conversationId, count), 50);
            }
        } catch { /* start fresh */ }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
        setMobileSidebarOpen(false);
    };

    const selectConversation = async (conv: ConversationPreview) => {
        setMobileSidebarOpen(false);
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

    const handleSend = () => {
        if (loading || !input.trim()) return;
        const text = input;
        setInput('');
        sendMessage(text, conversationId);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    /* ---------- Sidebar ---------- */
    const SidebarInner = () => (
        <div className="flex flex-col h-full">
            <div className="p-3 shrink-0">
                <button
                    onClick={startNewChat}
                    className="w-full flex items-center gap-2 px-3 py-2.5 bg-cyan-600/15 hover:bg-cyan-600/25 border border-cyan-500/25 rounded-xl text-cyan-300 text-sm font-bold transition-colors"
                >
                    <Plus size={16} />
                    Yeni Sohbet
                </button>
            </div>
            <div className="px-3 pb-1 shrink-0">
                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Geçmiş</span>
            </div>
            <div className={`flex-1 min-h-0 overflow-y-auto px-3 pb-3 space-y-1 ${SCROLLBAR_CYAN}`}>
                {previewsLoading && previews.length === 0 && (
                    <div className="py-10 flex items-center justify-center">
                        <Loader2 size={22} className="text-gray-500 animate-spin" />
                    </div>
                )}
                {!previewsLoading && previews.length === 0 && (
                    <div className="py-10 flex flex-col items-center justify-center text-center px-2">
                        <MessageSquare size={26} className="text-gray-600 mb-2" />
                        <p className="text-xs text-gray-500">Henüz geçmiş sohbetin yok.</p>
                    </div>
                )}
                {previews.map((conv) => (
                    <button
                        key={conv.aiConversationId}
                        onClick={() => selectConversation(conv)}
                        className={`w-full text-left px-3 py-2.5 rounded-xl border transition-colors group ${
                            conv.aiConversationId === conversationId
                                ? 'bg-cyan-500/10 border-cyan-500/30'
                                : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/5 hover:border-white/10'
                        }`}
                    >
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-sm text-gray-300 group-hover:text-white truncate font-medium">
                                {conv.title || 'İsimsiz Sohbet'}
                            </span>
                            <span className="text-[10px] text-gray-600 shrink-0">{formatConvDate(conv.updatedAt)}</span>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 top-24 flex bg-[#0B0F19]">

            {/* Background glow */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10 flex items-center justify-center">
                <div className="w-[60rem] h-[60rem] bg-cyan-600/10 rounded-full blur-[200px] mix-blend-screen" />
            </div>

            {/* Desktop sidebar */}
            <aside
                className={`hidden md:flex shrink-0 border-r border-white/10 bg-black/20 backdrop-blur-md flex-col overflow-hidden transition-[width] duration-300 ${
                    sidebarCollapsed ? 'w-0 border-r-0' : 'w-72'
                }`}
            >
                <div className="w-72 h-full"><SidebarInner /></div>
            </aside>

            {/* Mobile drawer */}
            {mobileSidebarOpen && (
                <div className="md:hidden fixed inset-0 top-24 z-30 flex">
                    <div className="w-72 max-w-[80%] bg-[#0B0F19] border-r border-white/10 animate-in slide-in-from-left duration-200">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                            <span className="text-sm font-bold text-gray-300">Geçmiş Sohbetler</span>
                            <button onClick={() => setMobileSidebarOpen(false)} className="p-1.5 text-gray-500 hover:text-white rounded-lg">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="h-[calc(100%-3.25rem)]"><SidebarInner /></div>
                    </div>
                    <div className="flex-1 bg-black/60" onClick={() => setMobileSidebarOpen(false)} />
                </div>
            )}

            {/* Main chat column */}
            <div className="flex-1 min-w-0 flex flex-col">

                {/* Header */}
                <div className="shrink-0 border-b border-white/10 bg-black/30 backdrop-blur-md">
                    <div className="px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                            <button onClick={() => router.back()} title="Geri" className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors shrink-0">
                                <ArrowLeft size={18} />
                            </button>
                            <button
                                onClick={() => setSidebarCollapsed((v) => !v)}
                                title={sidebarCollapsed ? 'Kenar çubuğunu aç' : 'Kenar çubuğunu gizle'}
                                className="hidden md:inline-flex p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors shrink-0"
                            >
                                {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
                            </button>
                            <button onClick={() => setMobileSidebarOpen(true)} title="Geçmiş" className="md:hidden p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors shrink-0">
                                <History size={18} />
                            </button>
                            <div className="p-1.5 bg-cyan-500/20 rounded-lg shrink-0">
                                <Sparkles size={18} className="text-cyan-400" />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-base font-black text-white truncate" title={conversationTitle || 'UniVerse AI'}>
                                    {conversationTitle || 'UniVerse AI'}
                                </h1>
                                <p className="text-[10px] text-cyan-400/70 uppercase tracking-wider">Yapay Zeka Asistanı</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Messages */}
                <div ref={scrollRef} className={`flex-1 min-h-0 overflow-y-auto px-4 py-6 ${SCROLLBAR_CYAN}`}>
                    <div className="max-w-3xl mx-auto w-full space-y-4">
                        {historyLoading && (
                            <div className="py-24 flex items-center justify-center">
                                <Loader2 size={28} className="text-cyan-400 animate-spin" />
                            </div>
                        )}

                        {!historyLoading && messages.length === 0 && !loading && (
                            <div className="flex flex-col items-center justify-center text-center px-4 py-24">
                                <div className="p-4 bg-cyan-500/10 rounded-3xl mb-4">
                                    <Sparkles size={40} className="text-cyan-400" />
                                </div>
                                <h2 className="text-2xl font-black text-white mb-2">
                                    Merhaba{firstName ? ` ${firstName}` : ''}! 👋
                                </h2>
                                <p className="text-base text-gray-400 leading-relaxed max-w-md">
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
                                            <div className="max-w-[80%] bg-cyan-600 text-white rounded-2xl rounded-br-md px-4 py-2.5 text-sm break-words">
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
                </div>

                {/* Input */}
                <div className="shrink-0 border-t border-white/10 bg-black/30 backdrop-blur-md p-4">
                    <div className="max-w-3xl mx-auto w-full">
                        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1 focus-within:border-cyan-500/50 transition-colors">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Bir şey sor..."
                                disabled={loading}
                                className="flex-1 min-w-0 bg-transparent py-2.5 text-sm text-gray-200 outline-none placeholder:text-gray-500 disabled:opacity-50"
                            />
                            <button
                                onClick={handleSend}
                                disabled={loading || !input.trim()}
                                className="p-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-white/5 disabled:text-gray-600 text-white rounded-lg transition-colors shrink-0"
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}