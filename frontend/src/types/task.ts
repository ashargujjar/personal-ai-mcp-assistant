import type { ID, Priority, Source } from "./common";

export type TaskStatus = "todo" | "in-progress" | "waiting" | "done";

export interface Task {
  id: ID;
  title: string;
  description?: string;
  priority: Priority;
  deadline?: string;
  project?: string;
  source: Source;
  status: TaskStatus;
  createdAt: string;
}
