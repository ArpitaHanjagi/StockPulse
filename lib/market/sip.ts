// SIP (systematic investment plan) backtest: invest a fixed rupee amount
// every month and track what it grows to. Pure functions, no I/O.
//
// Assumptions (shown to users): each instalment buys at that month's opening
// price; prices are split-adjusted; dividends, taxes and charges are
// excluded; foreign prices are converted at that month's exchange rate.

export type MonthlyBar = { t: number; o: number; c: number };

export type SipSeriesPoint = { t: number; invested: number; value: number };

// `rateAt(t)` = rupees per unit of the listing currency on date t (1 for INR).
export const simulateSip = (bars: MonthlyBar[], monthly: number, rateAt: (t: number) => number | undefined) => {
    let units = 0;
    let invested = 0;
    const points: SipSeriesPoint[] = [];
    const cashflows: { t: number; amount: number }[] = [];

    for (const bar of bars) {
        const rate = rateAt(bar.t);
        if (!rate || !(bar.o > 0)) continue;
        units += monthly / (bar.o * rate);
        invested += monthly;
        cashflows.push({ t: bar.t, amount: -monthly });
        const closeRate = rateAt(bar.t) ?? rate;
        points.push({ t: bar.t, invested, value: units * bar.c * closeRate });
    }

    return { points, cashflows, units, invested };
};

// Monthly deposits into a fixed deposit compounding monthly at `annualRate`.
export const simulateFd = (months: number[], monthly: number, annualRate: number) => {
    const r = annualRate / 12;
    let balance = 0;
    return months.map((t) => {
        balance = balance * (1 + r) + monthly;
        return { t, value: balance };
    });
};

// XIRR: the annual rate that makes the net present value of dated
// cashflows zero (Newton's method, falling back to bisection).
export const xirr = (cashflows: { t: number; amount: number }[]) => {
    if (cashflows.length < 2 || !cashflows.some((c) => c.amount > 0) || !cashflows.some((c) => c.amount < 0)) return undefined;
    const t0 = cashflows[0].t;
    const years = (t: number) => (t - t0) / (365.25 * 24 * 3600);
    const npv = (rate: number) => cashflows.reduce((sum, c) => sum + c.amount / Math.pow(1 + rate, years(c.t)), 0);
    const dnpv = (rate: number) => cashflows.reduce((sum, c) => sum - (years(c.t) * c.amount) / Math.pow(1 + rate, years(c.t) + 1), 0);

    let rate = 0.1;
    for (let i = 0; i < 50; i++) {
        const f = npv(rate);
        const d = dnpv(rate);
        if (!Number.isFinite(f) || !Number.isFinite(d) || d === 0) break;
        const next = rate - f / d;
        if (!Number.isFinite(next) || next <= -0.9999) break;
        if (Math.abs(next - rate) < 1e-7) return next;
        rate = next;
    }

    // Bisection fallback on [-99%, +1000%].
    let lo = -0.99;
    let hi = 10;
    if (npv(lo) * npv(hi) > 0) return undefined;
    for (let i = 0; i < 200; i++) {
        const mid = (lo + hi) / 2;
        if (npv(lo) * npv(mid) <= 0) hi = mid;
        else lo = mid;
    }
    return (lo + hi) / 2;
};

// Finds the latest known value at or before `t` in a sorted series.
export const lookupAtOrBefore = (series: { t: number; v: number }[], t: number) => {
    let lo = 0;
    let hi = series.length - 1;
    let found: number | undefined;
    while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (series[mid].t <= t) {
            found = series[mid].v;
            lo = mid + 1;
        } else hi = mid - 1;
    }
    return found ?? series[0]?.v;
};

export const monthKey = (t: number, timeZone: string) =>
    new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit' }).format(new Date(t * 1000));
