import { COLLECTIONS, getDb } from "@/DATABASE/firebase";
import { getIndustryPicks, pickName } from "@/lib/market/symbols";

export type NotificationType = 'welcome' | 'alert' | 'system';

// Only the newest notifications are kept per user.
export const MAX_NOTIFICATIONS = 30;

// Server-only helper. Deliberately not a server action: exporting this from
// a 'use server' file would let any client create notifications for any
// user id.
export const createNotification = async (
    userId: string,
    data: { type: NotificationType; title: string; message: string; link?: string }
) => {
    const collection = getDb().collection(COLLECTIONS.notifications);
    await collection.add({ userId, ...data, read: false, createdAt: new Date() });

    // Prune anything beyond the cap so the collection can't grow forever.
    const snap = await collection.where('userId', '==', userId).get();
    const stale = snap.docs
        .sort((a, b) => b.get('createdAt').toMillis() - a.get('createdAt').toMillis())
        .slice(MAX_NOTIFICATIONS);
    if (stale.length > 0) {
        const batch = getDb().batch();
        stale.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
    }
};

const GOAL_TIPS: Record<string, string> = {
    Growth: 'Keep an eye on the 52-week range and daily movers to spot momentum early.',
    Income: 'Watch steady large-caps and use lower-bound alerts to catch good entry prices.',
    Balanced: 'Mix a few growth names with steady large-caps and let alerts do the watching.',
    Conservative: 'Set lower-bound alerts so you only act when prices reach levels you are comfortable with.',
};

export const buildWelcomeMessage = (data: {
    name: string;
    investmentGoals?: string;
    riskTolerance?: string;
    preferredIndustry?: string;
}) => {
    const picks = getIndustryPicks(data.preferredIndustry).slice(0, 3).map(pickName).join(', ');
    const tip = GOAL_TIPS[data.investmentGoals ?? ''] ?? GOAL_TIPS.Balanced;
    const industry = data.preferredIndustry ?? 'the market';

    return `Hi ${data.name.split(' ')[0]}, your dashboard is ready. Since you're interested in ${industry}, try adding ${picks} to your watchlist. ${tip}`;
};
