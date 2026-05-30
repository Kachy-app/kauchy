"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import LoadingModal from '@/components/LoadingModal';
import { UserProfile, University } from '@/types';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';


export default function ProfilePage() {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<{ bio: string; institute: string }>({ bio: '', institute: '' });
    const [universities, setUniversities] = useState<University[]>([]);

    const { theme, setTheme, systemTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const currentTheme = theme === 'system' ? systemTheme : theme;

    useEffect(() => {
        if (user) {
            fetchProfile();
            fetchUniversities();
        } else {
            const timer = setTimeout(() => setLoading(false), 500);
            return () => clearTimeout(timer);
        }
    }, [user]);

    const fetchProfile = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/users/me/`, {
                headers: { Authorization: `Bearer ${user.access}` }
            });
            if (res.ok) {
                const data: UserProfile = await res.json();
                setProfile(data);
            } else {
                setProfile(user.user as unknown as UserProfile);
            }
        } catch (e) {
            setProfile(user.user as unknown as UserProfile);
        } finally {
            setLoading(false);
        }
    };

    const fetchUniversities = async () => {
        try {
            const res = await fetch('https://university-domains-list-api-tn4l.onrender.com/search?country=Nigeria');
            if (res.ok) {
                const data: University[] = await res.json();
                if (data.length === 0) {
                    showToast('No universities available', 'error');
                } else {
                    setUniversities(data);
                }
            } else {
                showToast("Failed to load universities", "error");
            }
        } catch (e) {
            showToast("Failed to load universities", "error");
        }
    };

    const startEdit = () => {
        if (!profile) return;
        setEditForm({
            bio: profile.bio || '',
            institute: profile.institute || ''
        });
        setIsEditing(true);
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/users/me/`, {
                method: 'PATCH',
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${user.access}`
                },
                body: JSON.stringify(editForm)
            });

            if (res.ok) {
                const updated: Partial<UserProfile> = await res.json();
                setProfile(prev => prev ? { ...prev, ...updated } : null);
                setIsEditing(false);
                showToast("Profile updated successfully!", "success");
            } else {
                const error = await res.json();
                showToast(error.detail || "Update failed", "error");
            }
        } catch (e) {
            console.error(e);
            showToast("Error updating profile", "error");
        } finally {
            setLoading(false);
        }
    };

    const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showToast('Please select a valid image file.', 'error');
            e.target.value = '';
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            showToast('Image size must be less than 5MB.', 'error');
            e.target.value = '';
            return;
        }

        const formData = new FormData();
        formData.append('profile_picture', file);

        setLoading(true);

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/users/me/`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${user.access}` },
                body: formData
            });
            if (res.ok) {
                const updated: Partial<UserProfile> = await res.json();
                setProfile(prev => prev && updated.profile_url ? { ...prev, profile_url: updated.profile_url } : prev);
                showToast("Profile picture updated successfully!", "success");
            } else {
                const error = await res.json();
                showToast(error.detail || "Photo upload failed", "error");
            }
        } catch (e) {
            showToast("Photo upload failed", "error");
        } finally {
            setLoading(false);
            e.target.value = '';
        }
    };

    if (!user) return <div className="text-center py-10">Please log in</div>;
    if (loading && !profile) return <LoadingModal />;

    return (
        <main className="container mx-auto px-2.5 py-5 sm:px-5 sm:py-10 flex flex-col gap-6">
            {loading && <LoadingModal />}

            {/* Profile Header Card */}
            <div className="bg-white rounded-xl p-5 sm:p-6 shadow-legacy-card flex flex-col items-center text-center gap-5">
                <div className="flex flex-col items-center gap-3">
                    <div
                        className="w-[120px] h-[120px] rounded-full overflow-hidden bg-[#f4f6fa] cursor-pointer transition-transform duration-300 hover:scale-105"
                        onClick={() => document.getElementById('photoInput')?.click()}
                    >
                        <img
                            src={profile?.profile_url || profile?.pfp || "/placeholder.svg"}
                            alt="Profile"
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <button
                        className="bg-[#1c6ef2] text-white px-4 py-2 text-xs rounded-lg hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(28,110,242,0.3)] transition-all font-semibold"
                        onClick={() => document.getElementById('photoInput')?.click()}
                    >
                        Change Photo
                    </button>
                    <input type="file" id="photoInput" hidden onChange={handlePhotoChange} accept="image/*" />
                </div>

                <div className="flex flex-col items-center gap-2">
                    <h1 className="text-2xl font-bold text-[#1d1d1d] mb-2">{profile?.username}</h1>
                    <span className="inline-block bg-[#1c6ef2] text-white px-3 py-1.5 rounded-full text-xs font-semibold">{profile?.role}</span>
                </div>
            </div>

            {/* Account Information Card */}
            <div className="bg-white rounded-xl p-5 sm:p-6 shadow-legacy-card">
                <h2 className="text-lg font-semibold text-[#1d1d1d] mb-5">Account Information</h2>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-[#1d1d1d] mb-2">Username</label>
                    <input
                        type="text"
                        className="w-full px-3.5 py-3 border border-gray-200 rounded-lg text-sm text-[#1d1d1d] transition-all duration-300 focus:outline-none focus:border-[#1c6ef2] focus:ring-4 focus:ring-[#1c6ef2]/10 disabled:bg-[#f4f6fa] disabled:cursor-not-allowed bg-white"
                        value={profile?.username || ''}
                        disabled
                    />
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-[#1d1d1d] mb-2">Email</label>
                    <input
                        type="email"
                        className="w-full px-3.5 py-3 border border-gray-200 rounded-lg text-sm text-[#1d1d1d] transition-all duration-300 focus:outline-none focus:border-[#1c6ef2] focus:ring-4 focus:ring-[#1c6ef2]/10 disabled:bg-[#f4f6fa] disabled:cursor-not-allowed bg-white"
                        value={profile?.email || ''}
                        disabled
                    />
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-[#1d1d1d] mb-2">Phone Number</label>
                    <input
                        type="text"
                        className="w-full px-3.5 py-3 border border-gray-200 rounded-lg text-sm text-[#1d1d1d] transition-all duration-300 focus:outline-none focus:border-[#1c6ef2] focus:ring-4 focus:ring-[#1c6ef2]/10 disabled:bg-[#f4f6fa] disabled:cursor-not-allowed bg-white"
                        value={profile?.phone || ''}
                        disabled
                    />
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-[#1d1d1d] mb-2">Bio</label>
                    {isEditing ? (
                        <textarea
                            className="w-full px-3.5 py-3 border border-gray-200 rounded-lg text-sm text-[#1d1d1d] transition-all duration-300 focus:outline-none focus:border-[#1c6ef2] focus:ring-4 focus:ring-[#1c6ef2]/10 min-h-[88px] max-h-[300px] leading-relaxed"
                            value={editForm.bio}
                            onChange={e => setEditForm({ ...editForm, bio: e.target.value })}
                        />
                    ) : (
                        <textarea
                            className="w-full px-3.5 py-3 border border-gray-200 rounded-lg text-sm text-[#1d1d1d] transition-all duration-300 disabled:bg-[#f4f6fa] disabled:cursor-not-allowed bg-white min-h-[88px] max-h-[300px] leading-relaxed"
                            value={profile?.bio || ''}
                            disabled
                        />
                    )}
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-[#1d1d1d] mb-2">University</label>
                    {isEditing ? (
                        <select
                            className="w-full px-3.5 py-3 border border-gray-200 rounded-lg text-sm text-[#1d1d1d] transition-all duration-300 focus:outline-none focus:border-[#1c6ef2] focus:ring-4 focus:ring-[#1c6ef2]/10 bg-white"
                            value={editForm.institute}
                            onChange={e => setEditForm({ ...editForm, institute: e.target.value })}
                        >
                            <option value="">Select University</option>
                            {universities.map((u, i) => <option key={i} value={u.name}>{u.name}</option>)}
                        </select>
                    ) : (
                        <input
                            type="text"
                            className="w-full px-3.5 py-3 border border-gray-200 rounded-lg text-sm text-[#1d1d1d] transition-all duration-300 disabled:bg-[#f4f6fa] disabled:cursor-not-allowed bg-white"
                            value={profile?.institute || ''}
                            disabled
                        />
                    )}
                </div>

                {isEditing ? (
                    <div className="flex flex-col gap-3 mt-5">
                        <button
                            className="w-full py-3 px-6 bg-[#ffb800] text-white rounded-lg text-sm font-semibold hover:-translate-y-0.5 hover:shadow-[0_8px_16px_rgba(255,184,0,0.3)] transition-all duration-300"
                            onClick={handleSave}
                        >
                            Save Changes
                        </button>
                        <button
                            className="w-full py-3 px-6 bg-gray-100 text-[#1d1d1d] rounded-lg text-sm font-semibold hover:bg-gray-200 transition-all duration-300"
                            onClick={() => setIsEditing(false)}
                        >
                            Cancel
                        </button>
                    </div>
                ) : (
                    <button
                        className="w-full py-3 px-6 bg-[#ffb800] text-white rounded-lg text-sm font-semibold hover:-translate-y-0.5 hover:shadow-[0_8px_16px_rgba(255,184,0,0.3)] transition-all duration-300 mt-5"
                        onClick={startEdit}
                    >
                        Edit Profile
                    </button>
                )}
            </div>

            {/* Preferences Card */}
            <div className="bg-white rounded-xl p-5 sm:p-6 shadow-legacy-card">
                <h2 className="text-lg font-semibold text-[#1d1d1d] mb-5">Preferences</h2>
                <div className="flex items-center justify-between py-2">
                    <div>
                        <p className="text-sm font-medium text-[#1d1d1d]">Dark Mode</p>
                        <p className="text-xs text-gray-500">Toggle dark mode appearance</p>
                    </div>
                    {mounted && (
                        <button 
                            onClick={() => setTheme(currentTheme === 'dark' ? 'light' : 'dark')}
                            className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors shadow-sm"
                            title="Toggle Dark Mode"
                        >
                            {currentTheme === 'dark' ? <Sun size={24} className="text-amber-500" /> : <Moon size={24} />}
                        </button>
                    )}
                </div>
            </div>
        </main>
    );
}
