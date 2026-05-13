"use client"
import { useEffect, useRef, useState } from "react"
import { api as trpc } from "@/trpc/trpc-server/react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
    Bot, Send, Trash2, User, Sparkles,
    Loader2, AlertCircle, RotateCcw,
} from "lucide-react"
import { toast } from "sonner"

interface Message {
    id: string
    role: "user" | "assistant"
    content: string
    createdAt: Date
}

const SUGGESTED_QUESTIONS = [
    "What endpoints are currently down?",
    "Show me my slowest endpoints",
    "Any incidents in the last 7 days?",
    "What's my overall uptime status?",
    "How can I improve my monitoring?",
    "What does HTTP 503 mean?",
]

function TypingDots() {
    return (
        <span className="inline-flex items-center gap-1 h-4">
            <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce" />
        </span>
    )
}

function MessageBubble({ msg, isStreaming }: { msg: Message; isStreaming?: boolean }) {
    const isUser = msg.role === "user"

    return (
        <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
            {/* Avatar */}
            <div className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${
                isUser
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-800 border border-zinc-700 text-emerald-400"
            }`}>
                {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>

            {/* Bubble */}
            <div className={`max-w-[78%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1`}>
                <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                    isUser
                        ? "bg-blue-600 text-white rounded-tr-sm"
                        : "bg-card border border-border text-foreground rounded-tl-sm"
                }`}>
                    {msg.content || (isStreaming ? <TypingDots /> : "")}
                    {isStreaming && msg.content && (
                        <span className="ml-1 inline-block h-3 w-0.5 bg-current animate-pulse align-middle" />
                    )}
                </div>
                <span className="text-[10px] text-muted-foreground px-1">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
            </div>
        </div>
    )
}

