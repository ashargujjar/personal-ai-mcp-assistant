import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Layers } from "lucide-react";
import { DocumentCard } from "@/components/knowledge/DocumentCard";
import { UploadDialog } from "@/components/knowledge/UploadDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { knowledgeService } from "@/services/knowledgeService";

export default function Knowledge() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const docsQuery = useQuery({ queryKey: ["knowledge", "list", token], queryFn: () => knowledgeService.list(token), enabled: !!token });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => knowledgeService.upload(token, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["knowledge", "list"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => knowledgeService.remove(token, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["knowledge", "list"] }),
  });

  const downloadMutation = useMutation({ mutationFn: (id: string) => knowledgeService.download(token, id) });

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Knowledge Base"
        subtitle={`${docsQuery.data?.length ?? 0} document${docsQuery.data?.length === 1 ? "" : "s"} uploaded.`}
        actions={<UploadDialog onUpload={(file) => uploadMutation.mutateAsync(file)} />}
      />

      {(deleteMutation.error || downloadMutation.error) && <p role="alert" className="text-destructive">{(deleteMutation.error || downloadMutation.error)?.message}</p>}
      {docsQuery.isError ? <p role="alert" className="text-destructive">{docsQuery.error.message}</p> : docsQuery.isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : !docsQuery.data || docsQuery.data.length === 0 ? (
        <EmptyState icon={Layers} title="No documents yet" description="Upload a PDF to store it in your knowledge base." />
      ) : (
        <div className="space-y-3">
          {docsQuery.data.map((doc) => (
            <DocumentCard key={doc.id} doc={doc} onDownload={(id) => downloadMutation.mutate(id)} onDelete={(id) => deleteMutation.mutate(id)} />
          ))}
        </div>
      )}
    </div>
  );
}
