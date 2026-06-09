"use client";
import React, { useEffect, useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { useAuth } from './AuthContext';

/**
 * App-wide blocking modal that appears whenever the signed-in user's profile
 * is incomplete (`profile_completed === false` — i.e. a Google sign-up that
 * still needs phone / university / role). It cannot be dismissed; the user
 * must finish the profile to use the app. Existing users (whose stored auth
 * object predates this flag) have `profile_completed === undefined`, so they
 * are never prompted.
 */
export default function CompleteProfileGate() {
    const { user, login } = useAuth();
    const profile = user?.user;
    const incomplete = !!profile && profile.profile_completed === false;

    const [username, setUsername] = useState('');
    const [phone, setPhone] = useState('');
    const [institute, setInstitute] = useState('');
    const [role, setRole] = useState('buyer');
    const [universities, setUniversities] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Prefill the username Google gave us once the gate becomes active.
    useEffect(() => {
        if (incomplete) setUsername(profile?.username || '');
    }, [incomplete, profile?.username]);

    // Load universities (same source as the signup page).
    useEffect(() => {
        if (!incomplete) return;
        fetch('https://university-domains-list-api-tn4l.onrender.com/search?country=Nigeria')
            .then((res) => res.json())
            .then((data) => setUniversities(Array.isArray(data) ? data : []))
            .catch(() => {});
    }, [incomplete]);

    if (!incomplete) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/complete-profile/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${user.access}`,
                },
                body: JSON.stringify({ username, phone, institute, role }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                const msg = data.username || data.phone || data.institute || data.role || data.detail || 'Could not save profile';
                throw new Error(Array.isArray(msg) ? msg[0] : msg);
            }
            // Merge the updated profile back into auth state (flips the flag,
            // persists to localStorage, and closes this modal).
            login({ ...user, user: data });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="dark fixed inset-0 z-[300] flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/80" aria-hidden="true" />

            <div
                role="dialog"
                aria-modal="true"
                aria-label="Complete your profile"
                className="relative w-full sm:w-[440px] max-h-[92vh] overflow-y-auto bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-2xl shadow-2xl p-6 sm:p-8"
            >
                <div className="flex flex-col items-center text-center gap-2 mb-6">
                    {profile?.profile_url
                        ? <img src={profile.profile_url} alt="" className="w-14 h-14 rounded-full object-cover" />
                        : <GraduationCap size={40} className="text-amber-400" />}
                    <h2 className="text-xl font-bold text-white">Complete your profile</h2>
                    <p className="text-sm text-gray-400 leading-relaxed max-w-[320px]">
                        Welcome{profile?.email ? `, ${profile.email}` : ''}! We just need a few more details
                        before you can start using Kauchy.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div>
                        <label className="block text-sm font-medium text-white mb-1.5">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Choose a username"
                            required
                            className="w-full px-3.5 py-3 border border-zinc-700 rounded-lg text-sm text-white bg-zinc-800 placeholder-gray-500 focus:outline-none focus:border-amber-400"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-white mb-1.5">Phone Number</label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="10-15 digits"
                            required
                            className="w-full px-3.5 py-3 border border-zinc-700 rounded-lg text-sm text-white bg-zinc-800 placeholder-gray-500 focus:outline-none focus:border-amber-400"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-white mb-1.5">University</label>
                        <select
                            value={institute}
                            onChange={(e) => setInstitute(e.target.value)}
                            required
                            className="w-full px-3.5 py-3 border border-zinc-700 rounded-lg text-sm text-white bg-zinc-800 focus:outline-none focus:border-amber-400"
                        >
                            <option value="">Select University</option>
                            {universities.map((uni, idx) => (
                                <option key={idx} value={uni.name}>{uni.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-white mb-1.5">Role</label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            required
                            className="w-full px-3.5 py-3 border border-zinc-700 rounded-lg text-sm text-white bg-zinc-800 focus:outline-none focus:border-amber-400"
                        >
                            <option value="buyer">Buyer</option>
                            <option value="vendor">Vendor</option>
                        </select>
                    </div>

                    {error && <p className="text-xs text-red-500">{error}</p>}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-amber-400 hover:bg-amber-500 text-white rounded-xl font-bold text-sm transition-colors shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Saving…' : 'Finish & Continue'}
                    </button>
                </form>
            </div>
        </div>
    );
}
