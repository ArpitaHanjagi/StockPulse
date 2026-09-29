import type { DocumentSnapshot } from "firebase-admin/firestore";
import { COLLECTIONS, getDb, toDate } from "@/DATABASE/firebase";
import { getPriceHistory, getQuotes } from "@/lib/actions/market.actions";
import {
    averageVolume20,
    exchangeTimeZone,
    isAlertTriggered,
    isRecurringAlert,
    sessionKey,
    smartAlertText,
    smartConditionMet,
} from "@/lib/alert-utils";
import { createNotification } from "@/lib/notifications";
import { formatINR } from "@/lib/currency";
import { displaySymbol } from '@/lib/market/symbols';

// Server-only helpers shared by the alert server actions and the scheduled
// /api/cron/check-alerts route. Deliberately not a 'use server' file: these
// take a user id (or none) and must never be callable from the client.

export type AlertDoc = {
    id: string;
    userId: string;
    symbol: string;
    company: string;
    alertName: string;
    alertType: AlertType;
    threshold: number;
    triggered: boolean;
    triggeredAt?: Date;
    triggeredPrice?: number;
    // Smart alerts: the trading session (YYYY-MM-DD) they last fired in.
    lastFiredSession?: string;
    createdAt: Date;
};

export const alertsCollection = () => getDb().collection(COLLECTIONS.alerts);

export const fromSnapshot = (doc: DocumentSnapshot): AlertDoc => {
    const data = doc.data()!;
    return {
        id: doc.id,
        userId: data.userId,
        symbol: data.symbol,
        company: data.company,
        alertName: data.alertName,
        alertType: data.alertType,
        threshold: data.threshold,
        triggered: !!data.triggered,
        triggeredAt: toDate(data.triggeredAt),
        triggeredPrice: data.triggeredPrice,
        lastFiredSession: data.lastFiredSession,
        createdAt: toDate(data.createdAt) ?? new Date(0),
    };
};

// For smart alerts: whether this session's slot is used by an actual fire,
// or reserved because the condition was already true when it was created.
const sessionState = (doc: AlertDoc, quote: StockQuote | null | undefined) => {
    if (!isRecurringAlert(doc.alertType) || !doc.lastFiredSession) return {};
    const tz = exchangeTimeZone(doc.symbol);
    const current = sessionKey(quote?.marketTime, tz);
    if (doc.lastFiredSession !== current) return {};
    const firedThisSession = !!doc.triggeredAt && sessionKey(doc.triggeredAt.getTime() / 1000, tz) === current;
    return firedThisSession ? { firedToday: true } : { startsNextSession: true };
};

export const toAlert = (doc: AlertDoc, quote: StockQuote | null | undefined): Alert => ({
    recurring: isRecurringAlert(doc.alertType),
    ...sessionState(doc, quote),
    id: doc.id,
    symbol: doc.symbol,
    company: doc.company,
    alertName: doc.alertName,
    alertType: doc.alertType,
    threshold: doc.threshold,
    currentPrice: quote?.price,
    changePercent: quote?.changePercent,
    triggered: doc.triggered,
    triggeredAt: doc.triggeredAt?.toISOString(),
    triggeredPrice: doc.triggeredPrice,
});

// Every active alert across all users — used by the scheduled check.
export const getAllActiveAlerts = async () =>
    (await alertsCollection().where('triggered', '==', false).get()).docs.map(fromSnapshot);

// Evaluates active alerts against live data.
//  - Price targets ('upper'/'lower') fire once: flipped to triggered.
//  - Smart alerts fire at most once per trading session: the session is
//    recorded in `lastFiredSession` and they stay active for the next one.
// Both are claimed inside a transaction, so the open-tab poller and the
// scheduled check can run at the same time and still fire exactly once.
// Every hit becomes an in-app notification for the alert's owner.
export const evaluateAlerts = async (docs: AlertDoc[]): Promise<(Alert & { userId: string })[]> => {
    const active = docs.filter((d) => !d.triggered);
    if (active.length === 0) return [];

    const quotes = await getQuotes(active.map((d) => d.symbol));

    // Average volume is only needed for volume alerts (one history fetch
    // per distinct symbol, cached upstream).
    const volumeSymbols = [...new Set(active.filter((d) => d.alertType === 'volume').map((d) => d.symbol.toUpperCase()))];
    const avgVolumes = Object.fromEntries(
        await Promise.all(
            volumeSymbols.map(async (sym) => [sym, averageVolume20((await getPriceHistory(sym, '1M'))?.candles ?? [])] as const)
        )
    );

    const fired: (Alert & { userId: string })[] = [];

    for (const doc of active) {
        const symbol = doc.symbol.toUpperCase();
        const quote = quotes[symbol];
        const price = quote?.price;
        if (!quote || price === undefined) continue;
        const ref = alertsCollection().doc(doc.id);
        const now = new Date();

        if (!isRecurringAlert(doc.alertType)) {
            if (!isAlertTriggered(doc.alertType as 'upper' | 'lower', doc.threshold, price)) continue;

            const claimed = await getDb().runTransaction(async (tx) => {
                const snap = await tx.get(ref);
                if (!snap.exists || snap.get('triggered')) return false;
                tx.update(ref, { triggered: true, triggeredAt: now, triggeredPrice: price });
                return true;
            });
            if (!claimed) continue;

            const direction = doc.alertType === 'upper' ? 'rose above' : 'fell below';
            const title = `${displaySymbol(doc.symbol)} ${direction} ${formatINR(doc.threshold)}`;
            const message = `"${doc.alertName}" triggered — ${doc.company} is now trading at ${formatINR(price)}.`;
            await createNotification(doc.userId, { type: 'alert', title, message, link: `/stocks/${doc.symbol}` });
            fired.push({ ...toAlert({ ...doc, triggered: true, triggeredAt: now, triggeredPrice: price }, quote), title, message, userId: doc.userId });
            continue;
        }

        // Smart alert
        const session = sessionKey(quote.marketTime, exchangeTimeZone(symbol));
        if (!session || doc.lastFiredSession === session) continue;

        const ctx = {
            price,
            changePercent: quote.changePercent,
            yearHigh: quote.yearHigh,
            yearLow: quote.yearLow,
            volume: quote.volume,
            avgVolume20: avgVolumes[symbol],
        };
        if (!smartConditionMet(doc.alertType, doc.threshold, ctx)) continue;

        const claimed = await getDb().runTransaction(async (tx) => {
            const snap = await tx.get(ref);
            if (!snap.exists || snap.get('lastFiredSession') === session) return false;
            tx.update(ref, { lastFiredSession: session, triggeredAt: now, triggeredPrice: price });
            return true;
        });
        if (!claimed) continue;

        const { title, message } = smartAlertText(doc.alertType, displaySymbol(doc.symbol), doc.company, doc.alertName, ctx);
        await createNotification(doc.userId, { type: 'alert', title, message, link: `/stocks/${doc.symbol}` });
        fired.push({
            ...toAlert({ ...doc, lastFiredSession: session, triggeredAt: now, triggeredPrice: price }, quote),
            title,
            message,
            userId: doc.userId,
        });
    }

    return fired;
};
