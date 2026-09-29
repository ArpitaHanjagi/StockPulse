'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, BellRing, Sparkles, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { clearNotifications, getNotifications, markAllNotificationsRead } from '@/lib/actions/notification.actions';
import {
    NOTIFICATIONS_CHANGED_EVENT,
    getDesktopPermission,
    requestDesktopPermission,
} from '@/lib/browser-notifications';

const REFRESH_INTERVAL_MS = 120_000;

const timeAgo = (iso: string) => {
    const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
};

const TypeIcon = ({ type }: { type: AppNotification['type'] }) => {
    if (type === 'alert') return <TrendingUp className="size-4 shrink-0 text-yellow-500" />;
    if (type === 'welcome') return <Sparkles className="size-4 shrink-0 text-teal-400" />;
    return <Bell className="size-4 shrink-0 text-gray-500" />;
};

const NotificationBell = () => {
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    // Only rendered inside the popover (client-side, after interaction), so
    // reading it in the initializer can't cause a hydration mismatch.
    const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(getDesktopPermission);

    const load = useCallback(() => {
        getNotifications()
            .then((result) => {
                setNotifications(result.notifications);
                setUnreadCount(result.unreadCount);
            })
            .catch((e) => console.error('Failed to load notifications', e));
    }, []);

    useEffect(() => {
        load();

        const interval = setInterval(load, REFRESH_INTERVAL_MS);
        window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, load);
        return () => {
            clearInterval(interval);
            window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, load);
        };
    }, [load]);

    const handleOpenChange = async (next: boolean) => {
        setOpen(next);
        if (!next) {
            // Items stay highlighted while the panel is open, and are
            // marked read once the user has seen them.
            if (unreadCount > 0) {
                setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
                setUnreadCount(0);
                await markAllNotificationsRead();
            }
            return;
        }
        load();
    };

    const handleClear = async () => {
        await clearNotifications();
        setNotifications([]);
        setUnreadCount(0);
    };

    const handleEnableDesktop = async () => {
        const result = await requestDesktopPermission();
        setPermission(result);
        if (result === 'granted') toast.success('Desktop notifications enabled');
        else if (result === 'denied') toast.error('Desktop notifications are blocked in your browser settings');
    };

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger
                className="relative flex size-9 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-800 hover:text-yellow-500"
                aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
            >
                {unreadCount > 0 ? <BellRing className="size-5" /> : <Bell className="size-5" />}
                {unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-yellow-500 px-1 text-[10px] font-bold leading-4 text-gray-900">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </PopoverTrigger>

            <PopoverContent align="end" className="w-80 border border-gray-700 bg-gray-800 p-0 text-gray-300 sm:w-96">
                <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
                    <span className="font-semibold text-gray-100">Notifications</span>
                    {notifications.length > 0 && (
                        <button onClick={handleClear} className="text-xs text-gray-500 hover:text-yellow-500">
                            Clear all
                        </button>
                    )}
                </div>

                {permission === 'default' && (
                    <button
                        onClick={handleEnableDesktop}
                        className="mx-3 mt-3 rounded-md border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-left text-xs text-yellow-500 hover:bg-yellow-500/20"
                    >
                        Enable desktop notifications to hear about price alerts even when this tab is in the background.
                    </button>
                )}

                <div className="max-h-96 overflow-y-auto py-1">
                    {notifications.length === 0 ? (
                        <div className="px-4 py-10 text-center text-sm text-gray-500">
                            <Bell className="mx-auto mb-2 size-6 text-gray-600" />
                            You&apos;re all caught up.
                        </div>
                    ) : (
                        notifications.map((n) => {
                            const content = (
                                <div className={`flex gap-3 px-4 py-3 ${n.read ? '' : 'bg-gray-700/40'}`}>
                                    <TypeIcon type={n.type} />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="text-sm font-medium text-gray-100">{n.title}</p>
                                            {!n.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-yellow-500" />}
                                        </div>
                                        <p className="mt-0.5 text-xs leading-relaxed text-gray-400">{n.message}</p>
                                        <p className="mt-1 text-[11px] text-gray-500">{timeAgo(n.createdAt)}</p>
                                    </div>
                                </div>
                            );

                            return n.link ? (
                                <Link
                                    key={n.id}
                                    href={n.link}
                                    onClick={() => handleOpenChange(false)}
                                    className="block hover:bg-gray-700/60"
                                >
                                    {content}
                                </Link>
                            ) : (
                                <div key={n.id}>{content}</div>
                            );
                        })
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
};

export default NotificationBell;
