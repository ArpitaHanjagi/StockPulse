import { cache } from "react";
import { headers } from "next/headers";
import { auth } from "@/lib/better-auth/auth";

// Memoised per request: the layout, header, page and several actions all ask
// for the user during one render, and each lookup is a database round-trip.
export const getCurrentUser = cache(async () => {
    const session = await auth.api.getSession({ headers: await headers() });
    return session?.user ?? null;
});
