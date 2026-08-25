import { automations as seedAutomations } from "@/mock/automations";
import { sleep } from "@/lib/utils";
import type { Automation } from "@/types";

let automations: Automation[] = [...seedAutomations];

export const webhookService = {
  async list(): Promise<Automation[]> {
    await sleep(200);
    return automations;
  },

  async toggle(id: string): Promise<Automation | undefined> {
    await sleep(200);
    automations = automations.map((a) => (a.id === id ? { ...a, isActive: !a.isActive } : a));
    return automations.find((a) => a.id === id);
  },

  async remove(id: string): Promise<void> {
    await sleep(200);
    automations = automations.filter((a) => a.id !== id);
  },
};
