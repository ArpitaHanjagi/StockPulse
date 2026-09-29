// Fired whenever server-side notifications change, so the header bell can
// refresh without waiting for its own poll.
export const NOTIFICATIONS_CHANGED_EVENT = 'stockpulse:notifications-changed';

export const desktopNotificationsSupported = () => typeof window !== 'undefined' && 'Notification' in window;

export const getDesktopPermission = (): NotificationPermission | 'unsupported' =>
    desktopNotificationsSupported() ? Notification.permission : 'unsupported';

export const requestDesktopPermission = async (): Promise<NotificationPermission | 'unsupported'> => {
    if (!desktopNotificationsSupported()) return 'unsupported';
    return Notification.requestPermission();
};

// Shows an OS-level notification (free, built into every modern browser)
// so alerts are noticed even when the tab is in the background.
export const showDesktopNotification = (title: string, body: string, link?: string) => {
    if (getDesktopPermission() !== 'granted') return;

    try {
        const notification = new Notification(title, { body, icon: '/assets/icons/logo-mark.svg', tag: title });
        notification.onclick = () => {
            window.focus();
            if (link) window.location.href = link;
            notification.close();
        };
    } catch (e) {
        console.error('Failed to show desktop notification', e);
    }
};
