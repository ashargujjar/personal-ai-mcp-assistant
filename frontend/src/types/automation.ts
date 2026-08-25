import type { ID } from "./common";

export interface Automation {
  id: ID;
  name: string;
  description: string;
  trigger: string;
  action: string;
  isActive: boolean;
  runCount: number;
  lastRunAt?: string;
}
