import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { auth } from "@/lib/better-auth/auth";

const authRoutes = ["/sign-in", "/sign-up"];
// Open to everyone, signed in or not.
const publicRoutes = ["/about"];

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    if (publicRoutes.includes(pathname)) return NextResponse.next();

    const sessionCookie = getSessionCookie(request);
    const isAuthRoute = authRoutes.includes(pathname);
    // Server action POSTs must never be redirected: the client expects an
    // RSC payload and gets the sign-in page's HTML instead ("An unexpected
    // response was received from the server"). This happens when a poller
    // fires just after sign-out or once the cookie has expired. Every action
    // checks the session itself, so letting them through is safe.
    const isServerAction = request.headers.has("next-action");

    if (!sessionCookie && !isAuthRoute && !isServerAction) {
        return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    // Only bounce signed-in users away from page loads — never from the
    // sign-in/sign-up server action POSTs, which would break on a redirect.
    // The cookie alone isn't proof: it can outlive its session (e.g. after a
    // database reset), so confirm the session really exists first.
    if (sessionCookie && isAuthRoute && request.method === "GET") {
        const session = await auth.api.getSession({ headers: request.headers });
        if (session) return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico|assets|public).*)"],
};
