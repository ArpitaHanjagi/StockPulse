'use server';

import { COLLECTIONS, getDb, toDate } from "@/DATABASE/firebase";
import { getCurrentUser } from "@/lib/better-auth/session";

const userNotifications = (userId: string) =>
    getDb().collection(COLLECTIONS.notifications).where('userId', '==', userId).get();

export const getNotifications = async (): Promise<{ notifications: AppNotification[]; unreadCount: number }> => {
    const user = await getCurrentUser();
    if (!user) return { notifications: [], unreadCount: 0 };

    // Sorted in memory so no composite Firestore index is required.
    const notifications = (await userNotifications(user.id)).docs
        .map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                type: data.type,
                title: data.title,
                message: data.message,
                link: data.link,
                read: !!data.read,
                createdAt: (toDate(data.createdAt) ?? new Date(0)).toISOString(),
            } satisfies AppNotification;
        })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return { notifications, unreadCount: notifications.filter((n) => !n.read).length };
};

export const markAllNotificationsRead = async () => {
    const user = await getCurrentUser();
    if (!user) return { success: false };

    const unread = (await userNotifications(user.id)).docs.filter((doc) => !doc.get('read'));
    if (unread.length > 0) {
        const batch = getDb().batch();
        unread.forEach((doc) => batch.update(doc.ref, { read: true }));
        await batch.commit();
    }
    return { success: true };
};

export const clearNotifications = async () => {
    const user = await getCurrentUser();
    if (!user) return { success: false };

    const docs = (await userNotifications(user.id)).docs;
    if (docs.length > 0) {
        const batch = getDb().batch();
        docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
    }
    return { success: true };
};
