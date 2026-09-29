// Alert conditions — pure helpers shared by the server (evaluation) and the
// UI (labels). No I/O.

import { formatINR } from '@/lib/currency';

export const PRICE_ALERT_TYPES = ['upper', 'lower'] as const;
export const SMART_ALERT_TYPES = ['move', 'high52', 'low52', 'volume'] as const;

// Price targets fire once. Smart alerts watch for recurring events and fire
// at most once per trading session, re-arming for the next one.
export const isRecurringAlert = (type: AlertType) => (SMART_ALERT_TYPES as readonly string[]).includes(type);

export const needsThreshold = (type: AlertType) => type !== 'high52' && type !== 'low52';

// Allowed threshold ranges per type.
export const THRESHOLD_RULES: Record<AlertType, { min: number; max: number; label: string; placeholder: string; unit: string } | null> = {
    upper: { min: 0.01, max: Number.MAX_SAFE_INTEGER, label: 'Target price (₹)', placeholder: 'e.g. 1500', unit: '₹' },
    lower: { min: 0.01, max: Number.MAX_SAFE_INTEGER, label: 'Target price (₹)', placeholder: 'e.g. 1200', unit: '₹' },
    move: { min: 0.5, max: 50, label: 'Move size (% in a day)', placeholder: 'e.g. 3', unit: '%' },
    volume: { min: 1.2, max: 20, label: 'Volume multiple (× 20-day average)', placeholder: 'e.g. 2', unit: '×' },
    high52: null,
    low52: null,
};

export const isAlertTriggered = (alertType: 'upper' | 'lower', threshold: number, currentPrice: number) =>
    alertType === 'upper' ? currentPrice >= threshold : currentPrice <= threshold;

export type SmartContext = {
    price?: number;
    changePercent?: number;
    yearHigh?: number;
    yearLow?: number;
    volume?: number;
    avgVolume20?: number;
};

export const smartConditionMet = (type: AlertType, threshold: number, ctx: SmartContext): boolean => {
    switch (type) {
        case 'move':
            return ctx.changePercent !== undefined && Math.abs(ctx.changePercent) >= threshold;
        case 'high52':
            return ctx.price !== undefined && !!ctx.yearHigh && ctx.price >= ctx.yearHigh * 0.999;
        case 'low52':
            return ctx.price !== undefined && !!ctx.yearLow && ctx.price <= ctx.yearLow * 1.001;
        case 'volume':
            return ctx.volume !== undefined && !!ctx.avgVolume20 && ctx.volume / ctx.avgVolume20 >= threshold;
        default:
            return false;
    }
};

// The trading session a quote belongs to (YYYY-MM-DD in the exchange's own
// time zone), so a smart alert fires at most once per session.
export const sessionKey = (marketTimeSec: number | undefined, timeZone: string) =>
    marketTimeSec === undefined
        ? undefined
        : new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(marketTimeSec * 1000));

export const exchangeTimeZone = (symbol: string) =>
    /\.(NS|BO)$/i.test(symbol) || symbol.startsWith('^NSE') || symbol === '^BSESN' ? 'Asia/Kolkata' : 'America/New_York';

// Human description of an alert's condition, for lists and forms.
export const describeCondition = (type: AlertType, threshold: number) => {
    switch (type) {
        case 'upper':
            return `Price rises above ${formatINR(threshold)}`;
        case 'lower':
            return `Price falls below ${formatINR(threshold)}`;
        case 'move':
            return `Moves ±${threshold}% or more in a day`;
        case 'high52':
            return 'Hits a new 52-week high';
        case 'low52':
            return 'Hits a new 52-week low';
        case 'volume':
            return `Volume reaches ${threshold}× its 20-day average`;
    }
};

// Notification text when a smart alert fires.
export const smartAlertText = (
    type: AlertType,
    ticker: string,
    company: string,
    alertName: string,
    ctx: SmartContext
): { title: string; message: string } => {
    const price = formatINR(ctx.price);
    const chg = ctx.changePercent !== undefined ? `${ctx.changePercent >= 0 ? '▲ +' : '▼ '}${ctx.changePercent.toFixed(2)}%` : '';
    switch (type) {
        case 'move':
            return {
                title: `${ticker} ${ctx.changePercent !== undefined && ctx.changePercent < 0 ? 'fell' : 'rose'} ${Math.abs(ctx.changePercent ?? 0).toFixed(1)}% today`,
                message: `"${alertName}" — ${company} is at ${price} (${chg}).`,
            };
        case 'high52':
            return { title: `${ticker} hit a new 52-week high`, message: `"${alertName}" — ${company} is at ${price} (${chg}).` };
        case 'low52':
            return { title: `${ticker} hit a new 52-week low`, message: `"${alertName}" — ${company} is at ${price} (${chg}).` };
        case 'volume': {
            const ratio = ctx.volume && ctx.avgVolume20 ? (ctx.volume / ctx.avgVolume20).toFixed(1) : '?';
            return { title: `Unusual volume in ${ticker}: ${ratio}× normal`, message: `"${alertName}" — ${company} is at ${price} (${chg}).` };
        }
        default:
            return { title: `${ticker} alert`, message: `"${alertName}" triggered.` };
    }
};

// Average daily volume over the 20 sessions before the latest (possibly
// partial) one. Undefined when there isn't enough history.
export const averageVolume20 = (candles: { v: number }[]) => {
    const past = candles.slice(-21, -1).filter((c) => c.v > 0);
    return past.length >= 10 ? past.reduce((sum, c) => sum + c.v, 0) / past.length : undefined;
};
