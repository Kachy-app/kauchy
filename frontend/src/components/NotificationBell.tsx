"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { Bell, X } from 'lucide-react';

type Notification = {
    id: number;
    title: string;
    message: string;
    notification_type: string;
    link?: string;
    is_read: boolean;
    created_at: string;
};

/**
 * Self-contained notification bell + dropdown driven by the notifications WebSocket.
 * Used in the desktop LeftNav rail. The rail is collapsed by default and expands on
 * hover, so the dropdown opens to the right of the rail.
 */
export default function NotificationBell({ collapsed = true }: { collapsed?: boolean }) {
    const { user } = useAuth();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState<number>(0);
    const wsRef = useRef<WebSocket | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!user?.access) return;

        const wsHost = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
        const ws = new WebSocket(`${wsHost}/ws/notifications/?token=${user.access}`);
        wsRef.current = ws;

        ws.onopen = () => {
            ws.send(JSON.stringify({ action: 'get_notification' }));
        };
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'unread_count') {
                    setUnreadCount(data.count);
                } else if (data.type === 'notifications') {
                    setNotifications(data.notifications || []);
                } else if (data.type === 'new_notification') {
                    setNotifications(prev => [data.notification, ...prev].slice(0, 20));
                }
            } catch (e) {
                console.error('Error parsing WebSocket message:', e);
            }
        };
        ws.onerror = (err) => console.error('Notification WebSocket error:', err);

        return () => {
            ws.close();
            wsRef.current = null;
        };
    }, [user?.access]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNotificationClick = (notif: Notification) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ action: 'mark_read', notification_id: notif.id }));
        }
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
        setIsOpen(false);

        if (notif.link) router.push(notif.link);
        else if (notif.notification_type === 'message') router.push('/chat');
        else if (notif.notification_type === 'order') router.push('/orders');
    };

    const markAllRead = () => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ action: 'mark_all_read' }));
        }
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
    };

    const clearAll = () => {
        notifications.forEach(n => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ action: 'delete', notification_id: n.id }));
            }
        });
        setNotifications([]);
        setUnreadCount(0);
    };

    if (!user) return null;

    const itemBase = 'relative flex items-center gap-4 rounded-xl h-12 px-3 transition-colors w-full';

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setIsOpen(o => !o)}
                title="Notifications"
                className={`${itemBase} text-gray-300 hover:bg-white/5 hover:text-white ${isOpen ? 'bg-white/10 text-white' : ''}`}
            >
                <span className="relative shrink-0">
                    <Bell size={24} />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full border border-black">
                            {unreadCount}
                        </span>
                    )}
                </span>
                <span className="whitespace-nowrap text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    Notifications
                </span>
            </button>

            {isOpen && (
                // Fixed (not absolute) so it escapes the rail's `overflow-hidden`, which
                // would otherwise clip a dropdown that extends to the right of the rail.
                <div className="fixed bottom-3 left-[80px] w-80 bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-gray-100 dark:border-zinc-800 overflow-hidden z-[9999] animate-fadeIn">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Notifications</h3>
                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                                <button onClick={markAllRead} className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors">
                                    Mark all read
                                </button>
                            )}
                            {notifications.length > 0 && (
                                <>
                                    {unreadCount > 0 && <span className="text-gray-300 dark:text-zinc-600">|</span>}
                                    <button onClick={clearAll} className="text-xs font-medium text-red-500 hover:text-red-700 transition-colors">
                                        Clear all
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <p className="p-6 text-center text-gray-500 dark:text-gray-400 text-sm">No notifications</p>
                        ) : (
                            notifications.map((notif) => (
                                <div
                                    key={notif.id}
                                    className={`group/notif relative p-4 border-b border-gray-100 dark:border-zinc-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors ${notif.is_read ? 'opacity-60' : 'bg-blue-50/30 dark:bg-blue-900/10'}`}
                                    onClick={() => handleNotificationClick(notif)}
                                >
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                                                wsRef.current.send(JSON.stringify({ action: 'delete', notification_id: notif.id }));
                                            }
                                            setNotifications(prev => prev.filter(n => n.id !== notif.id));
                                            if (!notif.is_read) setUnreadCount(prev => Math.max(0, prev - 1));
                                        }}
                                        className="absolute top-2 right-2 opacity-0 group-hover/notif:opacity-100 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-400 hover:text-red-500 transition-all"
                                        title="Remove"
                                    >
                                        <X size={14} />
                                    </button>
                                    <div className="flex items-start gap-2 pr-4">
                                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${notif.is_read ? 'bg-transparent' : 'bg-blue-500'}`} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-[#1c6ef2] mb-0.5">{notif.title}</p>
                                            <p className="text-sm text-gray-800 dark:text-gray-200 mb-1 leading-snug">{notif.message}</p>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(notif.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
