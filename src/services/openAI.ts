import OpenAI from "openai";
import z from "zod";

export const OPENAI = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const WebsiteStatusSchema = z.object({
    status: z.enum(["UP", "DOWN"]),
    httpCode: z.number().nullable(),
    responseTime: z.number().nullable(),
    errorMessage: z.string().nullable(),
    dnsStatus: z.string(),
    ip: z.string(),
    sslValid: z.boolean(),
    sslExpiry: z.string().nullable(),
    checkedAt: z.string(),
    contentHash: z.string(),
    contentLength: z.number().nullable(),
});

type WebsiteStatus = z.infer<typeof WebsiteStatusSchema>;

export async function generateAlert(input: WebsiteStatus) {
    const validInput = WebsiteStatusSchema.parse(input);

    const prompt = `
You are an AI alert generator for a website uptime monitoring system. You will receive a structured input object containing website status information. Your task is to **create a professional, concise, and clear alert message** that can be sent to clients whenever a website is down. The message should highlight key information: website status, error, response time, DNS, IP, SSL, content info, and timestamp. Use a polite and professional tone.

**Input Object:**
${JSON.stringify(validInput, null, 2)}

**Requirements for the Alert Message:**
1. Only generate the alert if the website status is "DOWN".
2. Include:
   - Website status
   - HTTP code (if any)
   - Error message
   - Response time (if available)
   - DNS status and IP
   - SSL status and expiry (if available)
   - Timestamp of the check (in human-readable format)
3. Format should be friendly but professional, suitable for client emails or Slack messages.
4. Use bullet points or short lines for clarity.
5. Avoid technical jargon that clients won’t understand, but include enough info for context.
6. End the message with a **suggested action**—this should be a short recommendation for the client or developer, e.g., “Check the network connection” or “Verify DNS settings”, without implying that you (the monitoring system) are taking action.

**Example Input:**
{
    "status": "DOWN",
    "httpCode": null,
    "responseTime": null,
    "errorMessage": "Connection timed out",
    "dnsStatus": "RESOLVED",
    "ip": "203.0.113.10",
    "sslValid": false,
    "sslExpiry": null,
    "checkedAt": "2026-02-25T10:15:00Z",
    "contentHash": "abc123",
    "contentLength": 1024
}

**Expected Output Example:**
🚨 **Website Down Alert**  

- **Status:** DOWN  
- **Error:** Connection timed out  
- **DNS:** RESOLVED  
- **IP Address:** 203.0.113.10  
- **SSL:** Invalid / Expiry unknown  
- **Checked At:** 25 Feb 2026, 10:15 AM UTC  

**Suggestion:** Give Suggestion for the client or developer according to the error.

Respond ONLY with the formatted alert, no extra text.
`;

    try {
        const response = await OPENAI.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "user",
                    content: prompt,
                },
            ],
            temperature: 0.3,
            max_tokens: 300,
        });

        const alertMessage = response.choices?.[0]?.message?.content ?? "";
        return alertMessage;
    } catch (error) {
        console.error("Error generating alert:", error);
        return null;
    }
}

(async () => {
    const testData: WebsiteStatus = {
        status: "DOWN",
        httpCode: null,
        responseTime: null,
        errorMessage: "Connection timed out",
        dnsStatus: "RESOLVED",
        ip: "203.0.113.10",
        sslValid: false,
        sslExpiry: null,
        checkedAt: new Date().toISOString(),
        contentHash: "abc123",
        contentLength: 1024,
    };

    const alert = await generateAlert(testData);
    console.log(alert);
})();


// 👋 Hello [UserName],

// We noticed an issue with your project *[ProjectName]*.

// 🚨 *Route/Endpoint:* [RouteName]

// *Status:* DOWN
// *Error:* [ErrorMessage]
// *HTTP Code:* [HttpCode]
// *Response Time:* [ResponseTime] ms
// *DNS:* [DnsStatus]
// *IP Address:* [Ip]
// *SSL:* [SslValid ? "Valid" : "Invalid / Expiry unknown"]
// *Checked At:* [CheckedAtFormatted]

// 💡 *Suggestion:* [Short suggestion, e.g., "Please verify server logs or network connection."]

// Thanks for staying on top of things!
// *Your Monitoring Team*