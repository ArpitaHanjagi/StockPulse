const FRANKFURTER_URL = 'https://api.frankfurter.dev/v1/latest';

// Some exchanges quote prices in a currency's minor unit (e.g. London in
// pence). Map those to the major currency plus the divisor to apply.
const MINOR_UNITS: Record<string, [string, number]> = {
    GBp: ['GBP', 100],
    GBX: ['GBP', 100],
    ZAc: ['ZAR', 100],
    ILA: ['ILS', 100],
};

// Live rate for converting `currency` -> INR, revalidated hourly. Free, no
// API key needed. Returns null rather than guessing a stale/fabricated rate
// when the lookup fails — callers must treat null as "conversion
// unavailable" and show a missing-data state instead of a wrong price.
export const getRateToInr = async (currency = 'USD'): Promise<number | null> => {
    const [base, divisor] = MINOR_UNITS[currency] ?? [currency.toUpperCase(), 1];
    if (base === 'INR') return 1 / divisor;

    try {
        const res = await fetch(`${FRANKFURTER_URL}?base=${encodeURIComponent(base)}&symbols=INR`, {
            next: { revalidate: 3600 },
        });
        if (!res.ok) throw new Error(`Exchange rate request failed: ${res.status}`);

        const data = await res.json();
        const rate = data?.rates?.INR;
        if (typeof rate !== 'number') throw new Error('Malformed exchange rate response');

        return rate / divisor;
    } catch (e) {
        console.error(`[currency] failed to fetch ${base}/INR rate`, e);
        return null;
    }
};

// Daily history of `currency` -> INR between two dates, as a sorted series
// ({ t: unix seconds, v: rupees per unit }). Null for INR itself or when
// the rate history is unavailable.
export const getRateSeriesToInr = async (currency: string, from: Date, to: Date): Promise<{ t: number; v: number }[] | null> => {
    const [base, divisor] = MINOR_UNITS[currency] ?? [currency.toUpperCase(), 1];
    if (base === 'INR') return null;
    const day = (d: Date) => d.toISOString().slice(0, 10);

    try {
        const res = await fetch(`${FRANKFURTER_URL.replace('/latest', '')}/${day(from)}..${day(to)}?base=${encodeURIComponent(base)}&symbols=INR`, {
            next: { revalidate: 12 * 3600 },
        });
        if (!res.ok) throw new Error(`Exchange rate history request failed: ${res.status}`);
        const data = await res.json();
        const series = Object.entries((data?.rates ?? {}) as Record<string, { INR?: number }>)
            .filter(([, r]) => typeof r?.INR === 'number')
            .map(([date, r]) => ({ t: Date.parse(`${date}T00:00:00Z`) / 1000, v: r.INR! / divisor }))
            .sort((a, b) => a.t - b.t);
        return series.length > 0 ? series : null;
    } catch (e) {
        console.error(`[currency] failed to fetch ${base}/INR history`, e);
        return null;
    }
};

export const formatINR = (amount?: number): string => {
    if (amount === undefined || Number.isNaN(amount)) return '—';
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2,
    }).format(amount);
};

// Compact Lakh/Crore/Lakh Crore formatting for large values, matching how
// these numbers are conventionally written in Indian financial media.
export const formatINRCompact = (amount?: number): string => {
    if (amount === undefined || Number.isNaN(amount)) return '—';

    const LAKH = 1_00_000;
    const CRORE = 1_00_00_000;
    const LAKH_CRORE = LAKH * CRORE;

    const abs = Math.abs(amount);

    if (abs >= LAKH_CRORE) {
        return `₹${(amount / LAKH_CRORE).toLocaleString('en-IN', { maximumFractionDigits: 2 })} Lakh Cr`;
    }
    if (abs >= CRORE) {
        return `₹${(amount / CRORE).toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr`;
    }
    if (abs >= LAKH) {
        return `₹${(amount / LAKH).toLocaleString('en-IN', { maximumFractionDigits: 2 })} L`;
    }

    return formatINR(amount);
};

export const formatPercent = (value?: number): string => {
    if (value === undefined || Number.isNaN(value)) return '—';
    return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
};

export const formatVolume = (value?: number): string => {
    if (value === undefined || Number.isNaN(value)) return '—';
    return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
};

export const formatINRRange = (low?: number, high?: number): string => {
    if (low === undefined || high === undefined) return '—';
    return `${formatINR(low)} – ${formatINR(high)}`;
};
