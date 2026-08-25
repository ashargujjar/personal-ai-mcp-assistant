import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckSquare } from "lucide-react";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { TaskCard } from "@/components/tasks/TaskCard";
import { TaskFormDialog, type TaskFormValues } from "@/components/tasks/TaskFormDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { taskService } from "@/services/taskService";
import type { Task, TaskStatus } from "@/types";

const TODAY = new Date("2026-08-22T00:00:00");
const TODAY_KEY = "2026-08-22";

function isSameLocalDate(iso: string) {
  return iso.slice(0, 10) === TODAY_KEY;
}

export default function Tasks() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const tasksQuery = useQuery({ queryKey: ["tasks", "list"], queryFn: taskService.list });

  const createMutation = useMutation({
    mutationFn: (values: TaskFormValues) => taskService.create(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", "list"] });
      toast({ title: "Task created" });
    },
  });

  const moveMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) => taskService.updateStatus(id, status),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ["tasks", "list"] });
      const previous = queryClient.getQueryData<Task[]>(["tasks", "list"]);
      queryClient.setQueryData<Task[]>(["tasks", "list"], (old) => old?.map((t) => (t.id === id ? { ...t, status } : t)));
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(["tasks", "list"], context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["tasks", "list"] }),
  });

  const tasks = tasksQuery.data ?? [];
  const today = tasks.filter((t) => t.status !== "done" && t.deadline && isSameLocalDate(t.deadline));
  const overdue = tasks.filter((t) => t.status !== "done" && t.deadline && new Date(t.deadline) < TODAY && !isSameLocalDate(t.deadline));
  const upcoming = tasks.filter((t) => t.status !== "done" && (!t.deadline || (new Date(t.deadline) > TODAY && !isSameLocalDate(t.deadline))));
  const completed = tasks.filter((t) => t.status === "done");

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Tasks"
        subtitle="Everything NEXUS and your connected tools have surfaced for you."
        actions={<TaskFormDialog onCreate={(values) => createMutation.mutate(values)} />}
      />

      <Tabs defaultValue="today">
        <TabsList>
          <TabsTrigger value="today">Today ({today.length})</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="overdue">Overdue ({overdue.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
        </TabsList>

        {tasksQuery.isLoading ? (
          <div className="mt-4 space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : (
          <>
            <TabsContent value="today">
              <TaskList tasks={today} emptyLabel="Nothing due today." />
            </TabsContent>
            <TabsContent value="upcoming">
              <TaskList tasks={upcoming} emptyLabel="No upcoming tasks." />
            </TabsContent>
            <TabsContent value="overdue">
              <TaskList tasks={overdue} emptyLabel="Nothing overdue — you're on track." />
            </TabsContent>
            <TabsContent value="completed">
              <TaskList tasks={completed} emptyLabel="No completed tasks yet." />
            </TabsContent>
            <TabsContent value="kanban">
              <KanbanBoard tasks={tasks} onMove={(id, status) => moveMutation.mutate({ id, status })} />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}

function TaskList({ tasks, emptyLabel }: { tasks: Task[]; emptyLabel: string }) {
  if (tasks.length === 0) {
    return <EmptyState icon={CheckSquare} title={emptyLabel} />;
  }
  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  );
}
