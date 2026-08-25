import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardBriefing } from "@/services/dashboardService";

export function BriefingCard({ briefing, isLoading }: { briefing?: DashboardBriefing; isLoading: boolean }) {
  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/[0.06] to-transparent">
      <CardHeader className="flex-row items-center gap-2 space-y-0">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 text-primary">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
        <CardTitle>Today's Briefing</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading || !briefing ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : (
          <>
            <ul className="space-y-1.5 text-sm text-foreground/90">
              {briefing.summaryLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Recommended focus</p>
              <ol className="space-y-1.5">
                {briefing.recommendedFocus.map((item, i) => (
                  <li key={item} className="flex items-start gap-2 text-sm">
                    <span className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
                      {i + 1}
                    </span>
                    {item}
                  </li>
                ))}
              </ol>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
