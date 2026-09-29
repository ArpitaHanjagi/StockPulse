// Technical-analysis summary computed from daily candles, in the same spirit
// as the common "buy/sell/neutral" gauges: each indicator votes, and the
// balance of votes gives the overall rating. Pure functions, no I/O.

export type Signal = 'Buy' | 'Sell' | 'Neutral';

export type IndicatorResult = { name: string; value?: number; signal: Signal };

export type Rating = 'Strong Buy' | 'Buy' | 'Neutral' | 'Sell' | 'Strong Sell';

export type TechnicalSummary = {
    rating: Rating;
    counts: Record<Signal, number>;
    movingAverages: IndicatorResult[];
    oscillators: IndicatorResult[];
    asOf: number;
};

type Candle = { t: number; h: number; l: number; c: number };

const last = <T,>(arr: T[]) => arr[arr.length - 1];

export const sma = (values: number[], period: number): (number | undefined)[] =>
    values.map((_, i) => {
        if (i + 1 < period) return undefined;
        let sum = 0;
        for (let j = i + 1 - period; j <= i; j++) sum += values[j];
        return sum / period;
    });

const ema = (values: number[], period: number): (number | undefined)[] => {
    const k = 2 / (period + 1);
    const out: (number | undefined)[] = [];
    let prev: number | undefined;
    values.forEach((v, i) => {
        if (i + 1 < period) return out.push(undefined);
        if (prev === undefined) {
            prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
        } else {
            prev = v * k + prev * (1 - k);
        }
        out.push(prev);
    });
    return out;
};

const rsi = (closes: number[], period = 14) => {
    if (closes.length <= period) return undefined;
    let gain = 0;
    let loss = 0;
    for (let i = 1; i <= period; i++) {
        const d = closes[i] - closes[i - 1];
        if (d >= 0) gain += d;
        else loss -= d;
    }
    gain /= period;
    loss /= period;
    for (let i = period + 1; i < closes.length; i++) {
        const d = closes[i] - closes[i - 1];
        gain = (gain * (period - 1) + Math.max(d, 0)) / period;
        loss = (loss * (period - 1) + Math.max(-d, 0)) / period;
    }
    if (loss === 0) return 100;
    return 100 - 100 / (1 + gain / loss);
};

const macd = (closes: number[]) => {
    const fast = ema(closes, 12);
    const slow = ema(closes, 26);
    const line = closes.map((_, i) => (fast[i] !== undefined && slow[i] !== undefined ? fast[i]! - slow[i]! : undefined));
    const defined = line.filter((v): v is number => v !== undefined);
    const signal = last(ema(defined, 9));
    return { macd: last(defined), signal };
};

const stochastic = (candles: Candle[], period = 14, smooth = 3) => {
    if (candles.length < period + smooth) return undefined;
    const ks: number[] = [];
    for (let i = candles.length - smooth; i < candles.length; i++) {
        const window = candles.slice(i + 1 - period, i + 1);
        const hi = Math.max(...window.map((c) => c.h));
        const lo = Math.min(...window.map((c) => c.l));
        ks.push(hi === lo ? 50 : ((candles[i].c - lo) / (hi - lo)) * 100);
    }
    return ks.reduce((a, b) => a + b, 0) / ks.length;
};

const cci = (candles: Candle[], period = 20) => {
    if (candles.length < period) return undefined;
    const tp = candles.slice(-period).map((c) => (c.h + c.l + c.c) / 3);
    const mean = tp.reduce((a, b) => a + b, 0) / period;
    const meanDev = tp.reduce((a, b) => a + Math.abs(b - mean), 0) / period;
    return meanDev === 0 ? 0 : (last(tp) - mean) / (0.015 * meanDev);
};

const williamsR = (candles: Candle[], period = 14) => {
    if (candles.length < period) return undefined;
    const window = candles.slice(-period);
    const hi = Math.max(...window.map((c) => c.h));
    const lo = Math.min(...window.map((c) => c.l));
    return hi === lo ? -50 : ((hi - last(candles).c) / (hi - lo)) * -100;
};

const byThreshold = (value: number | undefined, buyBelow: number, sellAbove: number): Signal =>
    value === undefined ? 'Neutral' : value < buyBelow ? 'Buy' : value > sellAbove ? 'Sell' : 'Neutral';

export const computeTechnicals = (candles: Candle[]): TechnicalSummary | null => {
    if (candles.length < 30) return null;

    const closes = candles.map((c) => c.c);
    const price = last(closes);

    const movingAverages: IndicatorResult[] = [];
    for (const period of [10, 20, 50, 100, 200]) {
        for (const [name, fn] of [['SMA', sma], ['EMA', ema]] as const) {
            const value = last(fn(closes, period));
            if (value === undefined) continue;
            movingAverages.push({ name: `${name} (${period})`, value, signal: price > value ? 'Buy' : price < value ? 'Sell' : 'Neutral' });
        }
    }

    const rsiValue = rsi(closes);
    const m = macd(closes);
    const stoch = stochastic(candles);
    const cciValue = cci(candles);
    const wr = williamsR(candles);
    const momentum = closes.length > 10 ? price - closes[closes.length - 11] : undefined;

    const oscillators: IndicatorResult[] = [
        { name: 'RSI (14)', value: rsiValue, signal: byThreshold(rsiValue, 30, 70) },
        { name: 'Stochastic %K (14, 3)', value: stoch, signal: byThreshold(stoch, 20, 80) },
        { name: 'CCI (20)', value: cciValue, signal: byThreshold(cciValue, -100, 100) },
        { name: 'Williams %R (14)', value: wr, signal: byThreshold(wr, -80, -20) },
        {
            name: 'MACD (12, 26)',
            value: m.macd,
            signal: m.macd === undefined || m.signal === undefined ? 'Neutral' : m.macd > m.signal ? 'Buy' : 'Sell',
        },
        {
            name: 'Momentum (10)',
            value: momentum,
            signal: momentum === undefined || momentum === 0 ? 'Neutral' : momentum > 0 ? 'Buy' : 'Sell',
        },
    ];

    const all = [...movingAverages, ...oscillators];
    const counts: Record<Signal, number> = { Buy: 0, Sell: 0, Neutral: 0 };
    all.forEach((r) => counts[r.signal]++);

    const score = (counts.Buy - counts.Sell) / all.length;
    const rating: Rating =
        score > 0.5 ? 'Strong Buy' : score > 0.1 ? 'Buy' : score < -0.5 ? 'Strong Sell' : score < -0.1 ? 'Sell' : 'Neutral';

    return { rating, counts, movingAverages, oscillators, asOf: last(candles).t };
};
