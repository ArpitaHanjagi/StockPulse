import { timingSafeEqual } from "crypto";
import { evaluateAlerts, getAllActiveAlerts } from "@/lib/alerts";

// Checks every user's active price alerts, so alerts fire (as in-app
// notifications) even when nobody has the app open. Called on a schedule
// by .github/workflows/check-alerts.yml — or any cron service — with
// `Authorization: Bearer $CRON_SECRET`.

export const maxDuration = 60;

const isAuthorized = (request: Request) => {
    const secret = process.env.CRON_SECRET;
    if (!secret) return false;
    const expected = Buffer.from(`Bearer ${secret}`);
    const given = Buffer.from(request.headers.get("authorization") ?? "");
    return given.length === expected.length && timingSafeEqual(given, expected);
};

export async function GET(request: Request) {
    if (!process.env.CRON_SECRET) {
        return Response.json({ error: "CRON_SECRET is not set on the server" }, { status: 503 });
    }
    if (!isAuthorized(request)) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const active = await getAllActiveAlerts();
        const fired = await evaluateAlerts(active);
        return Response.json({ checked: active.length, fired: fired.length });
    } catch (e) {
        console.error("[cron] alert check failed", e);
        return Response.json({ error: "Alert check failed" }, { status: 500 });
    }
}
