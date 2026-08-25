import { getCannedResponse, quickActions } from "@/mock/chat";
import { sleep } from "@/lib/utils";
import type { ChatMessage, QuickAction, SourceCitation, ToolExecution } from "@/types";

let messageCounter = 0;
function nextId(prefix: string) {
  messageCounter += 1;
  return `${prefix}-${Date.now()}-${messageCounter}`;
}

export interface SendMessageResult {
  toolExecutions: ToolExecution[];
  content: string;
  sources?: SourceCitation[];
}

export const assistantService = {
  async getQuickActions(): Promise<QuickAction[]> {
    await sleep(120);
    return quickActions;
  },

  /**
   * Simulates a streaming assistant turn: tool calls resolve one at a time,
   * then the final answer is returned. `onToolUpdate` lets the UI render
   * live progress before the full result resolves.
   */
  async sendMessage(
    prompt: string,
    onToolUpdate?: (executions: ToolExecution[]) => void
  ): Promise<SendMessageResult> {
    const canned = getCannedResponse(prompt);
    const executions: ToolExecution[] = canned.toolExecutions.map((t) => ({
      id: nextId("tool"),
      label: t.label,
      toolName: t.toolName,
      status: "pending",
    }));

    onToolUpdate?.(executions.map((e) => ({ ...e })));

    for (let i = 0; i < executions.length; i++) {
      await sleep(280 + Math.random() * 220);
      executions[i] = { ...executions[i], status: "running" };
      onToolUpdate?.(executions.map((e) => ({ ...e })));
      await sleep(180 + Math.random() * 160);
      executions[i] = {
        ...executions[i],
        status: "completed",
        durationMs: Math.round(40 + Math.random() * 300),
      };
      onToolUpdate?.(executions.map((e) => ({ ...e })));
    }

    await sleep(300);

    return {
      toolExecutions: executions,
      content: canned.content,
      sources: canned.sources,
    };
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
