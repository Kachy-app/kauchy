"use client";
import { AuthProvider } from '../context/AuthContext';
import { AuthGateProvider } from '../context/AuthGateContext';
import { ThemeProvider } from 'next-themes';

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <AuthProvider>
                <AuthGateProvider>
                    {children}
                </AuthGateProvider>
            </AuthProvider>
        </ThemeProvider>
    );
}
