"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

interface Message {
    text: string;
    timestamp: string;
    sender: number;
    conversation_id: number;
    is_read?: boolean;
    file?: string | null;
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
        // Malformed URL — just render as a plain link
    }

    useEffect(() => {
        if (!productId) {
            setLoading(false);
            setError(true);
            return;
        }

        // Check cache first
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

    // Loading skeleton
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

    // Error or no product — fall back to clickable link
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
    
    // Check extension, optionally ignoring URL query parameters, or check Cloudinary specific paths
    const isVideo = file && (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(file) || file.includes('/video/upload/'));
    const isImage = file && (/\.(jpg|jpeg|png|gif|webp|svg|avif|heic)(\?.*)?$/i.test(file) || file.includes('/image/upload/'));

    return (
        <div style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }} className="flex flex-col gap-2">
            {file && (
                <div className="w-full max-w-[240px] sm:max-w-[200px] overflow-hidden rounded-lg mt-1">
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
                        <a href={file} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 underline break-all bg-black/10 p-3 rounded block text-center text-sm">
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                            View File
                        </a>
                    )}
                </div>
            )}
            {text && (
                <div>
                    {text.split(urlSplitRegex).map((part, i) => {
                        if (urlTestRegex.test(part)) {
                            if (part.includes("productId=")) {
                                return <ProductLinkPreview key={i} url={part} />;
                            } else {
                                return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline opacity-90 hover:opacity-100 break-all">{part}</a>;
                            }
                        }
                        if (!part) return null; // skip empty strings from split
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
                
                // Clear the URL params without reloading the page
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
            console.log("TOKEN:", user.access); // 👈 add this line
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
            if (ws) {
                ws.close();
            }
        };
    }, [user?.access]);

    // Handle incoming messages
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
                        // Clear the ref so we don't keep selecting it if conversations update
                        vendorIdParamRef.current = null;
                        textParamRef.current = null;
                    }
                }
                break;
            case 'my_messages':
                console.log("Messages received", data.messages);
                setMessages(data.messages || []);
                scrollToBottom(false);
                break;
            case 'new_message':
                const newMsg: Message = {
                    text: data.message || "",
                    file: data.file,
                    timestamp: data.timestamp,
                    sender: data.sender, // ID
                    conversation_id: data.conversation_id,
                    is_read: false
                };

                if (currentActiveConvId === data.conversation_id) {
                    setMessages(prev => [...prev, newMsg]);
                    scrollToBottom(true);
                    // If we are looking at this conversation, mark as read immediately
                    // Only mark if the sender is not us
                    if (data.sender !== user.user.id) {
                        if (ws && ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({
                                action: "mark_as_read",
                                conversation_id: data.conversation_id
                            }));
                        }
                    }
                }

                // Update conversation list preview and sort by newest message
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
                                    ? (c.unread_count || 0) + 1
                                    : 0 // Clear if we are actively looking at it
                            };
                        }
                        return c;
                    });
                    
                    // Sort descending (newest on top) based on the timestamp of the last message
                    return updatedConvs.sort((a, b) => {
                        const timeA = a.last_message?.timestamp ? new Date(a.last_message.timestamp).getTime() : 0;
                        const timeB = b.last_message?.timestamp ? new Date(b.last_message.timestamp).getTime() : 0;
                        return timeB - timeA;
                    });
                });
                break;
            case 'mark_chat':
                // Update read status for messages
                if (data.conversation_id === currentActiveConvId) {
                    // Logic: "Only update if the OTHER person is reading MY messages".
                    if (data.sender !== user.user.id) {
                        setMessages(prev => prev.map(m => m.sender === user.user.id ? { ...m, is_read: true } : m));
                    }
                }
                // Update conversation list sidebar
                if (data.sender !== user.user.id) {
                    setConversations(prev => prev.map(c => {
                        if (c.id === data.conversation_id && c.last_message && c.last_message.sender === user.user.id) {
                            return {
                                ...c,
                                last_message: { ...c.last_message, is_read: true }
                            };
                        }
                        return c;
                    }));
                }
                break;
            default:
                console.log("Unknown type", data.type);
        }
    };

    const selectConversation = (conv: Conversation, activeWs: WebSocket | null = socket) => {
        setActiveConversationId(conv.id);
        activeConversationIdRef.current = conv.id;

        // Mobile sidebar handling
        if (window.innerWidth <= 768) {
            setIsSidebarOpen(false);
        }

        // Fetch messages for this conversation
        if (activeWs && activeWs.readyState === WebSocket.OPEN) {
            activeWs.send(JSON.stringify({
                action: "get_message",
                conversation_id: conv.id
            }));

            // Mark as read
            activeWs.send(JSON.stringify({
                action: "mark_as_read",
                conversation_id: conv.id
            }));
        }

        // Reset unread count locally for UI
        setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c));

        if (statusTransitionTimerRef.current) {
            clearTimeout(statusTransitionTimerRef.current);
            statusTransitionTimerRef.current = null;
        }

        // Online Status logic
        if (conv.other_user.status) {
            setHeaderStatus("Online");
        } else {
            const lastSeenDate = new Date(conv.other_user.last_seen);
            // Show full date/time initially
            setHeaderStatus(lastSeenDate.toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }));

            // Transition to time-only after 3 seconds
            statusTransitionTimerRef.current = setTimeout(() => {
                setHeaderStatus(lastSeenDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
            }, 3000);
        }
    };

    const resetTextareaHeight = () => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
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
                headers: {
                    'Authorization': `Bearer ${user.access}`
                },
                body: formData
            });
            if (!res.ok) {
                console.error("Upload failed");
            }
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
        if (!text) {
            setMessageText("");
            resetTextareaHeight();
            return;
        }
        
        if (!activeConversationId || !socket) return;

        socket.send(JSON.stringify({
            action: "send_message",
            conversation_id: activeConversationId,
            message: text
        }));

        setMessageText("");
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

    // Close sidebar on click outside (mobile)
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (isSidebarOpen && sidebarRef.current && !sidebarRef.current.contains(e.target as Node) && !(e.target as Element).closest('#sidebarToggleBtn') && !(e.target as Element).closest('#sidebarToggleBtnDetail')) {
                setIsSidebarOpen(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [isSidebarOpen]);


    if (!user) return <div className="p-8">Please login...</div>;

    const activeConv = conversations.find(c => c.id === activeConversationId);

    return (
        <div className="flex h-[calc(100vh-70px)] overflow-hidden relative md:grid md:grid-cols-[300px_1fr]" ref={chatContainerRef}>
            <style>{`
                @keyframes popInMessage {
                    0% { opacity: 0; transform: translateY(16px) scale(0.98); }
                    100% { opacity: 1; transform: translateY(0) scale(1); }
                }
                .animate-pop-in {
                    animation: popInMessage 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.1) forwards;
                }
            `}</style>
            
            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 top-[70px] bg-black/40 z-40 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div 
                className={`fixed inset-y-0 left-0 top-[70px] bottom-0 w-[280px] sm:w-[85vw] sm:max-w-[300px] bg-white border-r border-[#e5e7eb] z-50 transition-transform duration-300 md:relative md:w-full md:inset-auto md:transform-none md:z-0 md:flex md:flex-col md:h-full ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
                ref={sidebarRef}
            >
                <div className="p-4 border-b border-[#e5e7eb] bg-white shrink-0 sticky top-0 z-50 md:static">
                    <h2 className="text-lg font-semibold">Messages</h2>
                </div>
                <div className="flex-1 overflow-y-auto overflow-x-hidden" id="conversationsList">
                    {conversations.length === 0 && !loading && (
                        <div className="p-5 text-center text-[#4b4b4b] text-sm">
                            No conversations yet
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
                                className={`relative flex items-center gap-3 p-3 cursor-pointer border-b border-[#e5e7eb] transition-colors duration-200 hover:bg-[#f4f6fa] ${activeConversationId === conv.id ? 'bg-[#f4f6fa] border-l-[3px] border-l-[#1c6ef2]' : ''}`}
                                onClick={() => selectConversation(conv)}
                            >
                                <img src={conv.other_user.profile_picture || '/placeholder.svg'} alt={conv.other_user.username} className="w-12 h-12 rounded-full object-cover shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="text-sm font-semibold text-[#1d1d1d] mb-1 truncate">{conv.other_user.username}</div>
                                        {(conv.unread_count || 0) > 0 && <span className="bg-[#ff4d4d] text-white rounded-full px-2 py-0.5 text-xs font-semibold ml-2 inline-block">{conv.unread_count}</span>}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-[#4b4b4b]">
                                        <span className="flex-1 min-w-0 truncate">
                                            {!conv.last_message ? "No messages yet" : (
                                                <>
                                                    {isSent && "You: "}
                                                    {conv.last_message.text ? conv.last_message.text : (conv.last_message.file ? "📷 Image" : "")}
                                                </>
                                            )}
                                        </span>
                                        <span className="shrink-0 text-[#4b4b4b] whitespace-nowrap opacity-95">{readStatus}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Main Chat */}
            <div className="flex flex-col bg-white h-full overflow-hidden relative w-full">
                {!activeConversationId ? (
                    <div className="flex flex-col items-center justify-center h-full text-[#4b4b4b]" id="chatEmpty">
                        <div className="flex items-center p-3 bg-[#ffb800] border-b border-[#e5e7eb] min-h-[56px] absolute top-0 left-0 w-full z-10 md:hidden">
                            <button className="flex items-center justify-center p-2 mr-2 text-xl cursor-pointer text-[#1d1d1d] hover:text-[#1c6ef2] transition-colors" id="sidebarToggleBtn" onClick={(e) => { e.stopPropagation(); setIsSidebarOpen(!isSidebarOpen); }}>
                                ☰
                            </button>
                        </div>
                        <div className="text-6xl mb-4">💬</div>
                        <p>Select a conversation to start chatting</p>
                    </div>
                ) : (
                    <div className="flex flex-col h-full overflow-hidden" id="chatView">
                        <div className="flex items-center justify-between p-4 border-b border-[#e5e7eb] bg-[#ffb800] shrink-0 min-h-[56px] md:justify-between sm:p-3">
                            <button className="flex md:hidden items-center justify-center p-2 mr-2 text-xl cursor-pointer text-[#1d1d1d] hover:text-[#1c6ef2] transition-colors shrink-0" id="sidebarToggleBtnDetail" onClick={(e) => { e.stopPropagation(); setIsSidebarOpen(!isSidebarOpen); }}>
                                ☰
                            </button>
                            <div className="flex items-center gap-3 cursor-pointer flex-1 min-w-0" onClick={() => router.push(`/vendor-profile?vendorId=${activeConv?.other_user.id}`)}>
                                <img src={activeConv?.other_user.profile_picture || '/placeholder.svg'} alt="User" className="w-10 h-10 rounded-full object-cover shrink-0 sm:w-9 sm:h-9" />
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-semibold text-[#1c6ef2] truncate">{activeConv?.other_user.username}</div>
                                    <div className="text-xs text-white truncate">{headerStatus}</div>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 flex flex-col gap-3 pb-4 sm:p-3 sm:gap-2" id="messagesList">
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
                                    <div key={idx} className={`animate-pop-in flex flex-col max-w-full ${isSent ? "items-end" : "items-start"} ${!showTimestamp ? '-mb-1.5 sm:-mb-1' : ''}`}>
                                        <div className={`p-3 px-3.5 rounded-xl text-sm leading-relaxed inline-block max-w-[70%] sm:max-w-[85%] ${isSent ? "bg-[#1c6ef2] text-white" : "bg-[#ffb800] text-gray-900"}`}><MessageContent text={msg.text} file={msg.file} onImageClick={setViewingImage} /></div>
                                        {showTimestamp && (
                                            <div className="text-[11px] text-[#4b4b4b] mt-1 ml-0.5 sm:text-[10px]">
                                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                {statusText}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="flex gap-2 p-4 border-t border-[#e5e7eb] bg-white shrink-0 sm:p-2.5 sm:gap-1.5 items-end">
                            <input type="file" ref={fileInputRef} hidden onChange={handleFileUpload} accept="video/*,image/*" />
                            <button 
                                className={`bg-[#f4f6fa] text-[#4b4b4b] w-[44px] h-[44px] rounded-xl flex items-center justify-center text-xl transition-colors duration-200 border-none sm:w-10 sm:h-10 shrink-0 ${isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#e5e7eb] cursor-pointer'}`}
                                onClick={() => !isUploading && fileInputRef.current?.click()}
                                title="Send video/image"
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
                                    e.target.style.height = `${e.target.scrollHeight}px`;
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        sendMessage();
                                    }
                                }}
                                rows={1}
                                placeholder="Type a message..."
                                className="flex-1 border border-[#e5e7eb] rounded-xl py-[10px] px-3.5 text-sm focus:outline-none focus:border-[#1c6ef2] sm:text-[13px] sm:py-2 resize-none overflow-y-auto max-h-[120px]"
                                style={{ minHeight: '44px' }}
                            />
                            <button 
                                className="bg-[#1c6ef2] text-white w-[44px] h-[44px] rounded-xl flex items-center justify-center text-lg hover:scale-105 transition-transform duration-300 cursor-pointer border-none sm:w-10 sm:h-10 sm:text-base shrink-0" 
                                onClick={() => sendMessage()}
                            >
                                
                                <span className="sr-only">Send</span>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* View Image Modal */}
            {viewingImage && (
                <div 
                    className="fixed inset-0 z-[1000] bg-black/90 flex items-center justify-center p-4 animate-fadeIn" 
                    onClick={() => setViewingImage(null)}
                >
                    <button 
                        className="absolute top-4 right-4 md:top-6 md:right-6 text-white w-10 h-10 flex items-center justify-center bg-black/50 rounded-full hover:bg-black/70 transition"
                        title="Close"
                        onClick={(e) => { e.stopPropagation(); setViewingImage(null); }}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                    <img 
                        src={viewingImage} 
                        alt="Zoomed Attachment" 
                        className="w-auto h-auto max-w-full max-h-full object-contain select-none"
                    />
                </div>
            )}
        </div>
    );
}
