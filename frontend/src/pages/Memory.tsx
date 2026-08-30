import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BrainCircuit, ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import * as React from "react";
import { MemoryCard } from "@/components/memory/MemoryCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useDebounce } from "@/hooks/useDebounce";
import { useToast } from "@/hooks/use-toast";
import { memoryService } from "@/services/memoryService";

const PAGE_SIZE = 10;

export default function Memory() {
  const { token } = useAuth();
  const [query, setQuery] = React.useState("");
  const [draft, setDraft] = React.useState("");
  const [page, setPage] = React.useState(1);
  const debouncedQuery = useDebounce(query, 200);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  React.useEffect(() => {
    setPage(1);
  }, [debouncedQuery]);

  const memories = useQuery({
    queryKey: ["memory", "list", page, PAGE_SIZE, debouncedQuery],
    queryFn: () => memoryService.list(token, page, PAGE_SIZE, debouncedQuery),
  });

  const createMutation = useMutation({
    mutationFn: (content: string) => memoryService.create(token, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memory", "list"] });
      toast({ title: "Memory saved" });
      setDraft("");
    },
    onError: (err) => toast({ title: err instanceof Error ? err.message : "Something went wrong" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => memoryService.remove(token, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["memory", "list"] }),
    onError: (err) => toast({ title: err instanceof Error ? err.message : "Something went wrong" }),
  });

  const pagination = memories.data?.pagination;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <PageHeader title="Memory" subtitle="What NEXUS remembers about you across every conversation." />

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search memories..." className="pl-9" />
        </div>
      </div>

      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && draft.trim() && createMutation.mutate(draft.trim())}
          placeholder="Teach NEXUS something to remember..."
        />
        <Button onClick={() => draft.trim() && createMutation.mutate(draft.trim())} disabled={!draft.trim()}>
          <Plus className="h-3.5 w-3.5" />
          Remember
        </Button>
      </div>

      {memories.isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : !memories.data || memories.data.data.length === 0 ? (
        <EmptyState icon={BrainCircuit} title="No memories yet" description="Things NEXUS learns about you from conversations will show up here." />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {memories.data.data.map((memory) => (
              <MemoryCard key={memory.id} memory={memory} onDelete={(id) => deleteMutation.mutate(id)} />
            ))}
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages} · {pagination.total} total
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page >= pagination.totalPages}
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
