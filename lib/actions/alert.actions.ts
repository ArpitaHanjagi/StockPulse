'use server';

import { FieldValue } from "firebase-admin/firestore";
import { getCurrentUser } from "@/lib/better-auth/session";
import { getPriceHistory, getQuote, getQuotes } from "@/lib/actions/market.actions";
import {
    THRESHOLD_RULES,
    averageVolume20,
    exchangeTimeZone,
    isAlertTriggered,
    isRecurringAlert,
    sessionKey,
    smartConditionMet,
} from "@/lib/alert-utils";
import { displaySymbol } from "@/lib/market/symbols";
import { alertsCollection, evaluateAlerts, fromSnapshot, toAlert } from "@/lib/alerts";
import { formatINR } from "@/lib/currency";

const getUserAlerts = async (userId: string) =>
    (await alertsCollection().where('userId', '==', userId).get()).docs.map(fromSnapshot);

// Loads an alert only if it belongs to `userId`.
const getOwnedAlert = async (alertId: string, userId: string) => {
    if (!alertId || alertId.includes('/')) return null;
    const snap = await alertsCollection().doc(alertId).get();
    if (!snap.exists || snap.get('userId') !== userId) return null;
    return snap;
};

export const getAlerts = async (): Promise<Alert[]> => {
    const user = await getCurrentUser();
    if (!user) return [];

    // Active alerts first, newest first — sorted in memory so no composite
    // Firestore index is needed.
    const docs = (await getUserAlerts(user.id)).sort(
        (a, b) => Number(a.triggered) - Number(b.triggered) || b.createdAt.getTime() - a.createdAt.getTime()
    );
    const quotes = await getQuotes(docs.map((d) => d.symbol));

    return docs.map((doc) => toAlert(doc, quotes[doc.symbol]));
};

// Evaluates the signed-in user's active alerts against live prices. Open
// tabs call this every minute so alerts pop up instantly; the scheduled
// /api/cron/check-alerts route covers the time when no tab is open.
export const checkPriceAlerts = async (): Promise<Alert[]> => {
    const user = await getCurrentUser();
    if (!user) return [];

    return evaluateAlerts(await getUserAlerts(user.id));
};

const ALERT_TYPES: AlertType[] = ['upper', 'lower', 'move', 'high52', 'low52', 'volume'];

// Validates the form for any alert type. For smart alerts whose condition
// is already true right now, returns the current session so the alert
// starts armed for the NEXT one instead of firing immediately.
const validateInput = async (
    data: AlertData
): Promise<{ error: string } | { threshold: number; lastFiredSession?: string; note?: string }> => {
    if (!data.alertName.trim()) return { error: 'Alert name is required' };
    if (!ALERT_TYPES.includes(data.alertType)) return { error: 'Choose a valid condition' };

    const symbol = data.symbol.trim().toUpperCase();
    const ticker = displaySymbol(symbol);
    const rule = THRESHOLD_RULES[data.alertType];
    let threshold = 0;
    if (rule) {
        threshold = Number(data.threshold);
        if (!Number.isFinite(threshold) || threshold < rule.min || threshold > rule.max) {
            return {
                error:
                    rule.unit === '₹'
                        ? 'Enter a valid target price'
                        : `Enter a value between ${rule.min} and ${rule.max} ${rule.unit === '%' ? 'percent' : '×'}`,
            };
        }
    }

    const quote = await getQuote(symbol);

    // Price targets that are already met would fire instantly — reject.
    if (!isRecurringAlert(data.alertType)) {
        if (quote?.price !== undefined && isAlertTriggered(data.alertType as 'upper' | 'lower', threshold, quote.price)) {
            return {
                error: `${ticker} is already at ${formatINR(quote.price)}. Set a target ${data.alertType === 'upper' ? 'above' : 'below'} the current price.`,
            };
        }
        return { threshold };
    }

    // Smart alerts already true this session wait for the next one.
    if (!quote) return { threshold };
    const avgVolume20 = data.alertType === 'volume' ? averageVolume20((await getPriceHistory(symbol, '1M'))?.candles ?? []) : undefined;
    const metNow = smartConditionMet(data.alertType, threshold, { ...quote, avgVolume20 });
    if (!metNow) return { threshold };
    return {
        threshold,
        lastFiredSession: sessionKey(quote.marketTime, exchangeTimeZone(symbol)),
        note: `${ticker} already meets this condition today, so the alert will start from the next trading session.`,
    };
};

export const createAlert = async (data: AlertData) => {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'You must be signed in to create alerts' };
    if (!data.symbol.trim()) return { success: false, error: 'Missing stock symbol' };

    const validated = await validateInput(data);
    if ('error' in validated) return { success: false, error: validated.error };

    try {
        await alertsCollection().add({
            userId: user.id,
            symbol: data.symbol.trim().toUpperCase(),
            company: data.company.trim() || data.symbol.trim().toUpperCase(),
            alertName: data.alertName.trim(),
            alertType: data.alertType,
            threshold: validated.threshold,
            triggered: false,
            ...(validated.lastFiredSession ? { lastFiredSession: validated.lastFiredSession } : {}),
            createdAt: new Date(),
        });
        return { success: true, note: validated.note };
    } catch (e) {
        console.error('Failed to create alert', e);
        return { success: false, error: 'Failed to create alert' };
    }
};

// Saving an alert (including a triggered one) re-arms it.
export const updateAlert = async (alertId: string, data: AlertData) => {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'You must be signed in to update alerts' };

    const validated = await validateInput(data);
    if ('error' in validated) return { success: false, error: validated.error };

    try {
        const snap = await getOwnedAlert(alertId, user.id);
        if (!snap) return { success: false, error: 'Alert not found' };

        await snap.ref.update({
            alertName: data.alertName.trim(),
            alertType: data.alertType,
            threshold: validated.threshold,
            triggered: false,
            triggeredAt: FieldValue.delete(),
            triggeredPrice: FieldValue.delete(),
            lastFiredSession: validated.lastFiredSession ?? FieldValue.delete(),
        });
        return { success: true, note: validated.note };
    } catch (e) {
        console.error('Failed to update alert', e);
        return { success: false, error: 'Failed to update alert' };
    }
};

export const deleteAlert = async (alertId: string) => {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'You must be signed in to delete alerts' };

    try {
        const snap = await getOwnedAlert(alertId, user.id);
        if (!snap) return { success: false, error: 'Alert not found' };

        await snap.ref.delete();
        return { success: true };
    } catch (e) {
        console.error('Failed to delete alert', e);
        return { success: false, error: 'Failed to delete alert' };
    }
};
