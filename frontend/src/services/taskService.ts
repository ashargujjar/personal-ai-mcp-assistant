import { tasks as seedTasks } from "@/mock/tasks";
import { sleep } from "@/lib/utils";
import type { Priority, Source, Task, TaskStatus } from "@/types";

let tasks: Task[] = [...seedTasks];

export const taskService = {
  async list(): Promise<Task[]> {
    await sleep(200);
    return [...tasks].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  },

  async create(input: {
    title: string;
    description?: string;
    priority: Priority;
    deadline?: string;
    project?: string;
    source?: Source;
  }): Promise<Task> {
    await sleep(250);
    const task: Task = {
      id: `task-${Date.now()}`,
      title: input.title,
      description: input.description,
      priority: input.priority,
      deadline: input.deadline,
      project: input.project,
      source: input.source ?? "manual",
      status: "todo",
      createdAt: new Date().toISOString(),
    };
    tasks = [task, ...tasks];
    return task;
  },

  async updateStatus(id: string, status: TaskStatus): Promise<Task | undefined> {
    await sleep(180);
    tasks = tasks.map((t) => (t.id === id ? { ...t, status } : t));
    return tasks.find((t) => t.id === id);
  },

  async update(id: string, patch: Partial<Task>): Promise<Task | undefined> {
    await sleep(200);
    tasks = tasks.map((t) => (t.id === id ? { ...t, ...patch } : t));
    return tasks.find((t) => t.id === id);
  },

  async remove(id: string): Promise<void> {
    await sleep(180);
    tasks = tasks.filter((t) => t.id !== id);
  },
};
