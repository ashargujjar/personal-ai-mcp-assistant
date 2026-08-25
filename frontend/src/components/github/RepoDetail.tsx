import { useQuery } from "@tanstack/react-query";
import { GitPullRequest, TriangleAlert } from "lucide-react";
import { CreateItemDialog } from "./CreateItemDialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatRelativeTime } from "@/lib/utils";
import { githubService } from "@/services/githubService";
import type { Repository } from "@/types";

const prStateVariant = { open: "success", merged: "default", closed: "muted" } as const;

export function RepoDetail({ repo }: { repo: Repository }) {
  const prs = useQuery({ queryKey: ["github", "prs", repo.id], queryFn: () => githubService.listPullRequests(repo.id) });
  const issues = useQuery({ queryKey: ["github", "issues", repo.id], queryFn: () => githubService.listIssues(repo.id) });

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{repo.name}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{repo.description}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <CreateItemDialog repo={repo} />
        </div>
      </div>

      <Tabs defaultValue="prs" className="mt-4">
        <TabsList>
          <TabsTrigger value="prs">Pull Requests ({repo.openPRs})</TabsTrigger>
          <TabsTrigger value="issues">Issues ({repo.openIssues})</TabsTrigger>
        </TabsList>

        <TabsContent value="prs" className="mt-3 space-y-2">
          {prs.isLoading ? (
            <Skeleton className="h-14 w-full" />
          ) : (
            prs.data?.map((pr) => (
              <div key={pr.id} className="flex items-start gap-2.5 rounded-lg border border-border p-3">
                <GitPullRequest className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-snug">
                    #{pr.number} {pr.title}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {pr.author} · {formatRelativeTime(pr.createdAt)}
                  </p>
                </div>
                <Badge variant={prStateVariant[pr.state]}>{pr.state}</Badge>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="issues" className="mt-3 space-y-2">
          {issues.isLoading ? (
            <Skeleton className="h-14 w-full" />
          ) : (
            issues.data?.map((issue) => (
              <div key={issue.id} className="flex items-start gap-2.5 rounded-lg border border-border p-3">
                <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-snug">
                    #{issue.number} {issue.title}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <span>{issue.author} · {formatRelativeTime(issue.createdAt)}</span>
                    {issue.labels.map((l) => (
                      <Badge key={l} variant="secondary">{l}</Badge>
                    ))}
                  </div>
                </div>
                <Badge variant={issue.state === "open" ? "success" : "muted"}>{issue.state}</Badge>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
