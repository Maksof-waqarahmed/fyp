import nodemailer from "nodemailer";
import axios from "axios";

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export async function sendEmailAlert(email: string, message: string): Promise<void> {
    try {
        const info = await transporter.sendMail({
            from: `"AI Monitor" <${process.env.SMTP_USER}>`,
            to: email,
            subject: "Website Down Alert",
            text: message,
        });
        console.log("Message sent:", info.messageId);
    } catch (err) {
        console.error("Failed to send email:", err);
    }
}

const axiosInstance = axios.create({
    timeout: 5000,
});

export const sendSlackAlert = async (
    webHook: string,
    message: string,
    retries: number = 3
): Promise<void> => {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            await axiosInstance.post(webHook, { text: message });
            console.log("Slack alert sent ✅");
            return;
        } catch (err: any) {
            console.warn(
                `Attempt ${attempt} failed: ${err.message || err}. Retrying...`
            );
            if (attempt === retries) {
                console.error("Slack alert failed after retries ❌");
                throw err;
            }
            await new Promise((res) => setTimeout(res, 1500));
        }
    }
};
