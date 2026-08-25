import * as React from "react";
import { TaskCard } from "./TaskCard";
import { cn } from "@/lib/utils";
import type { Task, TaskStatus } from "@/types";

const columns: { status: TaskStatus; label: string }[] = [
  { status: "todo", label: "Todo" },
  { status: "in-progress", label: "In Progress" },
  { status: "waiting", label: "Waiting" },
  { status: "done", label: "Done" },
];

export function KanbanBoard({ tasks, onMove }: { tasks: Task[]; onMove: (taskId: string, status: TaskStatus) => void }) {
  const [dragOverColumn, setDragOverColumn] = React.useState<TaskStatus | null>(null);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {columns.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.status);
        return (
          <div
            key={col.status}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverColumn(col.status);
            }}
            onDragLeave={() => setDragOverColumn((c) => (c === col.status ? null : c))}
            onDrop={(e) => {
              e.preventDefault();
              const taskId = e.dataTransfer.getData("text/plain");
              if (taskId) onMove(taskId, col.status);
              setDragOverColumn(null);
            }}
            className={cn(
              "flex flex-col gap-2 rounded-xl border border-border bg-secondary/30 p-2.5 transition-colors",
              dragOverColumn === col.status && "border-primary/50 bg-primary/[0.05]"
            )}
          >
            <div className="flex items-center justify-between px-1 pb-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{col.label}</p>
              <span className="text-xs text-muted-foreground">{colTasks.length}</span>
            </div>
            <div className="flex min-h-24 flex-col gap-2">
              {colTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", task.id)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
