"use client";
import React from 'react';
import Navbar from './Navbar';
import { usePathname } from 'next/navigation';

export default function PageLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isNoNavPage = pathname === '/login' || pathname === '/signup' || pathname === '/waitlist' || pathname.startsWith('/feed');

    if (isNoNavPage) {
        return <>{children}</>;
    }

    const isChatPage = pathname === '/chat';

    return (
        <>
            <Navbar />
            <main className={`mt-[70px] w-full min-h-[calc(100vh-70px)] ${isChatPage ? 'overflow-hidden h-[calc(100vh-70px)]' : ''}`}>
                {children}
            </main>
        </>
    );
}
