import { createAuthClient } from "better-auth/client";

const authClient = createAuthClient();

export const signIn = async (provider: "google" | "github") => {
    try {
        const result = await authClient.signIn.social({ provider });
        console.log(`${provider} login successful`, result);
        return result;
    } catch (error) {
        console.error(`${provider} login failed`, error);
        throw error;
    }
};
