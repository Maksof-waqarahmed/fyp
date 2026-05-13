import { ChatInterface } from "./_components/chat-interface"

export const metadata = { title: "AI Assistant" }

export default function AiAssistantPage() {
    return (
        <div className="h-full flex flex-col">
            <ChatInterface />
        </div>
    )
}
