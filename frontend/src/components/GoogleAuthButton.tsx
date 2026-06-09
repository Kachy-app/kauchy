"use client";
import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

// Minimal typing for the Google Identity Services global.
declare global {
    interface Window {
        google?: any;
    }
}

const GSI_SRC = 'https://accounts.google.com/gsi/client';
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

/**
 * "Sign in with Google" button shared by the login and signup pages. Uses
 * Google Identity Services to obtain an ID token, exchanges it with our
 * backend (`/auth/google/`) for JWTs, stores them, and redirects. If the
 * returned user has an incomplete profile, the global CompleteProfileGate
 * modal takes over automatically.
 */
export default function GoogleAuthButton({ next }: { next?: string | null }) {
    const { login } = useAuth();
    const router = useRouter();
    const buttonRef = useRef<HTMLDivElement>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!CLIENT_ID) {
            setError('Google sign-in is not configured.');
            return;
        }

        const handleCredential = async (response: { credential?: string }) => {
            if (!response?.credential) return;
            setError('');
            setLoading(true);
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/google/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id_token: response.credential }),
                });
                if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    throw new Error(data.detail || 'Google sign-in failed');
                }
                const data = await res.json();
                login(data);
                router.push(next || '/');
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        const render = () => {
            if (!window.google || !buttonRef.current) return;
            window.google.accounts.id.initialize({
                client_id: CLIENT_ID,
                callback: handleCredential,
            });
            window.google.accounts.id.renderButton(buttonRef.current, {
                theme: 'outline',
                size: 'large',
                shape: 'pill',
                text: 'continue_with',
                width: 320,
            });
        };

        // Load the GIS script once, then render.
        const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`);
        if (existing && window.google) {
            render();
        } else if (existing) {
            existing.addEventListener('load', render, { once: true });
        } else {
            const script = document.createElement('script');
            script.src = GSI_SRC;
            script.async = true;
            script.defer = true;
            script.addEventListener('load', render, { once: true });
            document.head.appendChild(script);
        }
    }, [login, router, next]);

    return (
        <div className="flex flex-col items-center gap-2">
            <div ref={buttonRef} className={loading ? 'opacity-60 pointer-events-none' : ''} />
            {loading && <p className="text-xs text-gray-400">Signing you in…</p>}
            {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
    );
}
