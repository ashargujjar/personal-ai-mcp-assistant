import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Layers } from "lucide-react";
import { DocumentCard } from "@/components/knowledge/DocumentCard";
import { UploadDialog } from "@/components/knowledge/UploadDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { knowledgeService } from "@/services/knowledgeService";

export default function Knowledge() {
  const queryClient = useQueryClient();
  const docsQuery = useQuery({ queryKey: ["knowledge", "list"], queryFn: knowledgeService.list });

  const uploadMutation = useMutation({
    mutationFn: (filename: string) => knowledgeService.upload(filename),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["knowledge", "list"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => knowledgeService.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["knowledge", "list"] }),
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Knowledge Base"
        subtitle={`${docsQuery.data?.length ?? 0} document${docsQuery.data?.length === 1 ? "" : "s"} uploaded. Ask questions about them from the Assistant chat.`}
        actions={<UploadDialog onUpload={(filename) => uploadMutation.mutate(filename)} />}
      />

      {docsQuery.isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : !docsQuery.data || docsQuery.data.length === 0 ? (
        <EmptyState icon={Layers} title="No documents yet" description="Upload a PDF to make it searchable." />
      ) : (
        <div className="space-y-3">
          {docsQuery.data.map((doc) => (
            <DocumentCard key={doc.id} doc={doc} onDelete={(id) => deleteMutation.mutate(id)} />
          ))}
        </div>
      )}
    </div>
  );
}
