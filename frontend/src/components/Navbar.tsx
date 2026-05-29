"use client";
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { Search, ShoppingCart, User, Menu, X, Bell, LogOut, LayoutDashboard, Package, Home, Trophy, BarChart2, Wallet, MessageSquare } from 'lucide-react';

type Notification = {
    id: number;
    title: string;
    message: string;
    notification_type: string;
    is_read: boolean;
    created_at: string;
};

export default function Navbar() {
    const { user, loading, logout } = useAuth();
    const pathname = usePathname();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

    // Dynamic data states
    const [walletBalance, setWalletBalance] = useState<number>(0);
    const [cartCount, setCartCount] = useState<number>(0);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState<number>(0);

    const [searchQuery, setSearchQuery] = useState('');

    // Close dropdowns when clicking outside
    const profileRef = useRef<HTMLDivElement>(null);
    const notificationRef = useRef<HTMLDivElement>(null);
    const mobileMenuRef = useRef<HTMLDivElement>(null);
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

        fetchWallet();
        fetchCart();
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

    const handleNotificationClick = (notifId: number) => {
        // Mark as read via WebSocket
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ action: 'mark_read', notification_id: notifId }));
        }
        // Optimistically update local state
        setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
    };

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setIsProfileOpen(false);
            }
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setIsNotificationsOpen(false);
            }
            if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node) && !(event.target as Element).closest('.mobile-menu-btn')) {
                setIsMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const isVendor = (user?.user?.role || user?.role || '').toLowerCase() === 'vendor'; // Handle potentially different structures case-insensitively

    const showSearchBar = pathname === '/' || pathname === '/vendor-profile';
    const isFullWidthPage = pathname === '/chat' || pathname === '/orders' || pathname === '/cart';

    return (
        <nav className="fixed top-0 left-0 right-0 bg-[#f4f6fa] backdrop-blur-md border-b border-gray-200 z-[100] py-[12px] px-[20px] shadow-legacy-nav h-[70px]">
            <div className={`${isFullWidthPage ? '' : 'max-w-[1400px]'} mx-auto flex items-center justify-between gap-5 h-full`}>
                {/* Left Section: Logo */}
                <div className="shrink-0 flex items-center">
                    <Link href="/" className="flex items-center gap-2 no-underline font-bold text-blue-600 text-lg w-[144px] h-[48px] overflow-hidden" title="Home">
                        <img
                            src="/kauchy_logo.png"
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
                                className="w-full h-[44px] pl-4 pr-10 rounded-full border border-gray-200 bg-gray-50 text-sm transition-all focus:outline-none focus:border-blue-600 focus:bg-white text-gray-900"
                                placeholder="Search products..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                        </div>
                    </div>
                )}

                {/* Right Section: Navigation Items */}
                <div className="flex items-center gap-3">

                    {/* Mobile Search Toggle */}
                    {showSearchBar && (
                        <button className="hidden p-2 text-gray-600" title="Search">
                            🔍
                        </button>
                    )}

                    {/* Leaderboard - Desktop Only (Always visible) */}
                    <div className="hidden md:block">
                        <Link href="/leaderboard" className="flex items-center gap-2 px-3 py-2 text-gray-700 font-medium hover:text-blue-600 transition-colors" title="Leaderboard">
                            <span>🏆 Leaderboard</span>
                        </Link>
                    </div>

                    {user ? (
                        <>
                            {/* Analytics - Vendor Only */}
                            {isVendor && (
                                <div className="hidden md:block">
                                    <Link href="/analytics" className="flex items-center gap-2 px-3 py-2 text-gray-700 font-medium hover:text-blue-600 transition-colors" title="Analytics">
                                        <span>📊 Analytics</span>
                                    </Link>
                                </div>
                            )}

                            {/* Wallet */}
                            <div className="hidden md:block">
                                <Link href="/wallet" className="flex items-center gap-2 px-4 py-2 bg-amber-400 text-white rounded-lg font-medium hover:bg-amber-500 transition-colors decoration-0" title="Wallet">
                                    <Wallet size={20} />
                                    <span>₦{walletBalance}</span>
                                </Link>
                            </div>

                            {/* Cart */}
                            <div className="relative">
                                <Link href="/cart" className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 text-gray-700 transition-colors relative" title="Cart">
                                    <ShoppingCart size={22} />
                                    {cartCount > 0 && <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white">{cartCount}</span>}
                                </Link>
                            </div>

                            {/* Notifications Dropdown */}
                            <div className="relative" ref={notificationRef}>
                                <button className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 text-gray-700 transition-colors relative" onClick={() => setIsNotificationsOpen(!isNotificationsOpen)} title="Notifications">
                                    <Bell size={22} />
                                    {unreadCount > 0 && <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-600 text-white text-[10px] font-bold rounded-full border-2 border-white">{unreadCount}</span>}
                                </button>
                                {isNotificationsOpen && (
                                    <div className="absolute right-0 mt-3 w-80 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-fadeIn">
                                        <div className="max-h-[300px] overflow-y-auto">
                                            {notifications.length === 0 ? (
                                                <p className="p-6 text-center text-gray-500 text-sm">No notifications</p>
                                            ) : (
                                                notifications.map((notif) => (
                                                    <div key={notif.id} className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${notif.is_read ? 'opacity-60' : 'bg-blue-50/30'}`} onClick={() => handleNotificationClick(notif.id)}>
                                                        <p className="text-xs font-semibold text-[#1c6ef2] mb-0.5">{notif.title}</p>
                                                        <p className="text-sm text-gray-800 mb-1 leading-snug">{notif.message}</p>
                                                        <span className="text-xs text-gray-500">{new Date(notif.created_at).toLocaleDateString()}</span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Profile Dropdown */}
                            <div className="relative hidden md:block" ref={profileRef}>
                                <button className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors" onClick={() => setIsProfileOpen(!isProfileOpen)} title="Profile">
                                    <User size={20} />
                                </button>
                                {isProfileOpen && (
                                    <div className="absolute right-0 mt-3 w-48 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-fadeIn py-1">
                                        <Link href="/profile" className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600">View Profile</Link>
                                        {isVendor && (
                                            <Link href="/inventory" className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600">My Inventory</Link>
                                        )}
                                        <Link href="/orders" className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600">Orders</Link>
                                        <Link href="/chat" className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600">Messages</Link>
                                        <div className="h-px bg-gray-100 my-1"></div>
                                        <button onClick={logout} className="w-full text-left flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">Logout</button>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="hidden md:flex items-center gap-3 ml-2">
                            <Link href="/login" className="text-sm font-semibold text-gray-700 hover:text-blue-600 px-3 py-2">Login</Link>
                            <Link href="/signup" className="text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-5 py-2.5 rounded-full shadow-sm hover:shadow-md transition-all">Sign Up</Link>
                        </div>
                    )}

                    {/* Mobile Menu Button - Right */}
                    <button className="md:hidden p-2 text-gray-900 hover:text-blue-600 ml-1" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                        {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu Dropdown */}
            {isMenuOpen && (
                <div className="absolute top-[70px] left-0 w-full bg-white border-b border-gray-200 shadow-xl z-40 flex flex-col p-4 gap-2 md:hidden animate-fadeIn" ref={mobileMenuRef}>

                    {user ? (
                        <>
                            <Link href="/profile" className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg" onClick={() => setIsMenuOpen(false)}>
                                <User size={20} /> <span>Profile</span>
                            </Link>
                            <Link href="/leaderboard" className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg" onClick={() => setIsMenuOpen(false)}>
                                <Trophy size={20} /> <span>Leaderboard</span>
                            </Link>
                            <Link href="/orders" className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg" onClick={() => setIsMenuOpen(false)}>
                                <Package size={20} /> <span>Orders</span>
                            </Link>

                            {isVendor && (
                                <>
                                    <Link href="/analytics" className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg" onClick={() => setIsMenuOpen(false)}>
                                        <BarChart2 size={20} /> <span>Analytics</span>
                                    </Link>
                                    <Link href="/inventory" className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg" onClick={() => setIsMenuOpen(false)}>
                                        <Package size={20} /> <span>My Inventory</span>
                                    </Link>
                                </>
                            )}

                            <Link href="/chat" className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg" onClick={() => setIsMenuOpen(false)}>
                                <MessageSquare size={20} /> <span>Messages</span>
                            </Link>
                            <div className="h-px bg-gray-100 my-1"></div>
                            <button onClick={logout} className="w-full text-left flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg">
                                <LogOut size={20} /> <span>Logout</span>
                            </button>
                        </>
                    ) : (
                        <>
                            <Link href="/leaderboard" className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg" onClick={() => setIsMenuOpen(false)}>
                                <Trophy size={20} /> <span>Leaderboard</span>
                            </Link>
                            <div className="h-px bg-gray-100 my-1"></div>
                            <Link href="/login" className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg" onClick={() => setIsMenuOpen(false)}>
                                <span>🔑</span> <span>Login</span>
                            </Link>
                            <Link href="/signup" className="flex items-center gap-3 px-4 py-3 text-blue-600 font-semibold hover:bg-blue-50 rounded-lg" onClick={() => setIsMenuOpen(false)}>
                                <span>✍️</span> <span>Sign Up</span>
                            </Link>
                        </>
                    )}
                </div>
            )}
        </nav>
    );
}
