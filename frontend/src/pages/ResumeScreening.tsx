import { useMutation } from "@tanstack/react-query";
import { Award, ExternalLink, GraduationCap, Inbox, Mail, ScanSearch, Sparkles } from "lucide-react";
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
import { formatDate, initials } from "@/lib/utils";
import { resumeService } from "@/services/resumeService";
import type { AtsResult, ResumeSubmission } from "@/types";

const TODAY = "2026-08-22";
function daysAgo(n: number) {
  const d = new Date(`${TODAY}T00:00:00`);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export default function ResumeScreening() {
  const [jobTitle, setJobTitle] = React.useState("Senior Backend Engineer");
  const [description, setDescription] = React.useState("");
  const [dateFrom, setDateFrom] = React.useState(daysAgo(21));
  const [dateTo, setDateTo] = React.useState(TODAY);
  const [tab, setTab] = React.useState("inbox");

  const fetchMutation = useMutation({
    mutationFn: () => resumeService.fetchFromGmail({ dateFrom, dateTo, jobTitle, description: description.trim() || undefined }),
    onSuccess: () => setTab("inbox"),
  });

  const scanMutation = useMutation({
    mutationFn: () => resumeService.runAtsScan(fetchMutation.data ?? []),
    onSuccess: () => setTab("results"),
  });

  const submissions = fetchMutation.data ?? [];
  const results = scanMutation.data ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <PageHeader title="Resume Screening" subtitle="Pull resumes from your inbox for a date range and screen them with AI." />

      <Card>
        <CardHeader>
          <CardTitle>Search criteria</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Job title</Label>
              <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Senior Backend Engineer" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>From</Label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} max={dateTo} />
              </div>
              <div className="space-y-1.5">
                <Label>To</Label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} min={dateFrom} max={TODAY} />
              </div>
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
            <Button onClick={() => fetchMutation.mutate()} disabled={!jobTitle.trim() || fetchMutation.isPending}>
              <Mail className="h-3.5 w-3.5" />
              {fetchMutation.isPending ? "Fetching from Gmail..." : "Fetch Resumes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {(fetchMutation.isPending || fetchMutation.isSuccess) && (
        <Tabs value={tab} onValueChange={setTab}>
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="inbox">Fetched ({submissions.length})</TabsTrigger>
              <TabsTrigger value="results">Results ({results.length})</TabsTrigger>
            </TabsList>
            {submissions.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => scanMutation.mutate()} disabled={scanMutation.isPending}>
                <ScanSearch className="h-3.5 w-3.5" />
                {scanMutation.isPending ? "Running ATS scan..." : "Run ATS Scan"}
              </Button>
            )}
          </div>

          <TabsContent value="inbox" className="mt-4 space-y-2">
            {fetchMutation.isPending ? (
              [1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)
            ) : submissions.length === 0 ? (
              <EmptyState icon={Inbox} title="No resumes found" description="Try widening the date range." />
            ) : (
              submissions.map((s) => <SubmissionRow key={s.id} submission={s} />)
            )}
          </TabsContent>

          <TabsContent value="results" className="mt-4 space-y-3">
            {scanMutation.isPending ? (
              [1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)
            ) : results.length === 0 ? (
              <EmptyState
                icon={ScanSearch}
                title="No results yet"
                description="Run an ATS scan on the fetched resumes to see ranked matches."
              />
            ) : (
              <>
                <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/[0.05] p-3 text-sm">
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <p>
                    Ranked against <span className="font-medium">{jobTitle}</span>
                    {description.trim() && <span className="text-muted-foreground"> — {description.trim()}</span>}
                  </p>
                </div>
                {results.map((r, i) => {
                  const submission = submissions.find((s) => s.id === r.submissionId);
                  if (!submission) return null;
                  return <ResultCard key={r.submissionId} rank={i + 1} submission={submission} result={r} />;
                })}
              </>
            )}
          </TabsContent>
        </Tabs>
      )}
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
        <a href={submission.pdfLink} target="_blank" rel="noreferrer" className="shrink-0">
          <Button variant="outline" size="sm">
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
          <a href={submission.pdfLink} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm">
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
            {result.strengths.map((s) => (
              <li key={s} className="flex gap-1.5">
                <span className="text-success">+</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Gaps</p>
          <ul className="space-y-1 text-xs">
            {result.gaps.map((g) => (
              <li key={g} className="flex gap-1.5">
                <span className="text-destructive">−</span>
                {g}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}
