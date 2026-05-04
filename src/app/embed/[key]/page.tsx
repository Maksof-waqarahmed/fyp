import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { loadAndGate } from "../../status/_lib/load";
import { StatusPageView } from "../../status/_components/StatusPageView";
import { PasswordPrompt } from "../../status/_components/PasswordPrompt";

// Mount endpoint for reverse-proxy / iframe usage.
// Examples — user proxies their site path here:
//   nginx:    location /status/ { proxy_pass https://your-app.com/embed/sp_xxx/; }
//   vercel:   { source: '/status/:p*', destination: 'https://your-app.com/embed/sp_xxx/:p*' }
//   iframe:   <iframe src="https://your-app.com/embed/sp_xxx" />

export async function generateMetadata({ params }: {
    params: Promise<{ key: string }>;
}): Promise<Metadata> {
    const { key } = await params;
    const outcome = await loadAndGate({ embedKey: key });
    if (outcome.kind === "ALLOW") {
        return {
            title: `${outcome.data.title} — Status`,
            description: outcome.data.description ?? `Live status for ${outcome.data.title}`,
            // Allow framing — for iframe embeds and reverse-proxied pages
            other: { "X-Frame-Options": "SAMEORIGIN" },
        };
    }
    if (outcome.kind === "PASSWORD_REQUIRED") {
        return { title: `${outcome.title} — Password Required` };
    }
    return { title: "Status Page Not Found" };
}

export default async function EmbedStatusPage({ params }: {
    params: Promise<{ key: string }>;
}) {
    const { key } = await params;
    const outcome = await loadAndGate({ embedKey: key });

    if (outcome.kind === "NOT_FOUND") notFound();
    if (outcome.kind === "PASSWORD_REQUIRED") {
        return <PasswordPrompt pageId={outcome.pageId} title={outcome.title} />;
    }

    return <StatusPageView data={outcome.data} />;
}
