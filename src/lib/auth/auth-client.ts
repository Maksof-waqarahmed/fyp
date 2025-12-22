import { createAuthClient } from "better-auth/client";

export const authClient = createAuthClient({
    baseURL: process.env.BETTER_AUTH_URL,
    plugins: []
})

export const session = authClient.useSession.get().data;

export const {
    signIn,
    signOut,
    signUp,
} = authClient;