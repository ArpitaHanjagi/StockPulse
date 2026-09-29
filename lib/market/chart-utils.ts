// Evenly spaced "nice" axis ticks (1, 2, 2.5, 5 × 10ⁿ) covering [min, max].
export const niceTicks = (min: number, max: number, count = 5) => {
    const span = max - min || Math.abs(max) || 1;
    const rough = span / count;
    const pow = Math.pow(10, Math.floor(Math.log10(rough)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= rough) ?? rough;
    const ticks: number[] = [];
    for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) ticks.push(Number(v.toFixed(10)));
    return ticks;
};
