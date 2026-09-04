import { quickActions } from "@/mock/chat";
import { sleep } from "@/lib/utils";
import type {
  ChatMessage,
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
  sources?: SourceCitation[];
  pendingConfirmation?: PendingConfirmation;
}

async function streamChat(
  body: Record<string, unknown>,
  token: string | null,
  onChunk: (partial: string) => void,
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
  let needsSeparator = false;
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
        // The agent can generate several separate replies in one turn (e.g. a line
        // before calling a tool, then the final answer after) — insert a paragraph
        // break between them instead of running the sentences together.
        if (needsSeparator && content) {
          content += "\n\n";
          needsSeparator = false;
        }
        content += parsed.content;
        onChunk(content);
      } else if (parsed.type === "tool_call") {
        if (parsed.status === "running") {
          toolCounter += 1;
          toolExecutions.push({
            id: `tool-${Date.now()}-${toolCounter}`,
            label: parsed.tool,
            toolName: parsed.tool,
            status: "running",
          });
          needsSeparator = true;
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

  return { toolExecutions, content, pendingConfirmation };
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
    onChunk: (partial: string) => void,
    onToolUpdate: (executions: ToolExecution[]) => void
  ): Promise<SendMessageResult> {
    return streamChat({ chatText: prompt, threadId }, token, onChunk, onToolUpdate);
  },

  async resumeChat(
    threadId: string,
    decision: ConfirmationDecision,
    token: string | null,
    onChunk: (partial: string) => void,
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
