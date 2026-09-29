import { Activity, Building2, Globe2, Minus } from 'lucide-react';

// Labels + icons for the "Why is it moving?" driver, shared by the stock
// page card and the dashboard inspector.
export const DRIVER_BADGE: Record<MoveReport['driver'], { label: string; icon: typeof Activity }> = {
    stock: { label: 'Company-specific', icon: Building2 },
    sector: { label: 'Sector-wide', icon: Activity },
    market: { label: 'Market-wide', icon: Globe2 },
    flat: { label: 'Barely moved', icon: Minus },
};
