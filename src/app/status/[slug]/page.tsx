import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { loadAndGate } from "../_lib/load";
import { StatusPageView } from "../_components/StatusPageView";
import { PasswordPrompt } from "../_components/PasswordPrompt";

export async function generateMetadata({ params }: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const outcome = await loadAndGate({ slug });
    if (outcome.kind === "ALLOW") {
        return {
            title: `${outcome.data.title} — Status`,
            description: outcome.data.description ?? `Live status for ${outcome.data.title}`,
        };
    }
    if (outcome.kind === "PASSWORD_REQUIRED") {
        return { title: `${outcome.title} — Password Required` };
    }
    return { title: "Status Page Not Found" };
}

export default async function StatusPage({ params }: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const outcome = await loadAndGate({ slug });

    if (outcome.kind === "NOT_FOUND") notFound();
    if (outcome.kind === "PASSWORD_REQUIRED") {
        return <PasswordPrompt pageId={outcome.pageId} title={outcome.title} />;
    }

    return <StatusPageView data={outcome.data} />;
}
