import { quickActions } from "@/mock/chat";
import { sleep } from "@/lib/utils";
import type {
  ChatMessage,
  ChatSegment,
  ConfirmationDecision,
  PendingConfirmation,
  QuickAction,
  SourceCitation,
  ToolExecution,
} from "@/types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

let messageCounter = 0;
function nextId(prefix: string) {
  messageCounter += 1;
  return `${prefix}-${Date.now()}-${messageCounter}`;
}

export interface SendMessageResult {
  toolExecutions: ToolExecution[];
  content: string;
  segments: ChatSegment[];
  sources?: SourceCitation[];
  pendingConfirmation?: PendingConfirmation;
}

async function streamChat(
  body: Record<string, unknown>,
  token: string | null,
  onChunk: (partial: string, segments: ChatSegment[]) => void,
  onToolUpdate: (executions: ToolExecution[]) => void
): Promise<SendMessageResult> {
  const res = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok || !res.body) {
    const errorJson = await res.json().catch(() => null);
    throw new Error(errorJson?.message || "Failed to reach the assistant");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  // Content is grouped by which backend node produced it, so the UI can show only the
  // last node's text by default and tuck earlier ones (e.g. a specialist's own answer
  // before the supervisor relays it) behind "View more" — real structure, not a guess.
  const segments: ChatSegment[] = [];
  const toolExecutions: ToolExecution[] = [];
  let toolCounter = 0;
  let pendingConfirmation: PendingConfirmation | undefined;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? ""; // last piece may be incomplete, keep it for the next read

    for (const frame of frames) {
      if (!frame.startsWith("data: ")) continue;
      const parsed = JSON.parse(frame.slice(6));

      if (parsed.type === "content") {
        const node: string | null = parsed.node ?? null;
        const last = segments[segments.length - 1];
        if (last && last.node === node) {
          last.text += parsed.content; // same node still streaming — concatenate token-by-token
        } else {
          segments.push({ node, text: parsed.content }); // a different node started — new segment
        }

        content = segments.map((s) => s.text).join("\n\n");
        onChunk(content, segments);
      } else if (parsed.type === "tool_call") {
        if (parsed.status === "running") {
          toolCounter += 1;
          toolExecutions.push({
            id: `tool-${Date.now()}-${toolCounter}`,
            label: parsed.tool,
            toolName: parsed.tool,
            status: "running",
          });
        } else if (parsed.status === "done") {
          const entry = [...toolExecutions]
            .reverse()
            .find((t) => t.toolName === parsed.tool && t.status === "running");
          if (entry) entry.status = "completed";
        }
        onToolUpdate([...toolExecutions]);
      } else if (parsed.type === "confirmation_required") {
        pendingConfirmation = { action: parsed.action, args: parsed.args };
      }
    }
  }

  return { toolExecutions, content, segments, pendingConfirmation };
}

export const assistantService = {
  async getQuickActions(): Promise<QuickAction[]> {
    await sleep(120);
    return quickActions;
  },

  async sendMessage(
    prompt: string,
    threadId: string,
    token: string | null,
    onChunk: (partial: string, segments: ChatSegment[]) => void,
    onToolUpdate: (executions: ToolExecution[]) => void
  ): Promise<SendMessageResult> {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return streamChat({ chatText: prompt, threadId, timezone }, token, onChunk, onToolUpdate);
  },

  async resumeChat(
    threadId: string,
    decision: ConfirmationDecision,
    token: string | null,
    onChunk: (partial: string, segments: ChatSegment[]) => void,
    onToolUpdate: (executions: ToolExecution[]) => void
  ): Promise<SendMessageResult> {
    return streamChat({ threadId, resume: decision }, token, onChunk, onToolUpdate);
  },

  createUserMessage(content: string): ChatMessage {
    return {
      id: nextId("msg"),
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };
  },
};
