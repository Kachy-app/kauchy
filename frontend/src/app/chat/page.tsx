"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Image as ImageIcon, X, Reply, Check, CheckCheck } from 'lucide-react';
import LoadingModal from '@/components/LoadingModal';

interface ReplyDetails {
    id: number;
    text: string | null;
    file: string | null;
    sender_name: string;
    sender_id: number;
}

interface Message {
    id?: number;
    text: string;
    timestamp: string;
    sender: number;
    conversation_id: number;
    is_read?: boolean;
    file?: string | null;
    reply_to_details?: ReplyDetails | null;
}

interface Conversation {
    id: number;
    unread_count?: number;
    last_message?: {
        text: string;
        timestamp: string;
        sender: number;
        is_read: boolean;
        file?: string | null;
    };
    other_user: {
        id: number;
        username: string;
        profile_picture: string;
        status: boolean; // Online status
        last_seen: string;
    };
    [key: string]: any;
}

const productCache: Record<string, any> = {};

const ProductLinkPreview = ({ url }: { url: string }) => {
    const [product, setProduct] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    let productId: string | null = null;
    try {
        productId = new URL(url).searchParams.get("productId");
    } catch {
        // Malformed URL
    }

    useEffect(() => {
        if (!productId) {
            setLoading(false);
            setError(true);
            return;
        }

        if (productCache[productId]) {
            setProduct(productCache[productId]);
            setLoading(false);
            return;
        }

        let cancelled = false;
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/${productId}`)
            .then(res => {
                if (!res.ok) throw new Error('Not found');
                return res.json();
            })
            .then(data => {
                if (!cancelled) {
                    productCache[productId!] = data;
                    setProduct(data);
                    setLoading(false);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setError(true);
                    setLoading(false);
                }
            });

        return () => { cancelled = true; };
    }, [productId]);

    if (loading) {
        return (
            <div className="mt-2 bg-white/80 rounded-xl border border-gray-100 max-w-[260px] overflow-hidden animate-pulse">
                <div className="h-[100px] bg-gray-200" />
                <div className="p-2.5 space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-3/4" />
                    <div className="h-2.5 bg-gray-200 rounded w-1/2" />
                </div>
            </div>
        );
    }

    if (error || !product || !product.product_name) {
        return <a href={url} target="_blank" rel="noopener noreferrer" className="underline opacity-90 hover:opacity-100 break-all">{url}</a>;
    }

    return (
        <div className="mt-2 text-black bg-white/95 rounded-xl shadow-sm border border-gray-100 cursor-pointer max-w-[260px] overflow-hidden transition-all hover:shadow-md" onClick={() => window.open(url, '_blank')}>
            <div className="h-[120px] bg-gray-50 overflow-hidden relative">
               <img src={(product.image_url && product.image_url[0]) || '/placeholder.svg'} className="w-full h-full object-cover" alt="Product" />
               <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded backdrop-blur-sm">
                   ₦{product.price}
               </div>
            </div>
            <div className="p-2.5 flex flex-col">
               <span className="font-semibold text-sm truncate leading-tight text-gray-900">{product.product_name}</span>
               <span className="text-[11px] text-gray-500 line-clamp-2 mt-1 leading-snug">{product.description || 'No description available'}</span>
            </div>
        </div>
    );
};

const MessageContent = ({ text, file, onImageClick }: { text?: string | null; file?: string | null; onImageClick?: (url: string) => void }) => {
    const urlSplitRegex = /(https?:\/\/[^\s]+)/g;
    const urlTestRegex = /^https?:\/\/[^\s]+$/;
    
    const isVideo = file && (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(file) || file.includes('/video/upload/'));
    const isImage = file && (/\.(jpg|jpeg|png|gif|webp|svg|avif|heic)(\?.*)?$/i.test(file) || file.includes('/image/upload/'));

    return (
        <div style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }} className="flex flex-col gap-2 relative z-10">
            {file && (
                <div className="w-full max-w-[240px] sm:max-w-[200px] overflow-hidden rounded-lg mt-1 shadow-md">
                    {isVideo ? (
                        <video src={file} controls className="w-full h-auto rounded-lg" />
                    ) : isImage ? (
                        <div 
                            onClick={() => onImageClick && onImageClick(file)}
                            className="block cursor-pointer hover:opacity-90 transition-opacity" 
                            title="Click to view full image"
                        >
                            <img src={file} alt="attachment" className="w-full h-auto object-cover rounded-lg" />
                        </div>
                    ) : (
                        <a href={file} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 underline break-all bg-black/10 p-3 rounded block text-center text-sm font-medium">
                            View File
                        </a>
                    )}
                </div>
            )}
            {text && (
                <div className="text-[15px] sm:text-[14px]">
                    {text.split(urlSplitRegex).map((part, i) => {
                        if (urlTestRegex.test(part)) {
                            if (part.includes("productId=")) {
                                return <ProductLinkPreview key={i} url={part} />;
                            } else {
                                return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline font-medium hover:opacity-80 break-all transition-opacity">{part}</a>;
                            }
                        }
                        if (!part) return null;
                        return <span key={i}>{part}</span>;
                    })}
                </div>
            )}
        </div>
    );
};

export default function ChatPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [messageText, setMessageText] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [viewingImage, setViewingImage] = useState<string | null>(null);
    
    // Reply State
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);

    // UI Refs
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const sidebarRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const activeConversationIdRef = useRef<number | null>(null);
    const statusTransitionTimerRef = useRef<NodeJS.Timeout | null>(null);

    const vendorIdParamRef = useRef<string | null>(null);
    const textParamRef = useRef<string | null>(null);

    const [headerStatus, setHeaderStatus] = useState<string>("Online");

    // Connect to WebSocket
    useEffect(() => {
        if (!user?.access) return;

        let ws: WebSocket | null = null;
        let cancelled = false;

        const initializeChat = async () => {
            if (typeof window !== 'undefined') {
                const params = new URLSearchParams(window.location.search);
                vendorIdParamRef.current = params.get('vendorId');
                textParamRef.current = params.get('text');
                
                if (vendorIdParamRef.current || textParamRef.current) {
                    window.history.replaceState({}, document.title, window.location.pathname);
                }
            }

            if (vendorIdParamRef.current) {
                try {
                    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/create/${vendorIdParamRef.current}`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${user.access}`,
                            'Content-Type': 'application/json'
                        }
                    });
                } catch (error) {
                    console.error("Error creating chat:", error);
                }
            }

            if (cancelled) return;

            const wsHost = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
            ws = new WebSocket(`${wsHost}/ws/chat/?token=${user.access}`);

            ws.onopen = () => {
                console.log("WS Connected");
                if (!cancelled) setLoading(false);
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (!cancelled) handleWebSocketMessage(data, ws!);
                } catch (e) {
                    console.error("WS Message Error", e);
                }
            };

            ws.onclose = () => {
                console.log("WS Closed");
            };

            if (!cancelled) setSocket(ws);
        };

        initializeChat();

        return () => {
            cancelled = true;
            if (ws) ws.close();
        };
    }, [user?.access]);

    const handleWebSocketMessage = (data: any, ws: WebSocket) => {
        const currentActiveConvId = activeConversationIdRef.current;
        switch (data.type) {
            case 'conversation_list':
                setConversations(data.conversations || []);
                
                if (vendorIdParamRef.current) {
                    const conv = data.conversations?.find((c: any) => c.other_user.id.toString() === vendorIdParamRef.current);
                    if (conv && !activeConversationIdRef.current) {
                        selectConversation(conv, ws);
                        if (textParamRef.current) {
                            setMessageText(textParamRef.current);
                        }
                        vendorIdParamRef.current = null;
                        textParamRef.current = null;
                    }
                }
                break;
            case 'my_messages':
                setMessages(data.messages || []);
                scrollToBottom(false);
                break;
            case 'new_message':
                const newMsg: Message = {
                    id: data.id,
                    text: data.message || "",
                    file: data.file,
                    timestamp: data.timestamp,
                    sender: data.sender,
                    conversation_id: data.conversation_id,
                    is_read: false,
                    reply_to_details: data.reply_to_details
                };

                if (currentActiveConvId === data.conversation_id) {
                    setMessages(prev => [...prev, newMsg]);
                    scrollToBottom(true);
                    if (data.sender !== user.user.id && ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ action: "mark_as_read", conversation_id: data.conversation_id }));
                    }
                }

                setConversations(prev => {
                    const updatedConvs = prev.map(c => {
                        if (c.id === data.conversation_id) {
                            return {
                                ...c,
                                last_message: {
                                    text: data.message || "",
                                    file: data.file,
                                    timestamp: data.timestamp,
                                    sender: data.sender,
                                    is_read: false
                                },
                                unread_count: (data.sender !== user.user.id && currentActiveConvId !== data.conversation_id)
                                    ? (c.unread_count || 0) + 1 : 0
                            };
                        }
                        return c;
                    });
                    
                    return updatedConvs.sort((a, b) => {
                        const timeA = a.last_message?.timestamp ? new Date(a.last_message.timestamp).getTime() : 0;
                        const timeB = b.last_message?.timestamp ? new Date(b.last_message.timestamp).getTime() : 0;
                        return timeB - timeA;
                    });
                });
                break;
            case 'mark_chat':
                if (data.conversation_id === currentActiveConvId) {
                    if (data.sender !== user.user.id) {
                        setMessages(prev => prev.map(m => m.sender === user.user.id ? { ...m, is_read: true } : m));
                    }
                }
                if (data.sender !== user.user.id) {
                    setConversations(prev => prev.map(c => {
                        if (c.id === data.conversation_id && c.last_message && c.last_message.sender === user.user.id) {
                            return { ...c, last_message: { ...c.last_message, is_read: true } };
                        }
                        return c;
                    }));
                }
                break;
        }
    };

    const selectConversation = (conv: Conversation, activeWs: WebSocket | null = socket) => {
        setActiveConversationId(conv.id);
        activeConversationIdRef.current = conv.id;
        setReplyingTo(null);

        if (window.innerWidth <= 768) setIsSidebarOpen(false);

        if (activeWs && activeWs.readyState === WebSocket.OPEN) {
            activeWs.send(JSON.stringify({ action: "get_message", conversation_id: conv.id }));
            activeWs.send(JSON.stringify({ action: "mark_as_read", conversation_id: conv.id }));
        }

        setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c));

        if (statusTransitionTimerRef.current) {
            clearTimeout(statusTransitionTimerRef.current);
            statusTransitionTimerRef.current = null;
        }

        if (conv.other_user.status) {
            setHeaderStatus("Online");
        } else {
            const lastSeenDate = new Date(conv.other_user.last_seen);
            setHeaderStatus(lastSeenDate.toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }));

            statusTransitionTimerRef.current = setTimeout(() => {
                setHeaderStatus(lastSeenDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
            }, 3000);
        }
    };

    const resetTextareaHeight = () => {
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !activeConversationId || !user) return;
        
        setIsUploading(true);
        const formData = new FormData();
        formData.append("conversation_id", activeConversationId.toString());
        formData.append("file", file);

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/upload/`, {
                method: "POST",
                headers: { 'Authorization': `Bearer ${user.access}` },
                body: formData
            });
            if (!res.ok) console.error("Upload failed");
        } catch (err) {
            console.error("Upload error", err);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const sendMessage = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        
        const text = messageText.trim();
        if (!text && !replyingTo) {
            setMessageText("");
            resetTextareaHeight();
            return;
        }
        
        if (!activeConversationId || !socket) return;

        socket.send(JSON.stringify({
            action: "send_message",
            conversation_id: activeConversationId,
            message: text,
            reply_to_id: replyingTo?.id || null
        }));

        setMessageText("");
        setReplyingTo(null);
        resetTextareaHeight();
    };

    const scrollToBottom = (smooth = false) => {
        setTimeout(() => {
            const list = document.getElementById("messagesList");
            if (list) {
                list.scrollTo({
                    top: list.scrollHeight,
                    behavior: smooth ? 'smooth' : 'auto'
                });
            }
        }, 100);
    };

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (isSidebarOpen && sidebarRef.current && !sidebarRef.current.contains(e.target as Node) && !(e.target as Element).closest('#sidebarToggleBtn') && !(e.target as Element).closest('#sidebarToggleBtnDetail')) {
                setIsSidebarOpen(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [isSidebarOpen]);

    if (!user) return <div className="flex items-center justify-center h-screen bg-[#f4f6fa] text-[#1d1d1d]">Please login...</div>;

    const activeConv = conversations.find(c => c.id === activeConversationId);

    return (
        <div className="flex h-[calc(100vh-70px)] overflow-hidden relative md:grid md:grid-cols-[300px_1fr] bg-gradient-to-br from-blue-50/50 via-white to-amber-50/50" ref={chatContainerRef}>
            {loading && <LoadingModal />}
            
            {/* Mobile Overlay */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 top-[70px] bg-black/40 backdrop-blur-sm z-40 md:hidden"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <div 
                className={`fixed inset-y-0 left-0 top-[70px] bottom-0 w-[85vw] max-w-[300px] bg-white/70 backdrop-blur-xl border-r border-white/50 z-50 transition-transform duration-300 md:relative md:w-full md:inset-auto md:transform-none md:z-0 md:flex md:flex-col md:h-full shadow-[4px_0_24px_rgba(0,0,0,0.02)] ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
                ref={sidebarRef}
            >
                <div className="p-4 border-b border-white/50 bg-white/40 backdrop-blur-md shrink-0 sticky top-0 z-50 md:static">
                    <h2 className="text-lg font-semibold text-[#1d1d1d]">Messages</h2>
                </div>
                <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar" id="conversationsList">
                    {conversations.length === 0 && !loading && (
                        <div className="p-5 text-center text-[#4b4b4b] text-sm">
                            No conversations yet. Discover products to start chatting!
                        </div>
                    )}

                    {conversations.map(conv => {
                        const isSent = conv.last_message?.sender === user.user.id;
                        let readStatus = '';
                        if (isSent && conv.last_message) {
                            readStatus = conv.last_message.is_read ? "Seen" : "Delivered";
                        }

                        return (
                            <div
                                key={conv.id}
                                className={`relative flex items-center gap-3 p-3 cursor-pointer border-b border-white/30 transition-all duration-200 hover:bg-white/60 ${activeConversationId === conv.id ? 'bg-white/80 border-l-[3px] border-l-[#1c6ef2] shadow-sm' : ''}`}
                                onClick={() => selectConversation(conv)}
                            >
                                <div className="relative">
                                    <img src={conv.other_user.profile_picture || '/placeholder.svg'} alt={conv.other_user.username} className="w-12 h-12 rounded-full object-cover shrink-0" />
                                    {conv.other_user.status && (
                                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                        <div className="text-sm font-semibold text-[#1d1d1d] truncate">{conv.other_user.username}</div>
                                        {(conv.unread_count || 0) > 0 && <span className="bg-[#ff4d4d] text-white rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider ml-2 inline-block">{conv.unread_count}</span>}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-[#4b4b4b]">
                                        <span className="flex-1 min-w-0 truncate">
                                            {!conv.last_message ? "No messages yet" : (
                                                <>
                                                    {isSent && <span className="mr-1">You:</span>}
                                                    {conv.last_message.text ? conv.last_message.text : (conv.last_message.file ? "📷 Image/Video" : "")}
                                                </>
                                            )}
                                        </span>
                                        <span className={`shrink-0 whitespace-nowrap opacity-95 ${conv.last_message?.is_read ? 'text-[#1c6ef2] font-semibold' : ''}`}>{readStatus}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Main Chat */}
            <div className="flex flex-col bg-transparent h-full overflow-hidden relative w-full">
                {!activeConversationId ? (
                    <div className="flex flex-col items-center justify-center h-full text-[#4b4b4b]" id="chatEmpty">
                        <div className="flex items-center p-3 bg-[#ffb800]/90 backdrop-blur-md border-b border-white/20 min-h-[56px] absolute top-0 left-0 w-full z-10 md:hidden">
                            <button className="flex items-center justify-center p-2 mr-2 text-xl cursor-pointer text-[#1d1d1d] hover:text-white transition-colors" id="sidebarToggleBtn" onClick={(e) => { e.stopPropagation(); setIsSidebarOpen(!isSidebarOpen); }}>
                                ☰
                            </button>
                        </div>
                        <div className="w-24 h-24 mb-6 rounded-full bg-white/60 flex items-center justify-center backdrop-blur-xl shadow-lg border border-white/50">
                            <span className="text-4xl drop-shadow-sm">💬</span>
                        </div>
                        <p className="text-lg font-medium">Select a conversation to start chatting</p>
                    </div>
                ) : (
                    <div className="flex flex-col h-full overflow-hidden relative z-10" id="chatView">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-white/20 bg-[#ffb800]/95 backdrop-blur-xl shrink-0 min-h-[64px] md:justify-between sm:p-3 shadow-sm z-20">
                            <div className="flex items-center flex-1 min-w-0">
                                <button className="flex md:hidden items-center justify-center p-2 mr-2 text-xl cursor-pointer text-[#1d1d1d] hover:text-white transition-colors shrink-0" id="sidebarToggleBtnDetail" onClick={(e) => { e.stopPropagation(); setIsSidebarOpen(!isSidebarOpen); }}>
                                    ☰
                                </button>
                                <div className="flex items-center gap-3 cursor-pointer flex-1 min-w-0 hover:opacity-90 transition-opacity bg-white/10 px-2 py-1.5 -ml-2 rounded-xl" onClick={() => router.push(`/vendor-profile?vendorId=${activeConv?.other_user.id}`)}>
                                    <div className="relative">
                                        <img src={activeConv?.other_user.profile_picture || '/placeholder.svg'} alt="User" className="w-10 h-10 rounded-full object-cover shrink-0 sm:w-9 sm:h-9 shadow-sm" />
                                        {activeConv?.other_user.status && (
                                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border border-[#ffb800] rounded-full" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-bold text-[#1c6ef2] truncate">{activeConv?.other_user.username}</div>
                                        <div className={`text-xs truncate ${headerStatus === 'Online' ? 'text-[#1c6ef2] font-semibold' : 'text-white'}`}>{headerStatus}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Messages List */}
                        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 flex flex-col gap-3 pb-4 sm:p-3 sm:gap-2 custom-scrollbar scroll-smooth relative" id="messagesList">
                            {messages.map((msg, idx) => {
                                const isSent = msg.sender === user.user.id;
                                const lastSentIdx = messages.map(m => m.sender).lastIndexOf(user.user.id);
                                const isLastSentMessage = isSent && idx === lastSentIdx;
                                
                                let statusText = "";
                                if (isLastSentMessage) {
                                    statusText = msg.is_read ? " • Seen" : " • Delivered";
                                }
                                
                                const nextMsg = messages[idx + 1];
                                let showTimestamp = true;
                                if (nextMsg && nextMsg.sender === msg.sender) {
                                    const currDate = new Date(msg.timestamp);
                                    const nextDate = new Date(nextMsg.timestamp);
                                    if (currDate.getHours() === nextDate.getHours() && currDate.getMinutes() === nextDate.getMinutes()) {
                                        showTimestamp = false;
                                    }
                                }
                                if (statusText) showTimestamp = true;

                                return (
                                    <motion.div 
                                        key={msg.id || idx} 
                                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                        className={`flex flex-col max-w-full relative group ${isSent ? "items-end" : "items-start"} ${!showTimestamp ? '-mb-1.5 sm:-mb-1' : ''}`}
                                    >
                                        <div className={`flex items-center gap-2 max-w-[85%] sm:max-w-[85%]`}>
                                            
                                            {/* Reply Button (Left Side for Sent) */}
                                            {isSent && (
                                                <button 
                                                    onClick={() => setReplyingTo(msg)}
                                                    className="opacity-0 group-hover:opacity-100 p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-all focus:opacity-100 outline-none"
                                                    title="Reply"
                                                >
                                                    <Reply size={16} />
                                                </button>
                                            )}

                                            {/* Swipeable Message Bubble */}
                                            <motion.div 
                                                drag="x"
                                                dragConstraints={{ left: 0, right: 0 }}
                                                dragElastic={0.1}
                                                onDragEnd={(e, info) => {
                                                    if ((isSent && info.offset.x < -40) || (!isSent && info.offset.x > 40)) {
                                                        setReplyingTo(msg);
                                                    }
                                                }}
                                                className={`p-3 px-3.5 rounded-xl text-sm leading-relaxed relative overflow-hidden shadow-sm backdrop-blur-md border ${
                                                    isSent 
                                                        ? "bg-[#1c6ef2]/90 border-blue-400/30 text-white shadow-blue-500/10" 
                                                        : "bg-[#ffb800]/90 border-amber-300/30 text-gray-900 shadow-amber-500/10"
                                                }`}
                                            >
                                                {msg.reply_to_details && (
                                                    <div 
                                                        className={`mb-2 p-2 rounded-lg text-xs border-l-4 cursor-pointer hover:brightness-95 transition-all backdrop-blur-md ${
                                                            isSent ? "bg-black/10 border-white/50 text-white" : "bg-white/30 border-white text-gray-900 shadow-[inset_0_1px_4px_rgba(255,255,255,0.4)]"
                                                        }`}
                                                    >
                                                        <div className="font-bold mb-0.5 text-[10px] uppercase tracking-wider text-inherit opacity-80">
                                                            {msg.reply_to_details.sender_id === user.user.id ? 'You' : msg.reply_to_details.sender_name}
                                                        </div>
                                                        <div className="line-clamp-2 opacity-90 leading-snug">
                                                            {msg.reply_to_details.file ? "📷 Attachment" : msg.reply_to_details.text}
                                                        </div>
                                                    </div>
                                                )}

                                                <MessageContent text={msg.text} file={msg.file} onImageClick={setViewingImage} />
                                            </motion.div>

                                            {/* Reply Button (Right Side for Received) */}
                                            {!isSent && (
                                                <button 
                                                    onClick={() => setReplyingTo(msg)}
                                                    className="opacity-0 group-hover:opacity-100 p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-all focus:opacity-100 outline-none"
                                                    title="Reply"
                                                >
                                                    <Reply size={16} className="-scale-x-100" />
                                                </button>
                                            )}

                                        </div>

                                        {showTimestamp && (
                                            <div className="flex items-center gap-1 text-[11px] text-[#4b4b4b] mt-1 px-1 sm:text-[10px]">
                                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                {statusText}
                                            </div>
                                        )}
                                    </motion.div>
                                );
                            })}
                            <div ref={messagesEndRef} className="h-2" />
                        </div>

                        {/* Input Area */}
                        <div className="flex flex-col bg-white/70 backdrop-blur-xl border-t border-white/60 relative z-20 shadow-[0_-4px_24px_rgba(0,0,0,0.02)]">
                            
                            {/* Replying To Indicator */}
                            <AnimatePresence>
                                {replyingTo && (
                                    <motion.div 
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="bg-white/50 backdrop-blur-md border-b border-white/40 px-4 py-2 flex items-start justify-between"
                                    >
                                        <div className="flex-1 min-w-0 pr-4">
                                            <div className="text-xs font-bold text-[#1c6ef2] mb-0.5 flex items-center gap-1.5">
                                                <Reply size={12} className="-scale-x-100" />
                                                Replying to {replyingTo.sender === user.user.id ? 'yourself' : (activeConv?.other_user.username || 'User')}
                                            </div>
                                            <div className="text-[13px] text-[#4b4b4b] line-clamp-1 italic">
                                                {replyingTo.file ? "📷 Attachment" : replyingTo.text}
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => setReplyingTo(null)}
                                            className="p-1 rounded-full hover:bg-gray-200 text-gray-500 transition-colors"
                                        >
                                            <X size={16} />
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="flex gap-2 p-4 sm:p-2.5 sm:gap-1.5 items-end">
                                <input type="file" ref={fileInputRef} hidden onChange={handleFileUpload} accept="video/*,image/*" />
                                <button 
                                    className={`bg-white/60 backdrop-blur-sm text-[#1c6ef2] w-[44px] h-[44px] rounded-xl flex items-center justify-center text-xl transition-all duration-200 border border-white/60 shadow-sm sm:w-10 sm:h-10 shrink-0 ${isUploading ? 'opacity-50 cursor-not-allowed animate-pulse' : 'hover:bg-white/80 cursor-pointer hover:shadow-md'}`}
                                    onClick={() => !isUploading && fileInputRef.current?.click()}
                                    title="Send Attachment"
                                    disabled={isUploading}
                                >
                                    {isUploading ? '...' : '+'}
                                </button>
                                <textarea
                                    ref={textareaRef}
                                    value={messageText}
                                    onChange={(e) => {
                                        setMessageText(e.target.value);
                                        e.target.style.height = 'auto';
                                        e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            sendMessage();
                                        }
                                    }}
                                    rows={1}
                                    placeholder="Type a message..."
                                    className="flex-1 bg-white/60 backdrop-blur-sm border border-white/60 shadow-[inset_0_2px_4px_rgba(0,0,0,0.01)] rounded-xl py-[10px] px-3.5 text-sm text-[#1d1d1d] placeholder-gray-500/80 focus:outline-none focus:border-[#1c6ef2]/50 focus:bg-white/80 sm:text-[13px] sm:py-2 resize-none overflow-y-auto max-h-[120px] transition-all custom-scrollbar font-medium"
                                    style={{ minHeight: '44px' }}
                                />
                                <button 
                                    className={`w-[44px] h-[44px] rounded-xl flex items-center justify-center text-lg transition-all duration-300 border-none sm:w-10 sm:h-10 sm:text-base shrink-0 shadow-sm ${
                                        messageText.trim() || replyingTo 
                                            ? 'bg-[#1c6ef2]/90 backdrop-blur-md text-white hover:scale-105 cursor-pointer hover:shadow-blue-500/30 hover:shadow-lg' 
                                            : 'bg-white/50 backdrop-blur-sm text-gray-400 cursor-not-allowed border border-white/40'
                                    }`} 
                                    onClick={() => sendMessage()}
                                    disabled={!messageText.trim() && replyingTo === null}
                                >
                                    <Send size={16} className={`${messageText.trim() || replyingTo ? 'ml-0.5' : ''}`} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* View Image Modal */}
            <AnimatePresence>
                {viewingImage && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[1000] bg-black/90 flex items-center justify-center p-4" 
                        onClick={() => setViewingImage(null)}
                    >
                        <button 
                            className="absolute top-4 right-4 md:top-6 md:right-6 text-white w-10 h-10 flex items-center justify-center bg-black/50 rounded-full hover:bg-black/70 transition-all z-50 hover:scale-105"
                            onClick={(e) => { e.stopPropagation(); setViewingImage(null); }}
                        >
                            <X size={24} />
                        </button>
                        <motion.img 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            src={viewingImage} 
                            alt="Attachment" 
                            className="w-auto h-auto max-w-full max-h-full object-contain select-none shadow-2xl rounded-lg"
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
