"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { Home, Store, MessageSquare, PlusSquare, ShoppingCart, Wallet, User, LogIn, UserPlus, Search } from 'lucide-react';
import NotificationBell from './NotificationBell';

/**
 * Desktop-only left sidebar for the immersive home feed.
 * Collapsed to an icon rail; expands on hover to reveal labels and the full logo
 * (Instagram / TikTok / YouTube style). Hidden on mobile, where the top + bottom
 * nav bars are used instead.
 */
export default function LeftNav() {
    const { user } = useAuth();
    const pathname = usePathname();

    const [walletBalance, setWalletBalance] = useState<number>(0);
    const [cartCount, setCartCount] = useState<number>(0);
    const [profileAvatar, setProfileAvatar] = useState<string>('');

    // Kauchs the user follows, loaded from GET /kauch/following/.
    const [following, setFollowing] = useState<{ id: number; name: string; avatar_url?: string }[]>([]);

    const isVendor = (user?.user?.role || user?.role || '').toLowerCase() === 'vendor';

    useEffect(() => {
        if (!user?.access) return;
        const headers = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user.access}`,
        };

        fetch(`${process.env.NEXT_PUBLIC_API_URL}/wallet/getbalance/`, { headers })
            .then(r => (r.ok ? r.json() : null))
            .then(d => {
                if (d && d.balance !== undefined) {
                    setWalletBalance(typeof d.balance === 'string' ? parseFloat(d.balance) : d.balance);
                }
            })
            .catch(() => {});

        fetch(`${process.env.NEXT_PUBLIC_API_URL}/cart/cart-items/`, { headers })
            .then(r => (r.ok ? r.json() : null))
            .then(d => { if (d) setCartCount(d?.length || 0); })
            .catch(() => {});

        fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/users/me/`, { headers })
            .then(r => (r.ok ? r.json() : null))
            .then(d => { if (d) setProfileAvatar(d?.profile_url || d?.pfp || ''); })
            .catch(() => {});

        fetch(`${process.env.NEXT_PUBLIC_API_URL}/kauch/following/`, { headers })
            .then(r => (r.ok ? r.json() : null))
            .then(d => { if (Array.isArray(d)) setFollowing(d); })
            .catch(() => {});
    }, [user]);

    const navItems = [
        { href: '/', label: 'Feed', icon: Home, show: true, badge: 0 },
        { href: '/search', label: 'Search', icon: Search, show: true, badge: 0 },
        { href: '/marketplace', label: 'Marketplace', icon: Store, show: true, badge: 0 },
        { href: '/chat', label: 'Messages', icon: MessageSquare, show: true, badge: 0 },
        { href: '/kauch/create', label: 'Create', icon: PlusSquare, show: isVendor, badge: 0 },
        { href: '/cart', label: 'Cart', icon: ShoppingCart, show: true, badge: cartCount },
    ].filter(i => i.show);

    const itemBase = 'relative flex items-center gap-4 rounded-xl h-12 px-3 transition-colors';

    return (
        <aside className="group hidden md:flex fixed top-0 left-0 h-screen w-[72px] hover:w-[240px] bg-black border-r border-gray-800 z-[100] flex-col py-4 transition-[width] duration-300 ease-in-out overflow-hidden">
            {/* Logo: icon when collapsed, full wordmark when expanded */}
            <Link href="/" className="flex items-center h-[48px] px-4 mb-6 shrink-0" title="Home">
                <img src="/logo.png" alt="Kauchy" className="h-9 w-9 object-contain group-hover:hidden" />
                <div className="hidden group-hover:flex w-[144px] h-[48px] overflow-hidden items-center">
                    <img
                        src="/kauchy_logo_dark.png"
                        alt="Kauchy"
                        className="h-[140px] w-auto object-cover object-[30%_40%] max-w-none"
                    />
                </div>
            </Link>

            {/* Scrollable middle: primary nav + followed kauchs */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <nav className="flex flex-col gap-1 px-3">
                    {navItems.map(item => {
                        const Icon = item.icon;
                        const active = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                title={item.label}
                                className={`${itemBase} ${active ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
                            >
                                <span className="relative shrink-0">
                                    <Icon size={24} />
                                    {item.badge > 0 && (
                                        <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full border border-black">
                                            {item.badge}
                                        </span>
                                    )}
                                </span>
                                <span className="whitespace-nowrap text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Kauchs the user follows */}
                {following.length > 0 && (
                    <div className="mt-3 pt-3 px-3 border-t border-gray-800">
                        <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            Following
                        </p>
                        {following.map(k => (
                            <Link
                                key={k.id}
                                href={`/kauch/${k.id}`}
                                title={k.name}
                                className={`${itemBase} text-gray-300 hover:bg-white/5 hover:text-white`}
                            >
                                <span className="w-8 h-8 rounded-full overflow-hidden bg-zinc-700 shrink-0 flex items-center justify-center">
                                    {k.avatar_url
                                        ? <img src={k.avatar_url} alt={k.name} className="w-full h-full object-cover" />
                                        : <span className="text-xs font-bold text-gray-200">{k.name.charAt(0).toUpperCase()}</span>}
                                </span>
                                <span className="whitespace-nowrap text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    {k.name}
                                </span>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Notifications */}
            <div className="px-3">
                <NotificationBell />
            </div>

            {/* Wallet — only meaningful when signed in */}
            {user && (
                <Link href="/wallet" title="Wallet" className={`${itemBase} mx-3 text-amber-400 hover:bg-white/5`}>
                    <Wallet size={24} className="shrink-0" />
                    <span className="whitespace-nowrap text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        ₦{walletBalance}
                    </span>
                </Link>
            )}

            {/* Profile / account when signed in, Login + Sign Up when signed out */}
            {user ? (
                <Link
                    href="/account"
                    title="Profile"
                    className={`${itemBase} mx-3 mt-1 ${pathname === '/account' ? 'bg-white/10' : 'hover:bg-white/5'}`}
                >
                    <span className="w-8 h-8 rounded-full overflow-hidden bg-zinc-700 shrink-0 flex items-center justify-center">
                        {profileAvatar
                            ? <img src={profileAvatar} alt="Profile" className="w-full h-full object-cover" />
                            : <User size={18} className="text-gray-300" />}
                    </span>
                    <span className="whitespace-nowrap text-sm font-medium text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        Profile
                    </span>
                </Link>
            ) : (
                <div className="flex flex-col gap-2 px-3 mt-1">
                    {/* Login: icon-only when collapsed, becomes a full outlined button on hover */}
                    <Link
                        href="/login"
                        title="Login"
                        className={`${itemBase} text-gray-200 hover:bg-white/5 group-hover:border group-hover:border-gray-700 group-hover:justify-center`}
                    >
                        <LogIn size={24} className="shrink-0 group-hover:hidden" />
                        <span className="whitespace-nowrap text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            Login
                        </span>
                    </Link>
                    {/* Sign Up: the primary call-to-action, filled blue */}
                    <Link
                        href="/signup"
                        title="Sign Up"
                        className={`${itemBase} bg-blue-600 text-white hover:bg-blue-700 group-hover:justify-center`}
                    >
                        <UserPlus size={24} className="shrink-0 group-hover:hidden" />
                        <span className="whitespace-nowrap text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            Sign Up
                        </span>
                    </Link>
                </div>
            )}
        </aside>
    );
}
