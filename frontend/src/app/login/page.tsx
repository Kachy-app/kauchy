"use client";
import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
            const response = await fetch('http://127.0.0.1:8000/auth/jwt/create/', {
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
            router.push('/');
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
                        <img src="https://icuklzexzhusblkzglnr.supabase.co/storage/v1/object/public/marketplace/logo/Upstart(2).png" alt="Upstart" className="logo-image" />
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

                    <div className="auth-toggle">
                        Don&apos;t have an account? <Link href="/signup" className="toggle-link">Sign up</Link>
                    </div>
                </div>
            </div>
            <style jsx>{`
        .login-page-wrapper {
            min-height: 80vh;
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
            background: #fff;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        h2 { font-size: 24px; margin-bottom: 8px; font-weight: 600; }
        .subtitle { font-size: 14px; color: #4b4b4b; margin-bottom: 24px; }
        .form-group { margin-bottom: 18px; }
        label { display: block; margin-bottom: 8px; font-weight: 500; font-size: 14px; }
        input {
            width: 100%;
            padding: 12px 14px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            font-size: 14px;
        }
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
        .auth-toggle { text-align: center; margin-top: 24px; font-size: 14px; color: #4b4b4b; }
        .toggle-link { color: var(--primary, #1c6ef2); font-weight: 600; text-decoration: none; }
      `}</style>
        </div>
    );
}
