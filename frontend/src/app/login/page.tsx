"use client";
import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import GoogleAuthButton from '@/components/GoogleAuthButton';
import "@/app/globals.css";


export default function LoginPage() {
    const { login } = useAuth();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/jwt/create/`, {
                method: 'POST',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.detail || "Login failed");
            }

            const data = await response.json();
            login(data);
            // Return the user to wherever the auth gate sent them from.
            const next = new URLSearchParams(window.location.search).get('next');
            router.push(next || '/');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page-wrapper">
            <div className="login-container">

                <div className="login-card">
                    <Link href="/" className="logo">
                        <img src="/logo.png" alt="Kauchy" className="logo-image" />
                    </Link>
                    <h2>Welcome Back</h2>
                    <p className="subtitle">Enter your credentials to access your account</p>

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="name@company.com"
                            />
                        </div>

                        <div className="form-group">
                            <label>Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="••••••••"
                            />
                        </div>

                        {error && <div className="error-message" style={{ marginBottom: '10px' }}>{error}</div>}

                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    <div className="divider"><span>or</span></div>

                    <GoogleAuthButton next={typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('next') : null} />

                    <div className="auth-toggle">
                        Don&apos;t have an account? <Link href="/signup" className="toggle-link">Sign up</Link>
                    </div>
                </div>
            </div>
            <style jsx>{`
        .login-page-wrapper {
            min-height: 100vh;
            background: #09090b;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .login-container {
            width: 100%;
            max-width: 420px;
        }
        .logo {
            display: flex;
            justify-content: center;
            margin-bottom: 24px;
        }
        .logo-image {
            height: 80px;
        }
        .login-card {
            background: #18181b;
            color: #fafafa;
            padding: 40px;
            border-radius: 12px;
            border: 1px solid #27272a;
            box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        }
        h2 { font-size: 24px; margin-bottom: 8px; font-weight: 600; color: #ffffff; }
        .subtitle { font-size: 14px; color: #a1a1aa; margin-bottom: 24px; }
        .form-group { margin-bottom: 18px; }
        label { display: block; margin-bottom: 8px; font-weight: 500; font-size: 14px; color: #e4e4e7; }
        input {
            width: 100%;
            padding: 12px 14px;
            border: 1px solid #3f3f46;
            border-radius: 8px;
            font-size: 14px;
            background: #27272a;
            color: #ffffff;
        }
        input::placeholder { color: #71717a; }
        .btn-primary {
            width: 100%;
            padding: 12px;
            background: var(--primary, #1c6ef2);
            color: white;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
        }
        .btn-primary:disabled { opacity: 0.7; }
        .auth-toggle { text-align: center; margin-top: 24px; font-size: 14px; color: #a1a1aa; }
        .toggle-link { color: var(--primary, #1c6ef2); font-weight: 600; text-decoration: none; }
        .divider { display: flex; align-items: center; text-align: center; color: #71717a; font-size: 13px; margin: 20px 0; }
        .divider::before, .divider::after { content: ''; flex: 1; border-bottom: 1px solid #3f3f46; }
        .divider span { padding: 0 12px; }
      `}</style>
        </div>
    );
}
