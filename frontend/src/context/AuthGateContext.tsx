"use client";
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from './AuthContext';

interface AuthGateContextType {
    /**
     * Returns true if the user is authenticated. Otherwise opens a contextual
     * sign-up / log-in modal and returns false, so callers can early-return:
     *
     *   if (!requireAuth('like posts')) return;
     *
     * `reason` completes the sentence "… to <reason>" shown in the modal.
     */
    requireAuth: (reason?: string) => boolean;
}

const AuthGateContext = createContext<AuthGateContextType | undefined>(undefined);

export function AuthGateProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState<string | undefined>(undefined);

    const requireAuth = useCallback((nextReason?: string) => {
        if (user) return true;
        setReason(nextReason);
        setOpen(true);
        return false;
    }, [user]);

    const close = () => setOpen(false);

    // Send the user back to where they were after authenticating.
    const go = (path: string) => {
        const next =
            typeof window !== 'undefined'
                ? window.location.pathname + window.location.search
                : '/';
        close();
        router.push(`${path}?next=${encodeURIComponent(next)}`);
    };

    return (
        <AuthGateContext.Provider value={{ requireAuth }}>
            {children}

            {open && (
                <div className="dark fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/70 animate-fadeIn"
                        onClick={close}
                        aria-hidden="true"
                    />

                    {/* Card */}
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label="Sign in required"
                        className="relative w-full sm:w-[420px] bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-2xl shadow-2xl p-6 sm:p-8 animate-fadeIn"
                    >
                        <button
                            onClick={close}
                            className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:bg-zinc-800 hover:text-white transition-colors"
                            aria-label="Close"
                        >
                            <X size={20} />
                        </button>

                        <div className="flex flex-col items-center text-center gap-2 mb-6 pt-2">
                            <img src="/logo.png" alt="Kauchy" className="w-12 h-12 rounded-xl mb-2 object-contain" />
                            <h2 className="text-xl font-bold text-white">Join Kauchy</h2>
                            <p className="text-sm text-gray-400 leading-relaxed max-w-[300px]">
                                Create a free account or log in{reason ? ` to ${reason}` : ''} and unlock the full campus marketplace.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => go('/signup')}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-amber-400 hover:bg-amber-500 text-white rounded-xl font-bold text-sm transition-colors shadow-md"
                            >
                                <UserPlus size={18} />
                                Sign up
                            </button>
                            <button
                                onClick={() => go('/login')}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-semibold text-sm transition-colors border border-zinc-700"
                            >
                                <LogIn size={18} />
                                Log in
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AuthGateContext.Provider>
    );
}

export function useAuthGate() {
    const ctx = useContext(AuthGateContext);
    if (!ctx) throw new Error('useAuthGate must be used within an AuthGateProvider');
    return ctx;
}

/**
 * Full-page guard for routes that require a signed-in user (wallet, profile,
 * chat, …). Render this in place of the page body when there's no user:
 *
 *   const { user, loading } = useAuth();
 *   if (!user) return <AuthWall reason="access your wallet" loading={loading} />;
 *
 * While auth is still resolving it shows a neutral loading state. Once resolved
 * with no user it opens the shared sign-up / log-in modal (instead of doing a
 * hard redirect to /login) and shows a contextual prompt behind it.
 */
export function AuthWall({ reason, loading }: { reason?: string; loading?: boolean }) {
    const { requireAuth } = useAuthGate();

    useEffect(() => {
        if (!loading) requireAuth(reason);
    }, [loading, reason, requireAuth]);

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center text-gray-500 dark:text-gray-400">
                Loading…
            </div>
        );
    }

    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4 text-center">
            <img src="/logo.png" alt="Kauchy" className="w-12 h-12 rounded-xl object-contain opacity-80" />
            <p className="text-gray-600 dark:text-gray-300 max-w-[300px]">
                Sign in{reason ? ` to ${reason}` : ''} to continue.
            </p>
            <button
                onClick={() => requireAuth(reason)}
                className="flex items-center justify-center gap-2 py-2.5 px-6 bg-amber-400 hover:bg-amber-500 text-white rounded-xl font-bold text-sm transition-colors shadow-md"
            >
                <LogIn size={18} />
                Sign in
            </button>
        </div>
    );
}
