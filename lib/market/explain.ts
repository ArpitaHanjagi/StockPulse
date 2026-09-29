// "Why is it moving?" — a rule-based explanation of a stock's latest move.
// Pure functions, no I/O, so the logic is unit-testable.
//
// It explains HOW the stock moved (with the market, with its sector, or on
// its own; on what volume; from what gap; near which extremes) using price
// data we can verify. It never invents a cause: headlines are attached only
// when they name the company, and the wording stays descriptive.

export type Driver = 'flat' | 'market' | 'sector' | 'stock';

export type Benchmark = { label: string; changePercent?: number };

export type MoveInput = {
    name: string;
    changePercent?: number;
    price?: number;
    // Opening gap vs the previous close, in % (computed from one currency's
    // price history, so it's independent of the INR conversion).
    gapPercent?: number;
    yearHigh?: number;
    yearLow?: number;
    volume?: number;
    avgVolume20?: number;
    market: Benchmark;
    sector?: Benchmark;
    sessionOpen: boolean;
};

export type MoveExplanation = {
    driver: Driver;
    direction: 'up' | 'down' | 'flat';
    headline: string;
    points: string[];
};

const FLAT_THRESHOLD = 0.3; // % — smaller moves are treated as "barely moved"

const signed = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(2)}%`;
const sameDirection = (a: number, b: number) => (a > 0 && b > 0) || (a < 0 && b < 0);

// A benchmark "explains" the move when it went the same way and the stock
// didn't move much more (or less) than it: within 0.5 points, or 30% of the
// stock's own move for bigger swings.
const explainedBy = (stock: number, bench?: number) =>
    bench !== undefined && sameDirection(stock, bench) && Math.abs(stock - bench) <= Math.max(0.5, Math.abs(stock) * 0.3);

export const classifyMove = (stock: number, market?: number, sector?: number): Driver => {
    if (Math.abs(stock) < FLAT_THRESHOLD) return 'flat';
    const withMarket = explainedBy(stock, market);
    const withSector = explainedBy(stock, sector);
    if (withMarket) return 'market';
    if (withSector) return 'sector';
    return 'stock';
};

export const explainMove = (input: MoveInput): MoveExplanation | null => {
    const s = input.changePercent;
    if (s === undefined) return null;

    const m = input.market.changePercent;
    const k = input.sector?.changePercent;
    const driver = classifyMove(s, m, k);
    const direction = Math.abs(s) < FLAT_THRESHOLD ? 'flat' : s > 0 ? 'up' : 'down';
    const when = input.sessionOpen ? 'today' : 'in the latest session';
    const verb = s >= 0 ? 'rose' : 'fell';

    const summary: Record<Driver, string> = {
        flat: `${input.name} barely moved ${when} (${signed(s)}).`,
        market: `${input.name} ${verb} ${Math.abs(s).toFixed(2)}% ${when}, broadly in line with the overall market.`,
        sector: `${input.name} ${verb} ${Math.abs(s).toFixed(2)}% ${when}, moving with its sector rather than the wider market.`,
        stock: `${input.name} ${verb} ${Math.abs(s).toFixed(2)}% ${when} — a mostly company-specific move.`,
    };

    const points: string[] = [];

    // 1. Relative performance vs market and sector.
    if (m !== undefined) {
        const benches = [`${input.market.label} ${signed(m)}`];
        if (k !== undefined && input.sector) benches.push(`${input.sector.label} ${signed(k)}`);
        const ref = k !== undefined ? k : m;
        const refLabel = k !== undefined && input.sector ? 'its sector' : 'the market';
        const gap = s - ref;
        const relation =
            Math.abs(gap) < 0.25 ? `tracked ${refLabel} closely` : `${gap > 0 ? 'outperformed' : 'underperformed'} ${refLabel} by ${Math.abs(gap).toFixed(2)} percentage points`;
        points.push(`${benches.join(' · ')} — ${input.name} ${relation}.`);
    }

    // 2. Volume vs its recent average. During a session the volume is only
    // partial, so "light volume" is only claimed after the close.
    if (input.volume !== undefined && input.avgVolume20) {
        const ratio = input.volume / input.avgVolume20;
        if (ratio >= 1.5) {
            points.push(`Trading volume is ${ratio.toFixed(1)}× its 20-day average${input.sessionOpen ? ' already' : ''} — unusually heavy interest.`);
        } else if (!input.sessionOpen && ratio <= 0.6) {
            points.push(`Volume was light (${ratio.toFixed(1)}× its 20-day average), so the move had limited participation.`);
        }
    }

    // 3. Opening gap.
    if (input.gapPercent !== undefined) {
        const gapPct = input.gapPercent;
        if (Math.abs(gapPct) >= 1) {
            points.push(`It opened ${Math.abs(gapPct).toFixed(1)}% ${gapPct > 0 ? 'above' : 'below'} the previous close (a gap ${gapPct > 0 ? 'up' : 'down'}), which often follows overnight news.`);
        }
    }

    // 4. 52-week extremes.
    const { price, yearHigh, yearLow } = input;
    if (price !== undefined && yearHigh && price >= yearHigh * 0.999) {
        points.push('It is trading at a new 52-week high.');
    } else if (price !== undefined && yearLow && price <= yearLow * 1.001) {
        points.push('It is trading at a new 52-week low.');
    } else if (price !== undefined && yearHigh && price >= yearHigh * 0.97) {
        points.push(`It is within ${(((yearHigh - price) / yearHigh) * 100).toFixed(1)}% of its 52-week high.`);
    } else if (price !== undefined && yearLow && price <= yearLow * 1.03) {
        points.push(`It is within ${(((price - yearLow) / yearLow) * 100).toFixed(1)}% of its 52-week low.`);
    }

    return { driver, direction, headline: summary[driver], points };
};
