import { Check, ChevronDown, ChevronRight, Copy, RotateCcw, ThumbsDown, ThumbsUp } from "lucide-react";
import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ConfirmationCard } from "./ConfirmationCard";
import { SourceCards } from "./SourceCards";
import { ToolActivityList } from "./ToolActivityList";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { cn, initials } from "@/lib/utils";
import type { ChatMessage, ConfirmationDecision } from "@/types";

interface MessageBubbleProps {
  message: ChatMessage;
  onRegenerate?: (id: string) => void;
  onFeedback?: (id: string, feedback: "up" | "down") => void;
  onConfirmationDecide?: (messageId: string, decision: ConfirmationDecision) => void;
}

// `segments` groups the streamed content by which backend node produced it (e.g. a specialist's
// own answer, then the supervisor's follow-up relay of it) — real structure from the backend,
// not a text guess. Only the last segment shows by default; earlier ones sit behind "View more".
function AssistantResponse({ message }: { message: ChatMessage }) {
  const [expanded, setExpanded] = React.useState(false);
  const segments = message.segments && message.segments.length > 0 ? message.segments : [{ node: null, text: message.content }];
  const final = segments[segments.length - 1];
  const earlier = segments.slice(0, -1).filter((s) => s.text.trim());

  return (
    <div className="text-sm leading-relaxed">
      <div className="markdown-body">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{final.text}</ReactMarkdown>
      </div>
      {earlier.length > 0 && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            {expanded ? "Hide earlier reply" : "View more"}
          </button>
          {expanded && (
            <div className="markdown-body mt-1.5 space-y-1.5 border-l-2 border-border pl-2.5 text-muted-foreground">
              {earlier.map((seg, i) => (
                <ReactMarkdown key={i} remarkPlugins={[remarkGfm]}>
                  {seg.text}
                </ReactMarkdown>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function MessageBubble({ message, onRegenerate, onFeedback, onConfirmationDecide }: MessageBubbleProps) {
  const { user } = useAuth();
  const [copied, setCopied] = React.useState(false);
  const isUser = message.role === "user";

  async function handleCopy() {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (isUser) {
    return (
      <div className="flex items-start justify-end gap-3">
        <div className="max-w-[75%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
          {message.content}
        </div>
        <Avatar className="h-7 w-7 shrink-0">
          <AvatarFallback>{initials(user?.name ?? "?")}</AvatarFallback>
        </Avatar>
      </div>
    );
  }

  return (
    <div className="group flex items-start gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
        <span className="text-xs font-bold">N</span>
      </div>
      <div className="min-w-0 max-w-[85%] flex-1 space-y-2.5">
        {message.toolExecutions && message.toolExecutions.length > 0 && (
          <ToolActivityList executions={message.toolExecutions} />
        )}

        {(message.content || message.isStreaming) && (
          <div className="rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-3">
            {message.isStreaming ? (
              message.content ? (
                <div className="markdown-body text-sm leading-relaxed text-muted-foreground">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                </div>
              ) : (
                <span className="inline-flex gap-1">
                  <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-muted-foreground [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-muted-foreground [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-muted-foreground [animation-delay:300ms]" />
                </span>
              )
            ) : (
              <AssistantResponse message={message} />
            )}
          </div>
        )}

        {message.sources && message.sources.length > 0 && <SourceCards sources={message.sources} />}

        {message.pendingConfirmation && (
          <ConfirmationCard
            confirmation={message.pendingConfirmation}
            onDecide={(decision) => onConfirmationDecide?.(message.id, decision)}
          />
        )}

        {!message.isStreaming && message.content && (
          <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <Button variant="ghost" size="icon-sm" onClick={handleCopy} aria-label="Copy response">
              {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => onRegenerate?.(message.id)} aria-label="Regenerate response">
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onFeedback?.(message.id, "up")}
              aria-label="Good response"
              className={cn(message.feedback === "up" && "text-success")}
            >
              <ThumbsUp className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onFeedback?.(message.id, "down")}
              aria-label="Bad response"
              className={cn(message.feedback === "down" && "text-destructive")}
            >
              <ThumbsDown className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
