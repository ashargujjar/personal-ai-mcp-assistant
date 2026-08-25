import { toolLogs } from "@/mock/toolLogs";
import { sleep } from "@/lib/utils";
import type { ToolCallLog } from "@/types";

export const toolActivityService = {
  async list(): Promise<ToolCallLog[]> {
    await sleep(200);
    return [...toolLogs].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  },
};
