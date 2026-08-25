import { GitPullRequest, Lock, Star, TriangleAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Repository } from "@/types";

export function RepoCard({ repo, selected, onSelect }: { repo: Repository; selected?: boolean; onSelect: (repo: Repository) => void }) {
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onSelect(repo)}
      onKeyDown={(e) => e.key === "Enter" && onSelect(repo)}
      className={cn(
        "cursor-pointer p-4 transition-colors hover:border-primary/40",
        selected && "border-primary/60 bg-accent/40"
      )}
    >
      <div className="flex items-center gap-1.5 text-sm font-medium">
        {repo.isPrivate && <Lock className="h-3 w-3 shrink-0 text-muted-foreground" />}
        <span className="truncate">{repo.name}</span>
      </div>
      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{repo.description}</p>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Star className="h-3 w-3" />
          {repo.stars}
        </span>
        <span className="flex items-center gap-1">
          <GitPullRequest className="h-3 w-3" />
          {repo.openPRs}
        </span>
        <span className="flex items-center gap-1">
          <TriangleAlert className="h-3 w-3" />
          {repo.openIssues}
        </span>
        <span className="ml-auto">{repo.language}</span>
      </div>
    </Card>
  );
}
