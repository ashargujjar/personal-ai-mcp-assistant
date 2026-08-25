import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BrainCircuit, Plus, Search } from "lucide-react";
import * as React from "react";
import { MemoryCard } from "@/components/memory/MemoryCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/useDebounce";
import { useToast } from "@/hooks/use-toast";
import { memoryService } from "@/services/memoryService";

export default function Memory() {
  const [query, setQuery] = React.useState("");
  const [draft, setDraft] = React.useState("");
  const debouncedQuery = useDebounce(query, 200);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const memories = useQuery({ queryKey: ["memory", "list", debouncedQuery], queryFn: () => memoryService.list(debouncedQuery) });

  const createMutation = useMutation({
    mutationFn: (content: string) => memoryService.create(content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memory", "list"] });
      toast({ title: "Memory saved" });
      setDraft("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => memoryService.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["memory", "list"] }),
  });

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
      ) : !memories.data || memories.data.length === 0 ? (
        <EmptyState icon={BrainCircuit} title="No memories yet" description="Things NEXUS learns about you from conversations will show up here." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {memories.data.map((memory) => (
            <MemoryCard key={memory.id} memory={memory} onDelete={(id) => deleteMutation.mutate(id)} />
          ))}
        </div>
      )}
    </div>
  );
}
