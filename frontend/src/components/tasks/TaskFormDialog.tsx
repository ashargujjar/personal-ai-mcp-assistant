import { Plus } from "lucide-react";
import * as React from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Priority } from "@/types";

const taskSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  deadline: z.string().optional(),
  project: z.string().optional(),
});

export type TaskFormValues = z.infer<typeof taskSchema>;

export function TaskFormDialog({ onCreate }: { onCreate: (values: TaskFormValues) => void }) {
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [priority, setPriority] = React.useState<Priority>("medium");
  const [deadline, setDeadline] = React.useState("");
  const [project, setProject] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  function reset() {
    setTitle("");
    setDescription("");
    setPriority("medium");
    setDeadline("");
    setProject("");
    setError(null);
  }

  function handleSubmit() {
    const result = taskSchema.safeParse({
      title,
      description: description || undefined,
      priority,
      deadline: deadline ? new Date(deadline).toISOString() : undefined,
      project: project || undefined,
    });

    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    onCreate(result.data);
    setOpen(false);
    reset();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          New Task
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Title</Label>
            <Input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Review authentication PR" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="task-description">Description</Label>
            <Textarea id="task-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-deadline">Deadline</Label>
              <Input id="task-deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="task-project">Project</Label>
            <Input id="task-project" value={project} onChange={(e) => setProject(e.target.value)} placeholder="e.g. nexus-ai-backend" />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Create task</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
