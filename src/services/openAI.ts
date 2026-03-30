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
    ip: z.string().nullable(), // Can be null when DNS fails
    sslValid: z.boolean(),
    sslExpiry: z.string().nullable(),
    checkedAt: z.string(),
    contentHash: z.string().nullable(), // Can be null when request fails
    contentLength: z.number().nullable(),
    // New fields for detailed alerts
    userName: z.string(),
    projectName: z.string(),
    endpointName: z.string(),
    endpointUrl: z.string(),
});

type WebsiteStatus = z.infer<typeof WebsiteStatusSchema>;

export async function generateAlert(input: WebsiteStatus) {
    const validInput = WebsiteStatusSchema.parse(input);

    const prompt = `
You are an AI alert generator for a website uptime monitoring system. You will receive a structured input object containing website status information. Your task is to **create a professional, detailed, and clear alert message** that can be sent to clients whenever a website is down. The message should highlight key information: user name, project name, endpoint name/URL, status, error, DNS, SSL, and actionable suggestions.

**Input Object:**
${JSON.stringify(validInput, null, 2)}

**Requirements for the Alert Message:**
1. Only generate the alert if the website status is "DOWN".
2. Start with a greeting using the user's name.
3. Include:
   - User name (greeting)
   - Project name
   - Endpoint/Route name and URL
   - Status (DOWN)
   - HTTP code (if any)
   - Error message (clear and detailed)
   - Response time (if available)
   - DNS status and IP address
   - SSL status and expiry (if available)
   - Timestamp of the check (in human-readable format)
4. Format should be friendly, professional, and suitable for both emails and Slack messages.
5. Use emojis sparingly (only for status indicators).
6. Use bullet points or sections for clarity.
7. End with a **💡 Suggestion** section—provide 2-3 actionable recommendations based on the specific error.

**Expected Output Format:**
👋 Hello [UserName],

We noticed an issue with your project **[ProjectName]**.

🚨 **Endpoint:** [EndpointName]
**URL:** [EndpointUrl]

**Status:** DOWN
**Error:** [Detailed error message]
**HTTP Code:** [Code or N/A]
**Response Time:** [Time in ms or N/A]
**DNS:** [Status]
**IP Address:** [IP or N/A if null]
**SSL:** [Valid/Invalid with expiry if available]
**Checked At:** [Human-readable timestamp]

💡 **Suggestions:**
- [Suggestion 1 based on the error]
- [Suggestion 2]
- [Suggestion 3 if applicable]

Thanks for staying on top of things!
**Your Monitoring Team**

**Important:** If IP or contentHash is null, show "N/A" in the alert.

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
            max_tokens: 600, // Increased for detailed alerts
        });

        const alertMessage = response.choices?.[0]?.message?.content ?? "";
        return alertMessage;
    } catch (error) {
        console.error("Error generating alert:", error);
        return null;
    }
}

// Test code removed - alerts will be sent via monitoring service


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