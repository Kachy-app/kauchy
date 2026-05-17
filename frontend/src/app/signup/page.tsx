"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';


export default function SignupPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        username: '',
        phone: '',
        email: '',
        university: '',
        role: 'student', // default
        password: '',
        confirmPassword: ''
    });
    const [universities, setUniversities] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    useEffect(() => {
        // Fetch universities
        fetch('https://university-domains-list-api-tn4l.onrender.com/search?country=Nigeria')
            .then(res => res.json())
            .then(data => setUniversities(data))
            .catch(err => console.error("Failed to load universities", err));
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match");
            setLoading(false);
            return;
        }

        const payload = {
            username: formData.username,
            phone: formData.phone,
            email: formData.email,
            institute: formData.university,
            role: formData.role,
            password: formData.password
        };

        try {
            const response = await fetch('http://127.0.0.1:8000/auth/users/', {
                method: 'POST',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                let msg = "Signup failed";
                if (errData.email) msg = errData.email[0];
                else if (errData.username) msg = errData.username[0];
                else if (errData.detail) msg = errData.detail;
                throw new Error(msg);
            }

            // Success
            alert("Account created successfully! Please login.");
            router.push('/login');

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-5 bg-gradient-to-br from-gray-50 to-white font-sans">
            <div className="w-full max-w-[420px] px-4 md:px-0">
                <div className="bg-white rounded-xl p-5 sm:p-8 shadow-sm overflow-visible md:p-10 relative">
                    <Link href="/" className="flex items-center justify-center gap-2 text-blue-600 font-bold text-lg w-full h-12 overflow-hidden mb-6 no-underline">
                        <img src="https://icuklzexzhusblkzglnr.supabase.co/storage/v1/object/public/marketplace/logo/Upstart(4).png" alt="Upstart" className="h-[110px] w-[137px] object-cover object-[30%_40%] md:h-[88px] sm:h-[100px] sm:w-[170px]" />
                    </Link>

                    <h2 className="text-2xl font-semibold text-gray-900 mb-2">Create Account</h2>
                    <p className="text-sm text-gray-600 mb-6">Join our marketplace community</p>

                    <form onSubmit={handleSubmit}>
                        <div className="mb-4.5">
                            <label className="block text-sm font-medium text-gray-900 mb-2">Username</label>
                            <input
                                type="text"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                placeholder="Choose a username"
                                required
                                className="w-full px-3.5 py-3 border border-gray-200 rounded-lg text-sm text-gray-900 transition-all duration-300 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                            />
                        </div>
                        <div className="mb-4.5">
                            <label className="block text-sm font-medium text-gray-900 mb-2">Phone Number</label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="10-15 digits"
                                required
                                className="w-full px-3.5 py-3 border border-gray-200 rounded-lg text-sm text-gray-900 transition-all duration-300 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                            />
                        </div>
                        <div className="mb-4.5">
                            <label className="block text-sm font-medium text-gray-900 mb-2">Email</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="your@email.com"
                                required
                                className="w-full px-3.5 py-3 border border-gray-200 rounded-lg text-sm text-gray-900 transition-all duration-300 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                            />
                        </div>
                        <div className="mb-4.5">
                            <label className="block text-sm font-medium text-gray-900 mb-2">University</label>
                            <select
                                name="university"
                                value={formData.university}
                                onChange={handleChange}
                                required
                                className="w-full px-3.5 py-3 border border-gray-200 rounded-lg text-sm text-gray-900 transition-all duration-300 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                            >
                                <option value="">Select University</option>
                                {universities.map((uni, idx) => (
                                    <option key={idx} value={uni.name}>{uni.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="mb-4.5">
                            <label className="block text-sm font-medium text-gray-900 mb-2">Role</label>
                            <select
                                name="role"
                                value={formData.role}
                                onChange={handleChange}
                                required
                                className="w-full px-3.5 py-3 border border-gray-200 rounded-lg text-sm text-gray-900 transition-all duration-300 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                            >
                                <option value="student">Buyer</option>
                                <option value="vendor">Vendor</option>
                            </select>
                        </div>
                        <div className="mb-4.5">
                            <label className="block text-sm font-medium text-gray-900 mb-2">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="At least 6 characters"
                                    required
                                    minLength={6}
                                    className="w-full px-3.5 py-3 border border-gray-200 rounded-lg text-sm text-gray-900 transition-all duration-300 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 pr-20"
                                />
                                <button
                                    type="button"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-transparent border-none text-gray-600 text-[13px] px-2 py-1.5 cursor-pointer rounded-md hover:text-gray-900"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? "Hide" : "Show"}
                                </button>
                            </div>
                        </div>
                        <div className="mb-4.5">
                            <label className="block text-sm font-medium text-gray-900 mb-2">Confirm Password</label>
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    placeholder="Confirm your password"
                                    required
                                    className="w-full px-3.5 py-3 border border-gray-200 rounded-lg text-sm text-gray-900 transition-all duration-300 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 pr-20"
                                />
                                <button
                                    type="button"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-transparent border-none text-gray-600 text-[13px] px-2 py-1.5 cursor-pointer rounded-md hover:text-gray-900"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                    {showConfirmPassword ? "Hide" : "Show"}
                                </button>
                            </div>
                        </div>

                        {error && <div className="block text-xs text-red-500 mt-1 min-h-[16px]">{error}</div>}

                        <button
                            type="submit"
                            className="w-full py-3 px-6 bg-blue-600 text-white border-none rounded-lg text-base font-semibold cursor-pointer transition-all duration-300 mt-2.5 hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                            disabled={loading}
                        >
                            {loading ? 'Creating Account...' : 'Create Account'}
                        </button>
                    </form>

                    <div className="text-center mt-6 text-sm text-gray-600">
                        <p>Already have an account?
                            <Link href="/login" className="text-blue-600 font-semibold no-underline transition-colors hover:text-amber-400"> Login</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
