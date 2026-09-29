import type { Transition } from 'motion/react';

// Spring presets. Springs carry their current velocity into the next
// target, so an interrupted hover or a close-while-opening reverses
// smoothly instead of snapping — unlike fixed CSS easing curves.
export const SPRINGS = {
    // Hover lift / press: quick and slightly bouncy.
    hover: { type: 'spring', stiffness: 420, damping: 26, mass: 0.6 },
    // Tile → inspector morph and back.
    expand: { type: 'spring', stiffness: 300, damping: 32, mass: 0.9 },
    // Small feedback pulses (heatmap tile on a price change).
    pulse: { type: 'spring', stiffness: 600, damping: 18, mass: 0.5 },
} satisfies Record<string, Transition>;

// Only transform/opacity are animated anywhere (GPU-composited, no layout
// or paint work per frame).
export const HOVER_LIFT = { y: -3, scale: 1.015 } as const;
export const PRESS = { scale: 0.98 } as const;
