const STORAGE_KEY = 'stockpulse:recent-searches';
// Pre-rename key; read once so existing recent searches aren't lost.
const LEGACY_KEY = 'signalist:recent-searches';
const MAX_RECENT = 6;

export type RecentSearch = { symbol: string; name: string };

export const getRecentSearches = (): RecentSearch[] => {
    if (typeof window === 'undefined') return [];

    try {
        const raw = window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

export const addRecentSearch = (stock: RecentSearch) => {
    if (typeof window === 'undefined') return;

    const existing = getRecentSearches().filter((s) => s.symbol !== stock.symbol);
    const updated = [stock, ...existing].slice(0, MAX_RECENT);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

export const clearRecentSearches = () => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_KEY);
};
