// Exchange holidays and early closes, keyed by local date "YYYY-MM-DD".
//
// NYSE: computed from the exchange's published rules, so every year is
// covered, including the 1:00 PM early closes.
// NSE: only the fixed-date national holidays. Festival holidays (Holi,
// Diwali, Eid, …) follow the lunar calendar and are announced by NSE each
// year — add them to NSE_EXTRA_HOLIDAYS from the official list.

export type SpecialDay = 'closed' | { closesAt: [number, number] };
type Calendar = Record<string, SpecialDay>;

const pad = (n: number) => String(n).padStart(2, '0');

// Date.UTC normalises overflow (e.g. day 0 or 32), which keeps the rules simple.
const utc = (year: number, month: number, day: number) => new Date(Date.UTC(year, month - 1, day));
const keyOf = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const dateKey = (year: number, month: number, day: number) => keyOf(utc(year, month, day));

// n-th given weekday (0=Sun) of a month; n = -1 for the last one.
const nthWeekday = (year: number, month: number, weekday: number, n: number) => {
    if (n === -1) {
        const last = utc(year, month + 1, 0);
        return utc(year, month, last.getUTCDate() - ((last.getUTCDay() - weekday + 7) % 7));
    }
    const first = utc(year, month, 1).getUTCDay();
    return utc(year, month, 1 + ((weekday - first + 7) % 7) + (n - 1) * 7);
};

// Saturday holidays move to Friday, Sunday holidays to Monday.
const observed = (year: number, month: number, day: number) => {
    const d = utc(year, month, day);
    const wd = d.getUTCDay();
    return wd === 6 ? utc(year, month, day - 1) : wd === 0 ? utc(year, month, day + 1) : d;
};

// Gregorian Easter Sunday (anonymous algorithm).
const easter = (year: number) => {
    const a = year % 19, b = Math.floor(year / 100), c = year % 100;
    const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    return utc(year, month, ((h + l - 7 * m + 114) % 31) + 1);
};

const buildNyse = (year: number): Calendar => {
    const cal: Calendar = {};
    const close = (d: Date) => (cal[keyOf(d)] = 'closed');
    const earlyClose = (d: Date) => {
        const wd = d.getUTCDay();
        if (wd >= 1 && wd <= 5 && !cal[keyOf(d)]) cal[keyOf(d)] = { closesAt: [13, 0] };
    };

    // New Year's Day on a Saturday is not made up on the Friday before.
    if (utc(year, 1, 1).getUTCDay() !== 6) close(observed(year, 1, 1));
    close(nthWeekday(year, 1, 1, 3)); // Martin Luther King Jr. Day
    close(nthWeekday(year, 2, 1, 3)); // Washington's Birthday
    const e = easter(year);
    close(utc(year, e.getUTCMonth() + 1, e.getUTCDate() - 2)); // Good Friday
    close(nthWeekday(year, 5, 1, -1)); // Memorial Day
    if (year >= 2022) close(observed(year, 6, 19)); // Juneteenth
    close(observed(year, 7, 4)); // Independence Day
    close(nthWeekday(year, 9, 1, 1)); // Labor Day
    const thanksgiving = nthWeekday(year, 11, 4, 4);
    close(thanksgiving);
    close(observed(year, 12, 25)); // Christmas

    earlyClose(utc(year, 7, 3));
    earlyClose(utc(year, 11, thanksgiving.getUTCDate() + 1));
    earlyClose(utc(year, 12, 24));
    return cal;
};

// Republic Day, Maharashtra Day, Independence Day, Gandhi Jayanti, Christmas.
const NSE_FIXED: [number, number][] = [[1, 26], [5, 1], [8, 15], [10, 2], [12, 25]];

// Extra NSE trading holidays from the exchange's yearly circular, e.g.
// '2026-11-09'. Empty by default — see the note at the top of the file.
const NSE_EXTRA_HOLIDAYS: string[] = [];

const buildNse = (year: number): Calendar => {
    const cal: Calendar = {};
    for (const [m, d] of NSE_FIXED) cal[dateKey(year, m, d)] = 'closed';
    for (const key of NSE_EXTRA_HOLIDAYS) if (key.startsWith(`${year}-`)) cal[key] = 'closed';
    return cal;
};

const BUILDERS: Record<string, (year: number) => Calendar> = { US: buildNyse, IN: buildNse };
const cache = new Map<string, Calendar>();

// `date` is a calendar date at UTC midnight (as made by `calendarDate`).
export const getSpecialDay = (sessionId: string, date: Date): SpecialDay | undefined => {
    const build = BUILDERS[sessionId];
    if (!build) return undefined;
    const year = date.getUTCFullYear();
    const cacheKey = `${sessionId}:${year}`;
    if (!cache.has(cacheKey)) cache.set(cacheKey, build(year));
    return cache.get(cacheKey)![keyOf(date)];
};

export const calendarDate = utc;
