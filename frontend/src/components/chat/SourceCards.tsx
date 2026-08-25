import { Calendar, FileText, Github, Globe, Mail, Sparkles, type LucideIcon } from "lucide-react";
import type { SourceCitation } from "@/types";

const icons: Record<SourceCitation["type"], LucideIcon> = {
  github: Github,
  document: FileText,
  email: Mail,
  memory: Sparkles,
  calendar: Calendar,
  web: Globe,
};

export function SourceCards({ sources }: { sources: SourceCitation[] }) {
  if (sources.length === 0) return null;

  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">Sources</p>
      <div className="flex flex-wrap gap-2">
        {sources.map((source) => {
          const Icon = icons[source.type];
          return (
            <div
              key={source.id}
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs"
            >
              <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="truncate font-medium leading-tight">{source.title}</p>
                {source.subtitle && <p className="truncate text-muted-foreground leading-tight">{source.subtitle}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
