// Chart colours for the app's dark surface. Validated with the dataviz
// palette checker (colour-vision-deficiency safe), which rejects the usual
// green/red pair — so "up" is blue and "down" is red, and candles also
// differ by shape (hollow = up, filled = down) so colour is never the only cue.
export const CHART_COLORS = {
    up: '#3987e5',
    down: '#e66767',
    sma20: '#c98500',
    sma50: '#9085e9',
    grid: '#262626',
    axis: '#8b8b8b',
    crosshair: '#6b6b6b',
    // Diverging heatmap steps, strongest move first; neutral gray midpoint.
    heatUp: ['#2a78d6', '#1c5cab', '#184f95'],
    heatDown: ['#c93f3f', '#a33636', '#7d2e2e'],
    heatNeutral: '#383835',
    // Compare chart: categorical slots 1–3, validated all-pairs on dark.
    compare: ['#3987e5', '#d95926', '#199e70'],
} as const;

// Picks a heatmap fill for a daily % change (clamped at ±3%).
export const heatColor = (changePercent?: number) => {
    if (changePercent === undefined || Math.abs(changePercent) < 0.1) return CHART_COLORS.heatNeutral;
    const magnitude = Math.abs(changePercent);
    const step = magnitude >= 2 ? 0 : magnitude >= 1 ? 1 : 2;
    return changePercent > 0 ? CHART_COLORS.heatUp[step] : CHART_COLORS.heatDown[step];
};
