import { FileText, Search, Sparkles } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { knowledgeService } from "@/services/knowledgeService";
import type { KnowledgeAnswer } from "@/types";

export function KnowledgeSearchPanel() {
  const [question, setQuestion] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [answer, setAnswer] = React.useState<KnowledgeAnswer | null>(null);

  async function handleAsk() {
    if (!question.trim() || isLoading) return;
    setIsLoading(true);
    const result = await knowledgeService.ask(question);
    setAnswer(result);
    setIsLoading(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAsk()}
          placeholder="Ask a question about your documents..."
        />
        <Button onClick={handleAsk} disabled={!question.trim() || isLoading}>
          <Search className="h-3.5 w-3.5" />
          Ask
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      )}

      {!isLoading && answer && (
        <Card className="p-4">
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <p className="text-sm leading-relaxed">{answer.answer}</p>
          </div>
          {answer.citations.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2 pl-8.5">
              {answer.citations.map((c) => (
                <div key={c.id} className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground">
                  <FileText className="h-3 w-3" />
                  {c.filename}
                  {c.page && <span>· p.{c.page}</span>}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