export function ChatInterface() {
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState("")
    const [isStreaming, setIsStreaming] = useState(false)
    const [streamingId, setStreamingId] = useState<string | null>(null)
    const [hasLoadedHistory, setHasLoadedHistory] = useState(false)
    const bottomRef = useRef<HTMLDivElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const abortRef = useRef<AbortController | null>(null)

    const utils = trpc.useUtils()

    const { data: historyData, isLoading: historyLoading } = trpc.chat.getHistory.useQuery(
        { limit: 50 },
        { refetchOnWindowFocus: false }
    )

    const clearMutation = trpc.chat.clearHistory.useMutation({
        onSuccess: () => {
            setMessages([])
            utils.chat.getHistory.invalidate()
            toast.success("Chat history cleared")
        },
    })

    // Load history on first fetch
    useEffect(() => {
        if (historyData?.data && !hasLoadedHistory) {
            setMessages(
                historyData.data.map((m: { id: string; role: string; content: string; createdAt: string | Date }) => ({
                    id: m.id,
                    role: m.role as "user" | "assistant",
                    content: m.content,
                    createdAt: new Date(m.createdAt),
                }))
            )
            setHasLoadedHistory(true)
        }
    }, [historyData, hasLoadedHistory])

    // Auto-scroll on new messages
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    const sendMessage = async (text: string) => {
        const trimmed = text.trim()
        if (!trimmed || isStreaming) return

        const userMsg: Message = {
            id: crypto.randomUUID(),
            role: "user",
            content: trimmed,
            createdAt: new Date(),
        }

        const assistantId = crypto.randomUUID()
        const assistantMsg: Message = {
            id: assistantId,
            role: "assistant",
            content: "",
            createdAt: new Date(),
        }

        setMessages((prev) => [...prev, userMsg, assistantMsg])
        setInput("")
        setIsStreaming(true)
        setStreamingId(assistantId)

        // Keep only last 10 messages as history (to limit tokens)
        const history = messages.slice(-10).map((m) => ({
            role: m.role,
            content: m.content,
        }))

        abortRef.current = new AbortController()

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: trimmed, history }),
                signal: abortRef.current.signal,
            })

            if (!res.ok || !res.body) {
                const errText = await res.text().catch(() => "")
                console.error(`[Chat] server error ${res.status}:`, errText)
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === assistantId
                            ? { ...m, content: `Server error (${res.status}). Please try again.` }
                            : m
                    )
                )
                return
            }

            const reader = res.body.getReader()
            const decoder = new TextDecoder()
            let accumulated = ""

            while (true) {
                const { done, value } = await reader.read()
                if (done) break
                const chunk = decoder.decode(value, { stream: true })
                accumulated += chunk
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === assistantId ? { ...m, content: accumulated } : m
                    )
                )
            }
        } catch (err: unknown) {
            if (err instanceof Error && err.name === "AbortError") return
            console.error("[Chat] stream error:", err)
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === assistantId
                        ? { ...m, content: "Something went wrong. Please try again." }
                        : m
                )
            )
        } finally {
            setIsStreaming(false)
            setStreamingId(null)
            abortRef.current = null
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            sendMessage(input)
        }
    }

    const handleStop = () => {
        abortRef.current?.abort()
        setIsStreaming(false)
        setStreamingId(null)
    }

    const isEmpty = messages.length === 0 && !historyLoading

    return (
        <div className="flex flex-col h-full">
            {/* ── Header ─────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-sm">
                        <Sparkles className="h-4 w-4 text-white" />
                    </div>
                    <div>
                        <h1 className="text-sm font-semibold">AI Assistant</h1>
                        <p className="text-[11px] text-muted-foreground">
                            Ask anything about your monitoring data
                        </p>
                    </div>
                    <Badge variant="secondary" className="text-[10px] ml-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                        GPT-4o mini
                    </Badge>
                </div>

                <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-muted-foreground hover:text-destructive h-8"
                    disabled={messages.length === 0 || clearMutation.isPending}
                    onClick={() => clearMutation.mutate()}
                >
                    <Trash2 className="h-3.5 w-3.5" />
                    Clear
                </Button>
            </div>

            {/* ── Messages Area ───────────────────────────────────────── */}
            <ScrollArea className="flex-1 px-6">
                <div className="py-6 space-y-5 max-w-3xl mx-auto">

                    {historyLoading && (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    )}

                    {/* Empty state with suggested questions */}
                    {isEmpty && (
                        <div className="flex flex-col items-center py-10 gap-6">
                            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-violet-600/20 border border-blue-500/20 flex items-center justify-center">
                                <Sparkles className="h-7 w-7 text-blue-500" />
                            </div>
                            <div className="text-center">
                                <h2 className="font-semibold text-base mb-1">How can I help you?</h2>
                                <p className="text-sm text-muted-foreground">
                                    Ask me about your endpoints, incidents, or uptime data
                                </p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                                {SUGGESTED_QUESTIONS.map((q) => (
                                    <button
                                        key={q}
                                        onClick={() => sendMessage(q)}
                                        className="text-left text-xs px-3 py-2.5 rounded-xl border border-border bg-card hover:bg-accent hover:border-primary/30 transition-colors text-muted-foreground hover:text-foreground"
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Message list */}
                    {messages.map((msg) => (
                        <MessageBubble
                            key={msg.id}
                            msg={msg}
                            isStreaming={isStreaming && msg.id === streamingId}
                        />
                    ))}

                    <div ref={bottomRef} />
                </div>
            </ScrollArea>

            {/* ── Input Area ─────────────────────────────────────────── */}
            <div className="px-6 py-4 border-t shrink-0">
                <div className="max-w-3xl mx-auto">
                    <div className="flex gap-3 items-end">
                        <div className="flex-1 relative">
                            <Textarea
                                ref={textareaRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask about your endpoints, incidents, uptime... (Enter to send)"
                                className="min-h-[48px] max-h-[160px] resize-none pr-4 text-sm rounded-xl"
                                disabled={isStreaming}
                                rows={1}
                            />
                        </div>

                        {isStreaming ? (
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-12 w-12 rounded-xl shrink-0 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                                onClick={handleStop}
                            >
                                <AlertCircle className="h-4 w-4" />
                            </Button>
                        ) : (
                            <Button
                                size="icon"
                                className="h-12 w-12 rounded-xl shrink-0 bg-blue-600 hover:bg-blue-700 text-white"
                                disabled={!input.trim()}
                                onClick={() => sendMessage(input)}
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2 text-center">
                        AI responses are based on your live monitoring data · Shift+Enter for new line
                    </p>
                </div>
            </div>
        </div>
    )
}
