import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY;

    if (!key) {
        throw new Error("ENCRYPTION_KEY is missing");
    }

    return Buffer.from(key, "hex");
}

export function encrypt(text: string) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);

    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    return {
        encryptedData: encrypted,
        iv: iv.toString("hex"),
        authTag: cipher.getAuthTag().toString("hex"),
    };
}

export function decrypt(cipherText: string, iv: string, authTag: string): string {
    const decipher = crypto.createDecipheriv(
        ALGORITHM,
        getKey(),
        Buffer.from(iv, "hex")
    );

    decipher.setAuthTag(Buffer.from(authTag, "hex"));

    let decrypted = decipher.update(cipherText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
}
