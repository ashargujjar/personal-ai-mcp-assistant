import {
  Calendar,
  FileText,
  Github,
  Mail,
  MessageSquare,
  NotebookText,
  Search,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useCommandPalette } from "@/hooks/useCommandPalette";
import { useDebounce } from "@/hooks/useDebounce";
import { searchService } from "@/services/searchService";
import type { SearchResultItem } from "@/types";

const typeIcons: Record<SearchResultItem["type"], LucideIcon> = {
  email: Mail,
  github: Github,
  document: FileText,
  memory: Sparkles,
  note: NotebookText,
  task: MessageSquare,
  meeting: Users,
  calendar: Calendar,
};

const typeLabels: Record<SearchResultItem["type"], string> = {
  email: "Email",
  github: "GitHub",
  document: "Document",
  memory: "Memory",
  note: "Note",
  task: "Task",
  meeting: "Meeting",
  calendar: "Calendar",
};

const staticNav = [
  { label: "Dashboard", path: "/" },
  { label: "AI Assistant", path: "/assistant" },
  { label: "Voice", path: "/voice" },
  { label: "Memory", path: "/memory" },
  { label: "Knowledge Base", path: "/knowledge" },
  { label: "Notes", path: "/notes" },
  { label: "Tasks", path: "/tasks" },
  { label: "Calendar", path: "/calendar" },
  { label: "Email", path: "/email" },
  { label: "Meetings", path: "/meetings" },
  { label: "Resume Screening", path: "/resume-screening" },
  { label: "GitHub", path: "/github" },
  { label: "Database", path: "/database" },
  { label: "Webhooks", path: "/webhooks" },
  { label: "Approvals", path: "/approvals" },
  { label: "Tool Activity", path: "/tool-activity" },
  { label: "Settings", path: "/settings" },
];

export function CommandPalette() {
  const { open, setOpen } = useCommandPalette();
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResultItem[]>([]);
  const debouncedQuery = useDebounce(query, 200);
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  React.useEffect(() => {
    let active = true;
    if (!debouncedQuery.trim()) {
      setResults([]);
      return;
    }
    searchService.search(debouncedQuery).then((res) => {
      if (active) setResults(res);
    });
    return () => {
      active = false;
    };
  }, [debouncedQuery]);

  function go(path: string) {
    setOpen(false);
    navigate(path);
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search everything — emails, GitHub, documents, tasks..." value={query} onValueChange={setQuery} />
      <CommandList>
        {query.trim() === "" ? (
          <CommandGroup heading="Navigate">
            {staticNav.map((item) => (
              <CommandItem key={item.path} onSelect={() => go(item.path)}>
                <Search className="text-muted-foreground" />
                <span>{item.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : (
          <>
            <CommandEmpty>No results found for "{query}"</CommandEmpty>
            {results.length > 0 && (
              <CommandGroup heading={`Results (${results.length})`}>
                {results.map((r) => {
                  const Icon = typeIcons[r.type];
                  return (
                    <CommandItem key={`${r.type}-${r.id}`} onSelect={() => go(r.path)}>
                      <Icon className="text-muted-foreground" />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate">{r.title}</span>
                        <span className="truncate text-xs text-muted-foreground">{r.subtitle}</span>
                      </div>
                      <span className="ml-auto shrink-0 text-xs text-muted-foreground">{typeLabels[r.type]}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
