import { useQuery } from "@tanstack/react-query";
import { GitPullRequest, Github, TriangleAlert } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { RepoCard } from "@/components/github/RepoCard";
import { RepoDetail } from "@/components/github/RepoDetail";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { githubService } from "@/services/githubService";
import type { Repository } from "@/types";

export default function GitHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const reposQuery = useQuery({ queryKey: ["github", "repos"], queryFn: githubService.listRepos });

  const selectedRepo: Repository | undefined = reposQuery.data?.find((r) => r.id === searchParams.get("repo")) ?? reposQuery.data?.[0];

  function handleSelect(repo: Repository) {
    setSearchParams({ repo: repo.id });
  }

  const totalOpenPRs = reposQuery.data?.reduce((sum, r) => sum + r.openPRs, 0) ?? 0;
  const totalOpenIssues = reposQuery.data?.reduce((sum, r) => sum + r.openIssues, 0) ?? 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <PageHeader title="GitHub" subtitle="Repositories, pull requests, and issues across your connected account." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Repositories" value={reposQuery.data?.length ?? "—"} icon={Github} accent="default" />
        <StatCard label="Open Pull Requests" value={totalOpenPRs} icon={GitPullRequest} accent="warning" />
        <StatCard label="Open Issues" value={totalOpenIssues} icon={TriangleAlert} accent="destructive" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
        <div className="space-y-2">
          {reposQuery.isLoading ? (
            [1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)
          ) : (
            reposQuery.data?.map((repo) => (
              <RepoCard key={repo.id} repo={repo} selected={repo.id === selectedRepo?.id} onSelect={handleSelect} />
            ))
          )}
        </div>

        <Card className="p-5">{selectedRepo && <RepoDetail repo={selectedRepo} />}</Card>
      </div>
    </div>
  );
}
