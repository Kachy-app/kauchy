"use client";
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { ShoppingCart, User, X, Bell, Home, Store, Wallet, MessageSquare, PlusSquare } from 'lucide-react';

type Notification = {
    id: number;
    title: string;
    message: string;
    notification_type: string;
    link?: string;
    is_read: boolean;
    created_at: string;
};

export default function Navbar() {
    const { user, loading, logout } = useAuth();
    const pathname = usePathname();
    const router = useRouter();
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

    // Dynamic data states
    const [walletBalance, setWalletBalance] = useState<number>(0);
    const [cartCount, setCartCount] = useState<number>(0);
    const [profileAvatar, setProfileAvatar] = useState<string>('');
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState<number>(0);

    const [searchQuery, setSearchQuery] = useState('');

    // Close dropdowns when clicking outside
    const profileRef = useRef<HTMLDivElement>(null);
    const notificationRef = useRef<HTMLDivElement>(null);
    const wsRef = useRef<WebSocket | null>(null);

    // Fetch dynamic data
    useEffect(() => {
        if (!user || !user.access) return;

        const fetchWallet = async () => {
            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/wallet/getbalance/`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${user.access}`
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data && data.balance !== undefined) {
                        setWalletBalance(typeof data.balance === 'string' ? parseFloat(data.balance) : data.balance);
                    }
                }
            } catch (error) {
                console.error("Error fetching wallet:", error);
            }
        };

        const fetchCart = async () => {
            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/cart/cart-items/`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${user.access}`,
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    setCartCount(data?.length || 0);
                }
            } catch (error) {
                console.error("Error fetching cart:", error);
            }
        };

        const fetchProfile = async () => {
            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/users/me/`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${user.access}`,
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    setProfileAvatar(data?.profile_url || data?.pfp || '');
                }
            } catch (error) {
                console.error("Error fetching profile:", error);
            }
        };

        fetchWallet();
        fetchCart();
        fetchProfile();
    }, [user]);

    // WebSocket connection for real-time notifications
    useEffect(() => {
        if (!user?.access) return;

        const wsHost = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
        const ws = new WebSocket(`${wsHost}/ws/notifications/?token=${user.access}`);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('Notification WebSocket connected');
            // Request all notifications on connect
            ws.send(JSON.stringify({ action: 'get_notification' }));
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.type === 'unread_count') {
                    setUnreadCount(data.count);
                } else if (data.type === 'notifications') {
                    setNotifications(data.notifications || []);
                } else if (data.type === 'new_notification') {
                    // Prepend new notification to list
                    setNotifications(prev => [data.notification, ...prev].slice(0, 20));
                }
            } catch (e) {
                console.error('Error parsing WebSocket message:', e);
            }
        };

        ws.onclose = () => {
            console.log('Notification WebSocket disconnected');
        };

        ws.onerror = (err) => {
            console.error('Notification WebSocket error:', err);
        };

        return () => {
            ws.close();
            wsRef.current = null;
        };
    }, [user?.access]);

    const handleNotificationClick = (notif: any) => {
        // Mark as read via WebSocket
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ action: 'mark_read', notification_id: notif.id }));
        }
        // Optimistically update local state
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
        
        // Hide popup
        setIsNotificationsOpen(false);

        // Redirect if there's a link (we pass link from backend for orders and likes)
        if (notif.link) {
            router.push(notif.link);
        } else if (notif.notification_type === 'message') {
            router.push('/chat');
        } else if (notif.notification_type === 'order') {
            router.push('/orders');
        }
    };

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setIsProfileOpen(false);
            }
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setIsNotificationsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const isVendor = (user?.user?.role || user?.role || '').toLowerCase() === 'vendor'; // Handle potentially different structures case-insensitively

    const showSearchBar = pathname === '/' || pathname === '/vendor-profile' || pathname === '/marketplace';
    const isFullWidthPage = pathname === '/chat' || pathname === '/orders' || pathname === '/cart' || pathname === '/';

    // Paint the top & bottom nav black (and lighten their foreground colors)
    // on the immersive home feed and the kauch content-creation flow.
    const isDarkNav = pathname === '/' || pathname === '/account'
        || pathname === '/marketplace' || pathname === '/vendor-profile' || pathname === '/chat' || pathname === '/profile'
        || pathname === '/wallet' || pathname === '/cart' || pathname === '/inventory' || pathname === '/orders' || pathname === '/analytics' || pathname.startsWith('/kauch');
    // The left sidebar rail is the sole navigation on desktop across all pages, so the
    // top header and bottom bar are both hidden on desktop. On mobile the rail is hidden
    // (it's `hidden md:flex`) and these two bars are the navigation instead.
    const hideHeaderOnDesktop = 'md:hidden';
    const hideBottomNavOnDesktop = 'md:hidden';
    const navIconClass = isDarkNav ? 'text-gray-200 hover:bg-white/10' : 'text-gray-700 hover:bg-gray-100';
    const bnActive = isDarkNav ? 'text-blue-500' : 'text-blue-600';
    const bnInactive = isDarkNav ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900';

    const isMarketplace = pathname === '/marketplace';
    const dynamicLink = isMarketplace ? '/' : '/marketplace';
    const dynamicLabel = isMarketplace ? 'Feed' : 'Marketplace';
    const dynamicIconDesktop = isMarketplace ? '📱' : '🛒';

    return (
        <>
        {/* TOP HEADER */}
        <header className={`fixed top-0 left-0 right-0 backdrop-blur-md border-b z-[100] py-[12px] px-[20px] shadow-legacy-nav h-[70px] ${hideHeaderOnDesktop} ${isDarkNav ? 'bg-black border-gray-800' : 'bg-[#f4f6fa] border-gray-200'}`}>
            <div className={`${isFullWidthPage ? '' : 'max-w-[1400px]'} mx-auto flex items-center justify-between gap-5 h-full`}>
                {/* Left Section: Logo */}
                <div className="shrink-0 flex items-center">
                    <Link href="/" className="flex items-center gap-2 no-underline font-bold text-blue-600 text-lg w-[144px] h-[48px] overflow-hidden" title="Home">
                        <img
                            src="/kauchy_logo_dark.png"
                            alt="Upstart"
                            className="h-[140px] w-auto object-cover object-[30%_40%] max-w-none"
                        />
                    </Link>
                </div>

                {/* Center Section: Search Bar (Desktop) */}
                {showSearchBar && (
                    <div className="hidden md:flex flex-1 max-w-[500px] items-center justify-center">
                        <div className="relative w-full">
                            <input
                                type="text"
                                className={`w-full h-[44px] pl-4 pr-10 rounded-full border text-sm transition-all focus:outline-none focus:border-blue-600 ${isDarkNav ? 'border-gray-700 bg-white/10 text-white placeholder:text-gray-400 focus:bg-white/15' : 'border-gray-200 bg-gray-50 text-gray-900 focus:bg-white'}`}
                                placeholder="Search products..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                        </div>
                    </div>
                )}

                {/* Right Section: Icons */}
                <div className="flex items-center gap-3">
                    {showSearchBar && (
                        <button className="hidden p-2 text-gray-600" title="Search">
                            🔍
                        </button>
                    )}

                    {user ? (
                        <>
                            {/* Analytics - Vendor Only */}
                            {isVendor && (
                                <div className="hidden md:block">
                                    <Link href="/analytics" className={`flex items-center gap-2 px-3 py-2 font-medium hover:text-blue-600 transition-colors ${isDarkNav ? 'text-gray-200' : 'text-gray-700'}`} title="Analytics">
                                        <span>📊 Analytics</span>
                                    </Link>
                                </div>
                            )}

                            {/* Wallet */}
                            <div className="block">
                                <Link href="/wallet" className="flex items-center gap-1.5 md:gap-2 px-2.5 py-1.5 md:px-4 md:py-2 bg-amber-400 text-white rounded-lg text-sm md:text-base font-medium hover:bg-amber-500 transition-colors decoration-0" title="Wallet">
                                    <Wallet size={18} className="shrink-0 md:w-5 md:h-5" />
                                    <span className="whitespace-nowrap">₦{walletBalance}</span>
                                </Link>
                            </div>

                            {/* Cart */}
                            <div className="relative">
                                <Link href="/cart" className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors relative ${navIconClass}`} title="Cart">
                                    <ShoppingCart size={22} />
                                    {cartCount > 0 && <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white">{cartCount}</span>}
                                </Link>
                            </div>

                            {/* Notifications Dropdown */}
                            <div className="relative" ref={notificationRef}>
                                <button className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors relative ${navIconClass}`} onClick={() => { setIsNotificationsOpen(!isNotificationsOpen); setIsProfileOpen(false); }} title="Notifications">
                                    <Bell size={22} />
                                    {unreadCount > 0 && <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-600 text-white text-[10px] font-bold rounded-full border-2 border-white">{unreadCount}</span>}
                                </button>
                                {isNotificationsOpen && (
                                    <div className={`${isDarkNav ? 'dark' : ''} fixed inset-x-0 top-[70px] sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-3 sm:w-80 bg-white dark:bg-zinc-900 sm:rounded-xl shadow-xl border-b sm:border border-gray-100 dark:border-zinc-800 overflow-hidden z-[200] animate-fadeIn`}>
                                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800">
                                            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Notifications</h3>
                                            <div className="flex items-center gap-2">
                                                {unreadCount > 0 && (
                                                    <button
                                                        onClick={() => {
                                                            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                                                                wsRef.current.send(JSON.stringify({ action: 'mark_all_read' }));
                                                            }
                                                            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
                                                            setUnreadCount(0);
                                                        }}
                                                        className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                                                    >
                                                        Mark all read
                                                    </button>
                                                )}
                                                {notifications.length > 0 && (
                                                    <>
                                                        {unreadCount > 0 && <span className="text-gray-300 dark:text-zinc-600">|</span>}
                                                        <button
                                                            onClick={() => {
                                                                notifications.forEach(n => {
                                                                    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                                                                        wsRef.current.send(JSON.stringify({ action: 'delete', notification_id: n.id }));
                                                                    }
                                                                });
                                                                setNotifications([]);
                                                                setUnreadCount(0);
                                                            }}
                                                            className="text-xs font-medium text-red-500 hover:text-red-700 transition-colors"
                                                        >
                                                            Clear all
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <div className="max-h-[60vh] sm:max-h-[300px] overflow-y-auto">
                                            {notifications.length === 0 ? (
                                                <p className="p-6 text-center text-gray-500 dark:text-gray-400 text-sm">No notifications</p>
                                            ) : (
                                                notifications.map((notif) => (
                                                    <div key={notif.id} className={`group relative p-4 border-b border-gray-100 dark:border-zinc-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors ${notif.is_read ? 'opacity-60' : 'bg-blue-50/30 dark:bg-blue-900/10'}`} onClick={() => handleNotificationClick(notif)}>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                                                                    wsRef.current.send(JSON.stringify({ action: 'delete', notification_id: notif.id }));
                                                                }
                                                                setNotifications(prev => prev.filter(n => n.id !== notif.id));
                                                                if (!notif.is_read) setUnreadCount(prev => Math.max(0, prev - 1));
                                                            }}
                                                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-400 hover:text-red-500 transition-all"
                                                            title="Remove"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                        <div className="flex items-start gap-2 pr-4">
                                                            <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${notif.is_read ? 'bg-transparent' : 'bg-blue-500'}`} />
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-xs font-semibold text-[#1c6ef2] mb-0.5">{notif.title}</p>
                                                                <p className="text-sm text-gray-800 dark:text-gray-200 mb-1 leading-snug">{notif.message}</p>
                                                                <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(notif.created_at).toLocaleDateString()}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Profile Dropdown */}
                            <div className="relative hidden md:block" ref={profileRef}>
                                <button className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors ${isDarkNav ? 'bg-white/10 text-gray-100 hover:bg-white/20' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`} onClick={() => setIsProfileOpen(!isProfileOpen)} title="Profile">
                                    <User size={20} />
                                </button>
                                {isProfileOpen && (
                                    <div className="absolute right-0 mt-3 w-48 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-fadeIn py-1">
                                        {pathname !== '/profile' && (
                                            <Link href="/profile" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600">View Profile</Link>
                                        )}
                                        {isVendor && pathname !== '/inventory' && (
                                            <Link href="/inventory" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600">My Inventory</Link>
                                        )}
                                        {pathname !== '/orders' && (
                                            <Link href="/orders" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600">Orders</Link>
                                        )}
                                        {pathname !== '/chat' && (
                                            <Link href="/chat" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600">Messages</Link>
                                        )}
                                        <div className="h-px bg-gray-100 my-1"></div>
                                        <button onClick={() => { setIsProfileOpen(false); logout(); }} className="w-full text-left flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">Logout</button>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="hidden md:flex items-center gap-3 ml-2">
                            <Link href="/login" className={`text-sm font-semibold hover:text-blue-600 px-3 py-2 ${isDarkNav ? 'text-gray-200' : 'text-gray-700'}`}>Login</Link>
                            <Link href="/signup" className="text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-5 py-2.5 rounded-full shadow-sm hover:shadow-md transition-all">Sign Up</Link>
                        </div>
                    )}
                </div>
            </div>
        </header>

        {/* BOTTOM NAVIGATION BAR */}
        <nav className={`fixed bottom-0 left-0 right-0 border-t z-[100] pb-safe ${hideBottomNavOnDesktop} ${isDarkNav ? 'bg-black border-gray-800 shadow-[0_-4px_10px_rgba(0,0,0,0.4)]' : 'bg-white border-gray-200 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]'}`}>
            <div className="max-w-[800px] mx-auto flex items-center justify-around h-[65px] px-2">
                <Link href="/" className={`flex flex-col items-center justify-center w-[60px] h-full transition-colors ${pathname === '/' ? bnActive : bnInactive}`}>
                    <Home size={22} className="mb-0.5" />
                    <span className="text-[10px] font-semibold">Feed</span>
                </Link>
                
                <Link href="/marketplace" className={`flex flex-col items-center justify-center w-[60px] h-full transition-colors ${pathname === '/marketplace' ? bnActive : bnInactive}`}>
                    <Store size={22} className="mb-0.5" />
                    <span className="text-[10px] font-semibold">Market</span>
                </Link>

                {isVendor && (
                    <Link href="/kauch/create" className={`flex flex-col items-center justify-center w-[60px] h-full transition-colors ${pathname === '/kauch/create' ? bnActive : bnInactive}`}>
                        <PlusSquare size={22} className="mb-0.5" />
                        <span className="text-[10px] font-semibold">Create</span>
                    </Link>
                )}

                <Link href="/chat" className={`flex flex-col items-center justify-center w-[60px] h-full transition-colors ${pathname === '/chat' ? bnActive : bnInactive}`}>
                    <MessageSquare size={22} className="mb-0.5" />
                    <span className="text-[10px] font-semibold">Messages</span>
                </Link>

                <Link
                    href={user ? '/account' : '/login'}
                    className={`flex flex-col items-center justify-center w-[60px] h-full transition-colors ${pathname === '/account' ? bnActive : bnInactive}`}
                >
                    {profileAvatar ? (
                        <span className={`w-6 h-6 rounded-full overflow-hidden mb-0.5 bg-gray-200 dark:bg-zinc-700 ${pathname === '/account' ? 'ring-2 ring-blue-500' : ''}`}>
                            <img src={profileAvatar} alt="Profile" className="w-full h-full object-cover" />
                        </span>
                    ) : (
                        <User size={22} className="mb-0.5" />
                    )}
                    <span className="text-[10px] font-semibold">Profile</span>
                </Link>
            </div>
        </nav>
        </>
    );
}
