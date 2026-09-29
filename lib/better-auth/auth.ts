import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { firestoreAdapter } from "@/lib/better-auth/firestore-adapter";

const isLocalUrl = (url: string) => /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(url);
const httpsUrl = (host?: string) => (host ? `https://${host}` : undefined);

// BETTER_AUTH_URL wins, except a leftover localhost value on Vercel (copied
// from .env), which would make every sign-in fail the origin check. There,
// and when it's unset, use the project's production domain Vercel provides.
const resolveBaseURL = () => {
    const configured = process.env.BETTER_AUTH_URL;
    const vercelProduction = httpsUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL);
    if (configured && !(vercelProduction && isLocalUrl(configured))) return configured;
    return vercelProduction ?? configured;
};

export const auth = betterAuth({
    database: firestoreAdapter(),
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: resolveBaseURL(),
    // Let Vercel preview deployments sign in too, not just production.
    trustedOrigins: [httpsUrl(process.env.VERCEL_URL), httpsUrl(process.env.VERCEL_BRANCH_URL)].filter(
        (origin): origin is string => !!origin
    ),
    emailAndPassword: {
        enabled: true,
        disableSignUp: false,
        requireEmailVerification: false,
        minPasswordLength: 8,
        autoSignIn: true,
    },
    session: {
        // Keep a signed copy of the session in a cookie for a few minutes so
        // most requests skip the session + user reads from Firestore.
        cookieCache: { enabled: true, maxAge: 5 * 60 },
    },
    user: {
        additionalFields: {
            country: { type: "string", required: false },
            investmentGoals: { type: "string", required: false },
            riskTolerance: { type: "string", required: false },
            preferredIndustry: { type: "string", required: false },
        },
    },
    plugins: [nextCookies()],
});
