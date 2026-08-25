import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NotebookText, Plus, Search } from "lucide-react";
import * as React from "react";
import { EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useDebounce } from "@/hooks/useDebounce";
import { cn, formatRelativeTime } from "@/lib/utils";
import { notesService } from "@/services/notesService";
import type { Note } from "@/types";

export default function Notes() {
  const [query, setQuery] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const debouncedQuery = useDebounce(query, 200);
  const queryClient = useQueryClient();

  const notesQuery = useQuery({ queryKey: ["notes", "list", debouncedQuery], queryFn: () => notesService.list(debouncedQuery) });

  React.useEffect(() => {
    if (!selectedId && notesQuery.data && notesQuery.data.length > 0) setSelectedId(notesQuery.data[0].id);
  }, [notesQuery.data, selectedId]);

  const createMutation = useMutation({
    mutationFn: () => notesService.create(),
    onSuccess: (note) => {
      queryClient.invalidateQueries({ queryKey: ["notes", "list"] });
      setSelectedId(note.id);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (patch: Partial<Pick<Note, "title" | "content">>) => notesService.update(selectedId!, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notes", "list"] }),
  });

  const selectedNote = notesQuery.data?.find((n) => n.id === selectedId);

  return (
    <div className="flex h-full">
      <aside className="hidden w-72 shrink-0 flex-col border-r border-border sm:flex">
        <div className="flex items-center gap-2 border-b border-border p-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search notes..." className="h-8 pl-8 text-xs" />
          </div>
          <Button size="icon-sm" onClick={() => createMutation.mutate()} aria-label="New note">
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {notesQuery.isLoading ? (
            <div className="space-y-2 p-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            notesQuery.data?.map((note) => (
              <button
                key={note.id}
                onClick={() => setSelectedId(note.id)}
                className={cn(
                  "flex w-full flex-col gap-1 border-b border-border/60 px-4 py-3 text-left transition-colors hover:bg-accent/40",
                  selectedId === note.id && "bg-accent/60"
                )}
              >
                <span className="truncate text-sm font-medium">{note.title || "Untitled note"}</span>
                <span className="truncate text-xs text-muted-foreground">{note.content || "No content yet"}</span>
                <span className="text-xs text-muted-foreground/70">{formatRelativeTime(note.updatedAt)}</span>
              </button>
            ))
          )}
        </div>
      </aside>

      <section className="flex-1 overflow-y-auto scrollbar-thin p-4 sm:p-6">
        {!selectedNote ? (
          <EmptyState icon={NotebookText} title="No note selected" description="Create a note to get started." action={<Button size="sm" onClick={() => createMutation.mutate()}>New note</Button>} />
        ) : (
          <div className="mx-auto max-w-2xl space-y-4">
            <Input
              defaultValue={selectedNote.title}
              key={selectedNote.id + "-title"}
              onBlur={(e) => updateMutation.mutate({ title: e.target.value })}
              placeholder="Untitled note"
              className="border-0 px-0 text-lg font-semibold shadow-none focus-visible:ring-0"
            />
            {selectedNote.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedNote.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
            <Textarea
              defaultValue={selectedNote.content}
              key={selectedNote.id + "-content"}
              onBlur={(e) => updateMutation.mutate({ content: e.target.value })}
              placeholder="Start writing..."
              className="min-h-[50vh] resize-none border-0 px-0 shadow-none focus-visible:ring-0"
            />
          </div>
        )}
      </section>
    </div>
  );
}
