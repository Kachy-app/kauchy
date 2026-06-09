"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { AuthWall } from '@/context/AuthGateContext';
import { useTheme } from 'next-themes';
import { User, Package, Boxes, BarChart2, Wallet, Moon, Sun, LogOut, ChevronRight } from 'lucide-react';

export default function AccountPage() {
    const { user, logout, loading } = useAuth();
    const { theme, setTheme, systemTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const currentTheme = theme === 'system' ? systemTheme : theme;

    const [profile, setProfile] = useState<any>(null);
    const [walletBalance, setWalletBalance] = useState<number>(0);

    const isVendor = (user?.user?.role || user?.role || '').toLowerCase() === 'vendor';

    useEffect(() => {
        if (!user?.access) return;
        const headers = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user.access}`,
        };

        fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/users/me/`, { headers })
            .then(r => (r.ok ? r.json() : null))
            .then(d => { if (d) setProfile(d); })
            .catch(() => {});

        fetch(`${process.env.NEXT_PUBLIC_API_URL}/wallet/getbalance/`, { headers })
            .then(r => (r.ok ? r.json() : null))
            .then(d => {
                if (d && d.balance !== undefined) {
                    setWalletBalance(typeof d.balance === 'string' ? parseFloat(d.balance) : d.balance);
                }
            })
            .catch(() => {});
    }, [user]);

    if (!user) {
        return <AuthWall reason="view your account" loading={loading} />;
    }

    const username = profile?.username || user?.user?.username || user?.username || 'User';
    const role = profile?.role || user?.user?.role || user?.role || '';
    const avatar = profile?.profile_url || profile?.pfp || '/placeholder.svg';

    const links = [
        { href: '/profile', label: 'Edit Profile', icon: User, show: true },
        { href: '/orders', label: 'My Orders', icon: Package, show: true },
        { href: '/inventory', label: 'My Inventory', icon: Boxes, show: isVendor },
        { href: '/analytics', label: 'Analytics', icon: BarChart2, show: isVendor },
    ].filter(l => l.show);

    return (
        <main className="min-h-[calc(100dvh-135px)] md:min-h-screen bg-gray-50 dark:bg-zinc-950">
        <div className="max-w-[640px] mx-auto px-4 py-6 flex flex-col gap-5">
            {/* Header */}
            <div className="flex flex-col items-center text-center gap-3 pt-2">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 dark:bg-zinc-800 border-2 border-white dark:border-zinc-700 shadow">
                    <img src={avatar} alt={username} className="w-full h-full object-cover" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">{username}</h1>
                    {role && (
                        <span className="inline-block mt-1 bg-blue-600 text-white px-3 py-0.5 rounded-full text-xs font-semibold capitalize">{role}</span>
                    )}
                </div>
            </div>

            {/* Wallet */}
            <Link
                href="/wallet"
                className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 text-white shadow-sm hover:shadow-md transition-shadow"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                        <Wallet size={20} />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-white/80">Wallet Balance</p>
                        <p className="text-lg font-bold leading-tight">₦{walletBalance}</p>
                    </div>
                </div>
                <ChevronRight size={20} className="text-white/80" />
            </Link>

            {/* Account links */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden">
                {links.map((l, i) => {
                    const Icon = l.icon;
                    return (
                        <Link
                            key={l.href}
                            href={l.href}
                            className={`flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors ${i !== 0 ? 'border-t border-gray-100 dark:border-zinc-800' : ''}`}
                        >
                            <Icon size={20} className="text-blue-600 dark:text-blue-400 shrink-0" />
                            <span className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-100">{l.label}</span>
                            <ChevronRight size={18} className="text-gray-400" />
                        </Link>
                    );
                })}

                {/* Dark mode toggle */}
                <div className="flex items-center gap-3 px-4 py-3.5 border-t border-gray-100 dark:border-zinc-800">
                    {mounted && currentTheme === 'dark'
                        ? <Sun size={20} className="text-amber-500 shrink-0" />
                        : <Moon size={20} className="text-blue-600 dark:text-blue-400 shrink-0" />}
                    <span className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-100">Dark Mode</span>
                    {mounted && (
                        <button
                            onClick={() => setTheme(currentTheme === 'dark' ? 'light' : 'dark')}
                            role="switch"
                            aria-checked={currentTheme === 'dark'}
                            aria-label="Toggle dark mode"
                            className={`relative w-11 h-6 rounded-full transition-colors ${currentTheme === 'dark' ? 'bg-blue-600' : 'bg-gray-300'}`}
                        >
                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${currentTheme === 'dark' ? 'translate-x-5' : ''}`} />
                        </button>
                    )}
                </div>
            </div>

            {/* Logout */}
            <button
                onClick={logout}
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-semibold hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            >
                <LogOut size={20} /> Log Out
            </button>
        </div>
        </main>
    );
}
