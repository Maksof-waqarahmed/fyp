import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import db from "./prisma";

export const auth = betterAuth({
    appName: "AI-Powered Uptime Monitor",
    baseURL: process.env.BETTER_AUTH_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    database: prismaAdapter(db, { provider: "postgresql" }),
    trustedOrigins: [],
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID as string || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string || "",
            prompt: "select_account",
        },
        github: {
            clientId: process.env.GITHUB_CLIENT_ID as string,
            clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
        },
    },
    // Big perf win: sign the session into a short-lived encrypted cookie so
    // most requests can validate the session WITHOUT a DB round-trip.
    // 5-minute cache — falls back to DB after that or on logout/permission change.
    session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 days
        updateAge: 60 * 60 * 24, // refresh expiry once per day
        cookieCache: {
            enabled: true,
            maxAge: 5 * 60, // 5 minutes
        },
    },
    advanced: {
        useSecureCookies: process.env.NODE_ENV === "production",
    },
    plugins: [nextCookies()],
});
