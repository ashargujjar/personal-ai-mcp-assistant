import { useMutation } from "@tanstack/react-query";
import { Award, Clock3, ExternalLink, GraduationCap, Inbox, Mail, ScanSearch, Sparkles, Trash2 } from "lucide-react";
import * as React from "react";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { formatDate, initials } from "@/lib/utils";
import { resumeService } from "@/services/resumeService";
import type { AtsResult, ResumeSearch, ResumeSubmission } from "@/types";

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const TODAY = localDateString();

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localDateString(d);
}

export default function ResumeScreening() {
  const { token } = useAuth();
  const [jobTitle, setJobTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [dateFrom, setDateFrom] = React.useState(daysAgo(21));
  const [dateTo, setDateTo] = React.useState(TODAY);
  const [tab, setTab] = React.useState("inbox");
  const [savedSearches, setSavedSearches] = React.useState<ResumeSearch[]>([]);
  const [selectedSearchId, setSelectedSearchId] = React.useState<string | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [isLoadingSearches, setIsLoadingSearches] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setIsLoadingSearches(true);
    resumeService
      .list(token)
      .then((searches) => {
        if (cancelled) return;
        setSavedSearches(searches);
        setSelectedSearchId((current) => current ?? searches[0]?.id ?? null);
        setLoadError(null);
      })
      .catch((error) => {
        if (cancelled) return;
        setLoadError(error instanceof Error ? error.message : "Failed to load resume searches.");
      })
      .finally(() => {
        if (!cancelled) setIsLoadingSearches(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const selectedSearch = savedSearches.find((search) => search.id === selectedSearchId);
  const submissions = selectedSearch?.submissions ?? [];
  const results = selectedSearch?.results ?? [];

  const fetchMutation = useMutation({
    mutationFn: async () => {
      return resumeService.create(token, {
        dateFrom,
        dateTo,
        jobTitle,
        description: description.trim() || undefined,
      });
    },
    onSuccess: (search) => {
      setSavedSearches((current) => [search, ...current.filter((item) => item.id !== search.id)]);
      setSelectedSearchId(search.id);
      setTab("inbox");
      setJobTitle("");
      setDescription("");
    },
  });

  const scanMutation = useMutation({
    mutationFn: () => resumeService.runAtsScan(submissions),
    onSuccess: (scanResults) => {
      if (!selectedSearchId) return;
      setSavedSearches((current) =>
        current.map((search) => (search.id === selectedSearchId ? { ...search, results: scanResults } : search)),
      );
      setTab("results");
    },
  });

  async function openSavedSearch(search: ResumeSearch) {
    setSelectedSearchId(search.id);
    fetchMutation.reset();
    scanMutation.reset();
    setTab(search.results.length > 0 ? "results" : "inbox");
    try {
      const freshSearch = await resumeService.get(token, search.id);
      setSavedSearches((current) => current.map((item) => (item.id === freshSearch.id ? freshSearch : item)));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Failed to refresh resume search.");
    }
  }

  async function removeSavedSearch(id: string) {
    await resumeService.remove(token, id);
    const remaining = savedSearches.filter((search) => search.id !== id);
    setSavedSearches(remaining);
    if (selectedSearchId === id) {
      setSelectedSearchId(remaining[0]?.id ?? null);
      setTab(remaining[0]?.results.length ? "results" : "inbox");
    }
  }

  function createSearch() {
    fetchMutation.mutate();
  }

  function statusLabel(status: ResumeSearch["status"]) {
    if (status === "queued") return "Queued";
    if (status === "searching") return "Searching Gmail";
    if (status === "downloading") return "Downloading CVs";
    if (status === "processing") return "Processing CVs";
    if (status === "failed") return "Failed";
    return "Ready";
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <PageHeader title="Resume Screening" subtitle="Pull resumes from your inbox for a date range and screen them with AI." />

      <Card>
        <CardHeader>
          <CardTitle>New resume search</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_180px_180px]">
            <div className="space-y-1.5">
              <Label>Job title</Label>
              <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Senior Backend Engineer" />
            </div>
            <div className="space-y-1.5">
              <Label>From</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} max={dateTo} />
            </div>
            <div className="space-y-1.5">
              <Label>To</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} min={dateFrom} max={TODAY} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Add role requirements or notes for the AI to screen against..."
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={createSearch} disabled={!jobTitle.trim() || fetchMutation.isPending}>
              <Mail className="h-3.5 w-3.5" />
              {fetchMutation.isPending ? "Adding search..." : "Fetch Resumes"}
            </Button>
          </div>
          {fetchMutation.isError && (
            <p className="text-sm text-destructive">
              {fetchMutation.error instanceof Error ? fetchMutation.error.message : "Resume search failed."}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle>Search queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoadingSearches ? (
              <Skeleton className="h-20 w-full" />
            ) : loadError ? (
              <p className="text-sm text-destructive">{loadError}</p>
            ) : savedSearches.length === 0 ? (
              <p className="text-sm text-muted-foreground">New searches will appear here.</p>
            ) : (
              savedSearches.map((search) => (
                <div
                  key={search.id}
                  className={`flex items-start gap-2 rounded-lg border p-2.5 ${
                    selectedSearchId === search.id ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => openSavedSearch(search)}>
                    <p className="truncate text-sm font-medium">{search.jobTitle}</p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock3 className="h-3 w-3" />
                      {formatDate(search.fetchedAt)} · {search.submissions.length} CVs
                    </p>
                    <p className={`mt-1 text-xs ${search.status === "failed" ? "text-destructive" : "text-muted-foreground"}`}>
                      {statusLabel(search.status)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {search.dateFrom} to {search.dateTo}
                    </p>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete ${search.jobTitle} search`}
                    onClick={() => void removeSavedSearch(search.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="min-w-0">
          {!selectedSearch ? (
            <EmptyState icon={Inbox} title="No search selected" description="Create a resume search above to add it to the queue." />
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{selectedSearch.jobTitle}</h2>
                  <p className="text-sm text-muted-foreground">
                    Fetched {formatDate(selectedSearch.fetchedAt)} · {selectedSearch.dateFrom} to {selectedSearch.dateTo}
                  </p>
                </div>
                {submissions.length > 0 && (
                  <Button variant="outline" size="sm" onClick={() => scanMutation.mutate()} disabled={scanMutation.isPending}>
                    <ScanSearch className="h-3.5 w-3.5" />
                    {scanMutation.isPending ? "Running ATS scan..." : "Run ATS Scan"}
                  </Button>
                )}
              </div>

              {selectedSearch.status !== "ready" && (
                <div className={`rounded-lg border p-3 text-sm ${selectedSearch.status === "failed" ? "border-destructive/30 text-destructive" : "border-primary/20 text-muted-foreground"}`}>
                  <p className="font-medium">{statusLabel(selectedSearch.status)}</p>
                  <p className="mt-1">{selectedSearch.error ?? "Refresh this search in a moment to load processed CVs."}</p>
                </div>
              )}

              <Tabs value={tab} onValueChange={setTab}>
                <TabsList>
                  <TabsTrigger value="inbox">Fetched ({submissions.length})</TabsTrigger>
                  <TabsTrigger value="results">Results ({results.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="inbox" className="mt-4 space-y-2">
                  {submissions.length === 0 ? (
                    <EmptyState icon={Inbox} title="No resumes found" description="Try widening the date range." />
                  ) : (
                    submissions.map((submission) => <SubmissionRow key={submission.id} submission={submission} />)
                  )}
                </TabsContent>

                <TabsContent value="results" className="mt-4 space-y-3">
                  {scanMutation.isPending ? (
                    [1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)
                  ) : results.length === 0 ? (
                    <EmptyState icon={ScanSearch} title="No results yet" description="Run an ATS scan on the fetched resumes." />
                  ) : (
                    <>
                      <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/[0.05] p-3 text-sm">
                        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                        <p>
                          Ranked against <span className="font-medium">{selectedSearch.jobTitle}</span>
                          {selectedSearch.description && <span className="text-muted-foreground"> · {selectedSearch.description}</span>}
                        </p>
                      </div>
                      {results.map((result, index) => {
                        const submission = submissions.find((item) => item.id === result.submissionId);
                        return submission ? (
                          <ResultCard key={result.submissionId} rank={index + 1} submission={submission} result={result} />
                        ) : null;
                      })}
                    </>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SubmissionRow({ submission }: { submission: ResumeSubmission }) {
  return (
    <Card className="p-3.5">
      <div className="flex items-center gap-3">
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarFallback>{initials(submission.candidateName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{submission.candidateName}</p>
          <p className="truncate text-xs text-muted-foreground">{submission.emailSubject}</p>
        </div>
        <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">{formatDate(submission.receivedAt)}</span>
        <a href={submission.cloudinaryUrl ?? undefined} target="_blank" rel="noreferrer" className="shrink-0">
          <Button variant="outline" size="sm" disabled={!submission.cloudinaryUrl}>
            <ExternalLink className="h-3.5 w-3.5" />
            View PDF
          </Button>
        </a>
      </div>
    </Card>
  );
}

function ResultCard({ rank, submission, result }: { rank: number; submission: ResumeSubmission; result: AtsResult }) {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {rank <= 3 ? <Award className="h-4 w-4" /> : `#${rank}`}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold">{submission.candidateName}</p>
            <span className="text-xs text-muted-foreground">{submission.candidateEmail}</span>
          </div>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <GraduationCap className="h-3 w-3" />
            {result.education ?? "Education not listed"} · {result.experienceYears} yrs experience
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-lg font-bold tabular-nums">{result.matchScore}%</span>
          <a href={submission.cloudinaryUrl ?? undefined} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm" disabled={!submission.cloudinaryUrl}>
              <ExternalLink className="h-3.5 w-3.5" />
              View PDF
            </Button>
          </a>
        </div>
      </div>

      <Progress value={result.matchScore} className="mt-3" />
      <p className="mt-3 text-sm text-muted-foreground">{result.experienceSummary}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {result.skills.map((skill) => (
          <Badge key={skill} variant={result.matchedSkills.includes(skill) ? "success" : "secondary"}>
            {skill}
          </Badge>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Strengths</p>
          <ul className="space-y-1 text-xs">
            {result.strengths.map((strength) => (
              <li key={strength} className="flex gap-1.5">
                <span className="text-success">+</span>
                {strength}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Gaps</p>
          <ul className="space-y-1 text-xs">
            {result.gaps.map((gap) => (
              <li key={gap} className="flex gap-1.5">
                <span className="text-destructive">-</span>
                {gap}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}
