"use client";
import { AuthProvider } from '../context/AuthContext';
import { AuthGateProvider } from '../context/AuthGateContext';
import CompleteProfileGate from '../context/CompleteProfileGate';
import { ThemeProvider } from 'next-themes';

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <AuthProvider>
                <AuthGateProvider>
                    {children}
                    <CompleteProfileGate />
                </AuthGateProvider>
            </AuthProvider>
        </ThemeProvider>
    );
}
