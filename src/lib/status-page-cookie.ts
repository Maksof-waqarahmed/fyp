/**
 * HMAC-SHA256 signed cookie for status page password access.
 * Edge-runtime safe — uses Web Crypto API only (no Node `crypto`).
 *
 * Cookie format: `{statusPageId}.{expiresAtMs}.{base64url-hmac}`
 */

const COOKIE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export const STATUS_PAGE_ACCESS_COOKIE = "sp_access";

function b64urlEncode(bytes: ArrayBuffer | Uint8Array): string {
    const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    let bin = "";
    for (let i = 0; i < arr.byteLength; i++) bin += String.fromCharCode(arr[i]);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(str: string): Uint8Array {
    const padded = str.replace(/-/g, "+").replace(/_/g, "/");
    const pad = padded.length % 4 === 0 ? padded : padded + "=".repeat(4 - (padded.length % 4));
    const bin = atob(pad);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
}

function getSecret(): string {
    const s = process.env.BETTER_AUTH_SECRET;
    if (!s) throw new Error("BETTER_AUTH_SECRET is not set");
    return s;
}

async function hmac(payload: string): Promise<string> {
    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(getSecret()),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
    return b64urlEncode(sig);
}

async function verifyHmac(payload: string, signature: string): Promise<boolean> {
    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(getSecret()),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["verify"]
    );
    try {
        const sigBytes = b64urlDecode(signature);
        // Copy into a fresh ArrayBuffer-backed view to satisfy BufferSource type
        const sigCopy = new Uint8Array(sigBytes);
        return await crypto.subtle.verify(
            "HMAC",
            key,
            sigCopy.buffer,
            new TextEncoder().encode(payload)
        );
    } catch {
        return false;
    }
}

export async function signAccessCookie(statusPageId: string, ttlMs: number = COOKIE_TTL_MS): Promise<string> {
    const expiresAt = Date.now() + ttlMs;
    const payload = `${statusPageId}.${expiresAt}`;
    const sig = await hmac(payload);
    return `${payload}.${sig}`;
}

export async function verifyAccessCookie(
    cookieValue: string,
    statusPageId: string
): Promise<boolean> {
    const parts = cookieValue.split(".");
    if (parts.length !== 3) return false;
    const [id, expiresStr, sig] = parts;
    if (id !== statusPageId) return false;

    const expires = Number(expiresStr);
    if (!Number.isFinite(expires) || expires < Date.now()) return false;

    return verifyHmac(`${id}.${expiresStr}`, sig);
}

export const ACCESS_COOKIE_MAX_AGE_SECONDS = COOKIE_TTL_MS / 1000;
