import { memories as seedMemories } from "@/mock/memory";
import { sleep } from "@/lib/utils";
import type { Memory, MemoryCategory } from "@/types";

let memories: Memory[] = [...seedMemories];
let counter = memories.length;

export const memoryService = {
  async list(query?: string): Promise<Memory[]> {
    await sleep(200);
    const sorted = [...memories].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    if (!query?.trim()) return sorted;
    const q = query.toLowerCase();
    return sorted.filter((m) => m.content.toLowerCase().includes(q) || m.category.includes(q));
  },

  async create(content: string, category: MemoryCategory = "fact"): Promise<Memory> {
    await sleep(250);
    counter += 1;
    const memory: Memory = { id: `mem-new-${counter}`, content, category, source: "Manual", createdAt: new Date().toISOString() };
    memories = [memory, ...memories];
    return memory;
  },

  async remove(id: string): Promise<void> {
    await sleep(200);
    memories = memories.filter((m) => m.id !== id);
  },
};
