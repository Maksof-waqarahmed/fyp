import nodemailer, { SentMessageInfo } from "nodemailer";
import axios from "axios";

export type SlackAlertResult = {
  success: boolean;
  attempts: number;
  lastError?: string;
};

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmailAlert(
  email: string,
  message: string,
  subject: string = "Website Alert"
): Promise<SentMessageInfo | null> {
  try {
    // Convert markdown-style formatting to HTML-friendly format
    const htmlMessage = message
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold text
      .replace(/\n/g, '<br>'); // Line breaks

    const info = await transporter.sendMail({
      from: `"AI Uptime Monitor" <${process.env.SMTP_USER}>`,
      to: email,
      subject: subject,
      text: message,
      html: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        ${htmlMessage}
      </div>`,
    });

    console.log("📧 Email sent:", info.messageId);
    return info;
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error("❌ Failed to send email:", err.message);
    } else {
      console.error("❌ Failed to send email:", err);
    }
    return null;
  }
}


const axiosInstance = axios.create({
  timeout: 5000,
});

export const sendSlackAlert = async (
  webHook: string,
  message: string,
  retries: number = 3
): Promise<SlackAlertResult> => {
  let lastError: string | undefined;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await axiosInstance.post(webHook, { text: message });

      console.log("🔔 Slack alert sent ✅");

      return {
        success: true,
        attempts: attempt,
        lastError: undefined,
      };
    } catch (err: unknown) {
      if (err instanceof Error) {
        lastError = err.message;
        console.warn(`Attempt ${attempt} failed: ${err.message}. Retrying...`);
      } else {
        lastError = "Unknown error";
        console.warn(`Attempt ${attempt} failed. Retrying...`);
      }

      if (attempt === retries) {
        console.error("❌ Slack alert failed after retries");
        return {
          success: false,
          attempts: attempt,
          lastError,
        };
      }

      await new Promise((res) => setTimeout(res, 1500));
    }
  }
  return {
    success: false,
    attempts: retries,
    lastError: lastError ?? "Unknown error",
  };
};

