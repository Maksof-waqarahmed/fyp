import { describe, it, expect, beforeAll, afterAll } from "vitest";
import crypto from "node:crypto";
import { encrypt, decrypt } from "@/lib/enc-dec";

describe("enc-dec", () => {
    const originalKey = process.env.ENCRYPTION_KEY;

    beforeAll(() => {
        // 32 bytes = 64 hex chars (AES-256)
        process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString("hex");
    });

    afterAll(() => {
        process.env.ENCRYPTION_KEY = originalKey;
    });

    it("round-trips a simple string", () => {
        const plaintext = "https://hooks.slack.com/services/T0/B0/secret";
        const enc = encrypt(plaintext);
        const dec = decrypt(enc.encryptedData, enc.iv, enc.authTag);
        expect(dec).toBe(plaintext);
    });

    it("produces a different IV for each encryption", () => {
        const a = encrypt("same-input");
        const b = encrypt("same-input");
        expect(a.iv).not.toBe(b.iv);
        expect(a.encryptedData).not.toBe(b.encryptedData);
    });

    it("decrypt fails when authTag is tampered", () => {
        const enc = encrypt("secret-payload");
        const tamperedTag = enc.authTag.replace(/.$/, (c) => (c === "0" ? "1" : "0"));
        expect(() => decrypt(enc.encryptedData, enc.iv, tamperedTag)).toThrow();
    });

    it("decrypt fails when ciphertext is tampered", () => {
        const enc = encrypt("secret-payload");
        const tampered = enc.encryptedData.replace(/.$/, (c) => (c === "0" ? "1" : "0"));
        expect(() => decrypt(tampered, enc.iv, enc.authTag)).toThrow();
    });

    it("handles empty strings", () => {
        const enc = encrypt("");
        const dec = decrypt(enc.encryptedData, enc.iv, enc.authTag);
        expect(dec).toBe("");
    });

    it("handles unicode and long strings", () => {
        const text = "🔒 héllo wörld " + "x".repeat(2000);
        const enc = encrypt(text);
        const dec = decrypt(enc.encryptedData, enc.iv, enc.authTag);
        expect(dec).toBe(text);
    });

    it("encrypt throws when ENCRYPTION_KEY is missing", () => {
        const saved = process.env.ENCRYPTION_KEY;
        delete process.env.ENCRYPTION_KEY;
        try {
            expect(() => encrypt("anything")).toThrow(/ENCRYPTION_KEY is missing/);
        } finally {
            process.env.ENCRYPTION_KEY = saved;
        }
    });
});
