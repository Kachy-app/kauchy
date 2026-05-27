"use client";

import React, { useState } from 'react';
import { Mail, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function WaitlistPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('Please enter a valid email or try again later.');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');
    setErrorMessage('Please enter a valid email or try again later.');
    
    try {
      const res = await fetch('https://kachy-production.up.railway.app/waitlist/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setStatus('success');
        setEmail('');
      } else {
        const errorData = await res.json().catch(() => null);
        setStatus('error');
        if (errorData?.email?.[0]) {
          setErrorMessage('This email is already on the waitlist!');
        }
      }
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col relative overflow-hidden">
      {/* Background Blur Effects (Blue and Gold/Yellow) */}
      <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vh] bg-[#1c6ef2]/40 blur-[150px] rounded-full pointer-events-none md:w-[60vw] md:h-[60vh] mix-blend-screen" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[70vw] h-[70vh] bg-[#ffb800]/30 blur-[150px] rounded-full pointer-events-none md:w-[60vw] md:h-[60vh] mix-blend-screen" />

      {/* Navigation */}
      <nav className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
        <Link href="/" className="inline-block">
          <img 
            src="/Upstart-removebg-preview(1).png" 
            alt="Upstart" 
            className="h-24 md:h-32 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]"
          />
        </Link>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center relative z-10 px-6 max-w-4xl mx-auto w-full text-center">
        
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm mb-8 backdrop-blur-md hover:bg-white/10 transition-colors cursor-default">
          <Sparkles className="w-4 h-4 text-[#ffb800]" />
          <span className="text-gray-200 font-medium">Coming Soon. Be the first to try.</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-[1.15]">
          The Future of Campus <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1c6ef2] via-blue-400 to-[#ffb800]">
            Commerce is Here
          </span>
        </h1>

        <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
          Join the exclusive waitlist to get early access to Upstart. Experience seamless campus shopping, instant deliveries, and unparalleled vendor tooling.
        </p>

        {/* Form Container */}
        <div className="w-full max-w-md mx-auto">
          {status === 'success' ? (
            <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-6 flex flex-col items-center text-center transition-all duration-500">
              <CheckCircle2 className="w-12 h-12 text-green-400 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">You're on the list!</h3>
              <p className="text-gray-400 text-sm">We'll notify you as soon as early access opens.</p>
              <button 
                onClick={() => setStatus('idle')}
                className="mt-6 text-sm text-gray-400 hover:text-white transition-colors underline-offset-4 hover:underline"
              >
                Join with another email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 relative">
              <div className="relative flex-1">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#1c6ef2]/50 focus:border-[#1c6ef2]/50 transition-all backdrop-blur-sm"
                  required
                  disabled={status === 'loading'}
                />
              </div>
              <button 
                type="submit"
                disabled={status === 'loading'}
                className="bg-gradient-to-r from-[#1c6ef2] to-blue-600 text-white px-6 py-3.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-70 group whitespace-nowrap shadow-[0_0_20px_rgba(28,110,242,0.2)] hover:shadow-[0_0_30px_rgba(28,110,242,0.4)] hover:brightness-110"
              >
                {status === 'loading' ? (
                  <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Join Waitlist
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          )}
          {status === 'error' && (
            <p className="text-red-400 text-sm mt-3 animate-pulse font-medium">{errorMessage}</p>
          )}

          <div className="mt-8 text-sm text-gray-400 flex items-center justify-center gap-4">
            <div className="flex -space-x-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className={`w-8 h-8 rounded-full border-2 border-[#0a0a0a] bg-gradient-to-br ${
                  i === 0 ? 'from-[#1c6ef2] to-blue-500' :
                  i === 1 ? 'from-[#ffb800] to-yellow-500' :
                  i === 2 ? 'from-blue-400 to-[#1c6ef2]' :
                  'from-yellow-400 to-[#ffb800]'
                } flex items-center justify-center shadow-lg`}>
                  <span className="text-[10px] font-bold text-white opacity-90">{i * 2 + 1}</span>
                </div>
              ))}
            </div>
            <span>Over <strong className="text-white font-semibold">2,000+</strong> students already joined.</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full text-center py-6 border-t border-white/5 mt-auto bg-black/20 backdrop-blur-sm">
        <p className="text-sm text-gray-500">© 2026 Upstart Platform. All rights reserved.</p>
      </footer>
    </div>
  );
}
