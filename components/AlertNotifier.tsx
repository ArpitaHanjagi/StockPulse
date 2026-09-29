'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { checkPriceAlerts } from '@/lib/actions/alert.actions';
import { playAlertSound } from '@/lib/notification-sound';
import { formatINR } from '@/lib/currency';
import { NOTIFICATIONS_CHANGED_EVENT, showDesktopNotification } from '@/lib/browser-notifications';
import { displaySymbol } from '@/lib/market/symbols';

// How often open tabs evaluate the user's price alerts. There is no
// background job or email any more: while the app is open this is what
// fires alerts, and the server guarantees each alert fires only once.
const POLL_INTERVAL_MS = 60_000;

const AlertNotifier = () => {
    const router = useRouter();

    useEffect(() => {
        let cancelled = false;
        let running = false;

        const check = async () => {
            if (running) return;
            running = true;

            try {
                const fired = await checkPriceAlerts();
                if (cancelled || fired.length === 0) return;

                playAlertSound();

                for (const alert of fired) {
                    const title = alert.title ?? `${displaySymbol(alert.symbol)} ${alert.alertType === 'upper' ? 'rose above' : 'fell below'} ${formatINR(alert.threshold)}`;
                    const body = alert.message ?? `${alert.alertName} · now trading at ${formatINR(alert.triggeredPrice)}`;

                    toast.success(title, { description: body, duration: 10000 });
                    showDesktopNotification(title, body, `/stocks/${alert.symbol}`);
                }

                window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
                router.refresh();
            } catch (e) {
                console.error('Failed to check price alerts', e);
            } finally {
                running = false;
            }
        };

        const handleVisibility = () => {
            if (document.visibilityState === 'visible') check();
        };

        check();
        const interval = setInterval(check, POLL_INTERVAL_MS);
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            cancelled = true;
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [router]);

    return null;
};

export default AlertNotifier;
