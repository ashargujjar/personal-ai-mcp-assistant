import { useQuery } from "@tanstack/react-query";
import { Bot } from "lucide-react";
import * as React from "react";
import { useSearchParams } from "react-router-dom";
import { ChatInput } from "@/components/chat/ChatInput";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { QuickActionsGrid } from "@/components/chat/QuickActionsGrid";
import { assistantService } from "@/services/assistantService";
import { useAuth } from "@/hooks/useAuth";
import type { ChatMessage, ConfirmationDecision } from "@/types";

export default function Assistant() {
  const { token } = useAuth();
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [isBusy, setIsBusy] = React.useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [threadId, setThreadId] = React.useState(() => crypto.randomUUID());
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const { data: quickActions } = useQuery({
    queryKey: ["assistant", "quick-actions"],
    queryFn: assistantService.getQuickActions,
  });

  React.useEffect(() => {
    if (searchParams.get("new")) {
      setMessages([]);
      setThreadId(crypto.randomUUID());
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function handleSend(prompt: string) {
    const userMessage = assistantService.createUserMessage(prompt);
    const assistantMessageId = `assistant-${Date.now()}`;
    const assistantPlaceholder: ChatMessage = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
      isStreaming: true,
      toolExecutions: [],
    };

    setMessages((prev) => [...prev, userMessage, assistantPlaceholder]);
    setIsBusy(true);

    const updateAssistantMessage = (patch: Partial<ChatMessage>) => {
      setMessages((prev) => prev.map((m) => (m.id === assistantMessageId ? { ...m, ...patch } : m)));
    };

    try {
      const result = await assistantService.sendMessage(
        prompt,
        threadId,
        token,
        (partial) => updateAssistantMessage({ content: partial, isStreaming: true }),
        (executions) => updateAssistantMessage({ toolExecutions: executions })
      );
      updateAssistantMessage({ isStreaming: false, pendingConfirmation: result.pendingConfirmation });
    } catch (err) {
      updateAssistantMessage({
        content: err instanceof Error ? err.message : "Something went wrong. Please try again.",
        isStreaming: false,
      });
    } finally {
      setIsBusy(false);
    }
  }

  async function handleConfirmationDecide(messageId: string, decision: ConfirmationDecision) {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId && m.pendingConfirmation
          ? { ...m, pendingConfirmation: { ...m.pendingConfirmation, resolved: decision.type } }
          : m
      )
    );
    setIsBusy(true);

    const assistantMessageId = `assistant-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
        isStreaming: true,
        toolExecutions: [],
      },
    ]);

    const updateResumeMessage = (patch: Partial<ChatMessage>) => {
      setMessages((prev) => prev.map((m) => (m.id === assistantMessageId ? { ...m, ...patch } : m)));
    };

    try {
      const result = await assistantService.resumeChat(
        threadId,
        decision,
        token,
        (partial) => updateResumeMessage({ content: partial, isStreaming: true }),
        (executions) => updateResumeMessage({ toolExecutions: executions })
      );
      updateResumeMessage({ isStreaming: false, pendingConfirmation: result.pendingConfirmation });
    } catch (err) {
      updateResumeMessage({
        content: err instanceof Error ? err.message : "Something went wrong. Please try again.",
        isStreaming: false,
      });
    } finally {
      setIsBusy(false);
    }
  }

  function handleRegenerate(id: string) {
    const target = messages.find((m) => m.id === id);
    const index = messages.findIndex((m) => m.id === id);
    const priorUser = [...messages.slice(0, index)].reverse().find((m) => m.role === "user");
    if (!target || !priorUser) return;
    setMessages((prev) => prev.filter((m) => m.id !== id));
    handleSend(priorUser.content);
  }

  function handleFeedback(id: string, feedback: "up" | "down") {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, feedback: m.feedback === feedback ? null : feedback } : m)));
  }

  const isEmpty = messages.length === 0;
  const hasUnresolvedConfirmation = messages.some((m) => m.pendingConfirmation && !m.pendingConfirmation.resolved);

  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col">
      <div className="border-b border-border px-4 py-4 sm:px-6">
        <h1 className="text-base font-semibold">AI Assistant</h1>
        <p className="text-xs text-muted-foreground">Personal AI Operating System</p>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin px-4 py-6 sm:px-6">
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center gap-6 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">How can I help today?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Ask about your emails, GitHub activity, calendar, documents, or anything else connected to NEXUS.
              </p>
            </div>
            <div className="w-full max-w-2xl">
              <QuickActionsGrid actions={quickActions ?? []} onSelect={handleSend} />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onRegenerate={handleRegenerate}
                onFeedback={handleFeedback}
                onConfirmationDecide={handleConfirmationDecide}
              />
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-border bg-background px-4 py-4 sm:px-6">
        <ChatInput onSend={handleSend} disabled={isBusy || hasUnresolvedConfirmation} />
        <p className="mt-2 text-center text-xs text-muted-foreground">
          NEXUS can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  );
}
