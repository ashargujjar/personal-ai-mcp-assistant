import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CircleDot, ShieldCheck } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { approvalService } from "@/services/approvalService";
import type { Repository } from "@/types";

export function CreateItemDialog({ repo }: { repo: Repository }) {
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const requestMutation = useMutation({
    mutationFn: () =>
      approvalService.request({
        type: "github_issue",
        title: `Open issue in ${repo.name}`,
        context: title,
        target: repo.name,
        aiDraft: description,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approvals", "list"] });
      toast({ title: "Sent for approval", description: "Nothing is created on GitHub until you approve it in the Approval Center." });
      setTitle("");
      setDescription("");
      setOpen(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <CircleDot className="h-3.5 w-3.5" />
          New Issue
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Open a new issue</DialogTitle>
          <DialogDescription className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            Requires approval before it's created on GitHub.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Describe the bug or request" />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} placeholder="Details for the AI to include..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => requestMutation.mutate()} disabled={!title.trim() || requestMutation.isPending}>
            Request approval
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
