'use server';

import { cache } from "react";
import { COLLECTIONS, getDb, toDate } from "@/DATABASE/firebase";
import { getCurrentUser } from "@/lib/better-auth/session";
import { getQuotes } from "@/lib/actions/market.actions";
import { toStockWithData } from "@/lib/market/format";

type WatchlistDoc = { userId: string; symbol: string; company: string; addedAt: Date };

// One document per (user, symbol), so adding the same stock twice is a
// no-op by construction. encodeURIComponent keeps ids free of '/'.
const watchlistDocId = (userId: string, symbol: string) => `${userId}_${encodeURIComponent(symbol.toUpperCase())}`;

// Memoised per request so the header and the page share one Firestore read.
const getUserWatchlist = cache(async (userId: string): Promise<WatchlistDoc[]> => {
    const snap = await getDb().collection(COLLECTIONS.watchlists).where('userId', '==', userId).get();
    return snap.docs
        .map((doc) => {
            const data = doc.data();
            return { userId: data.userId, symbol: data.symbol, company: data.company, addedAt: toDate(data.addedAt) ?? new Date(0) };
        })
        .sort((a, b) => b.addedAt.getTime() - a.addedAt.getTime());
});

export const getWatchlistSymbols = async (): Promise<string[]> => {
    const user = await getCurrentUser();
    if (!user) return [];

    return (await getUserWatchlist(user.id)).map((item) => item.symbol);
};

export const getWatchlistWithData = async (limit?: number): Promise<StockWithData[]> => {
    const user = await getCurrentUser();
    if (!user) return [];

    const items = (await getUserWatchlist(user.id)).slice(0, limit);
    const quotes = await getQuotes(items.map((item) => item.symbol));
    return items.map((item) => toStockWithData(item, quotes[item.symbol]));
};

export const addToWatchlist = async (symbol: string, company: string) => {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'You must be signed in to use the watchlist' };
    if (!symbol.trim()) return { success: false, error: 'Missing stock symbol' };

    const upper = symbol.trim().toUpperCase();

    try {
        await getDb()
            .collection(COLLECTIONS.watchlists)
            .doc(watchlistDocId(user.id, upper))
            .create({ userId: user.id, symbol: upper, company: company.trim() || upper, addedAt: new Date() });
        return { success: true };
    } catch (e) {
        // ALREADY_EXISTS: it's already in the watchlist, which is what the
        // user wanted.
        if ((e as { code?: number }).code === 6) return { success: true };
        console.error('Failed to add to watchlist', e);
        return { success: false, error: 'Failed to add to watchlist' };
    }
};

export const removeFromWatchlist = async (symbol: string) => {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'You must be signed in to use the watchlist' };

    try {
        await getDb().collection(COLLECTIONS.watchlists).doc(watchlistDocId(user.id, symbol.trim())).delete();
        return { success: true };
    } catch (e) {
        console.error('Failed to remove from watchlist', e);
        return { success: false, error: 'Failed to remove from watchlist' };
    }
};
