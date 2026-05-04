"use server";

import bcrypt from "bcrypt";
import { cookies, headers } from "next/headers";
import prisma from "@/lib/prisma";
import {
    signAccessCookie,
    STATUS_PAGE_ACCESS_COOKIE,
    ACCESS_COOKIE_MAX_AGE_SECONDS,
} from "@/lib/status-page-cookie";
import { revalidatePath } from "next/cache";

export type VerifyAccessState = { ok?: true; error?: string } | null;

// In-memory rate limiter: 5 attempts / minute / (ip + page-id).
// Process-local; resets on cold start (acceptable for FYP scope).
const ATTEMPT_LIMIT = 5;
const WINDOW_MS = 60 * 1000;
const attempts = new Map<string, { count: number; firstAt: number }>();

function rateLimit(key: string): boolean {
    const now = Date.now();
    const entry = attempts.get(key);
    if (!entry || now - entry.firstAt > WINDOW_MS) {
        attempts.set(key, { count: 1, firstAt: now });
        return true;
    }
    if (entry.count >= ATTEMPT_LIMIT) return false;
    entry.count += 1;
    return true;
}

export async function verifyAccess(
    _prev: VerifyAccessState,
    formData: FormData
): Promise<VerifyAccessState> {
    const id = String(formData.get("id") ?? "");
    const password = String(formData.get("password") ?? "");

    if (!id || !password) return { error: "Password is required" };

    const h = await headers();
    const ip =
        h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        h.get("x-real-ip") ||
        "unknown";

    if (!rateLimit(`${ip}:${id}`)) {
        return { error: "Too many attempts. Try again in a minute." };
    }

    const page = await prisma.statusPage.findUnique({
        where: { id },
        select: { id: true, accessKeyHash: true, visibility: true },
    });

    if (!page || page.visibility !== "PASSWORD" || !page.accessKeyHash) {
        return { error: "Status page is not password-protected" };
    }

    const ok = await bcrypt.compare(password, page.accessKeyHash);
    if (!ok) return { error: "Incorrect password" };

    const cookieValue = await signAccessCookie(page.id);
    const cookieStore = await cookies();
    cookieStore.set({
        name: `${STATUS_PAGE_ACCESS_COOKIE}_${page.id}`,
        value: cookieValue,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: ACCESS_COOKIE_MAX_AGE_SECONDS,
    });

    revalidatePath("/", "layout");
    return { ok: true };
}
