import { createAuthClient } from "better-auth/react";

// No baseURL: in the browser better-auth uses the page's own origin, so
// sign-in works on localhost, the production domain and preview URLs alike
// without a build-time env var that could point at the wrong place.
export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;
