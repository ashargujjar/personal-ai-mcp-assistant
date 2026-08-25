import { useQuery } from "@tanstack/react-query";
import { Database as DatabaseIcon, HardDrive, Table2 } from "lucide-react";
import * as React from "react";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusDot } from "@/components/shared/StatusDot";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { databaseService } from "@/services/databaseService";
import type { DatabaseConnection } from "@/types";

export default function Database() {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const connectionsQuery = useQuery({ queryKey: ["database", "connections"], queryFn: databaseService.listConnections });

  React.useEffect(() => {
    if (!selectedId && connectionsQuery.data?.[0]) setSelectedId(connectionsQuery.data[0].id);
  }, [connectionsQuery.data, selectedId]);

  const tablesQuery = useQuery({
    queryKey: ["database", "tables", selectedId],
    queryFn: () => databaseService.listTables(selectedId!),
    enabled: !!selectedId,
  });

  const selectedConnection: DatabaseConnection | undefined = connectionsQuery.data?.find((c) => c.id === selectedId);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <PageHeader title="Database" subtitle="Connected databases your assistant can query as a tool." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
        <div className="space-y-2">
          {connectionsQuery.isLoading ? (
            [1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)
          ) : (
            connectionsQuery.data?.map((conn) => (
              <Card
                key={conn.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedId(conn.id)}
                className={cn("cursor-pointer p-3.5 transition-colors hover:border-primary/40", selectedId === conn.id && "border-primary/60 bg-accent/40")}
              >
                <div className="flex items-center gap-2">
                  <HardDrive className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate text-sm font-medium">{conn.name}</span>
                  <StatusDot status={conn.status === "connected" ? "connected" : conn.status === "error" ? "error" : "disconnected"} className="ml-auto" />
                </div>
                <p className="mt-1.5 text-xs uppercase tracking-wider text-muted-foreground">{conn.engine}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {conn.tableCount} tables · {conn.sizeMb.toLocaleString()} MB
                </p>
              </Card>
            ))
          )}
        </div>

        <Card className="p-5">
          {!selectedConnection ? (
            <EmptyState icon={DatabaseIcon} title="No database connected" />
          ) : (
            <>
              <h3 className="text-sm font-semibold">{selectedConnection.name}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {selectedConnection.engine} · last synced {new Date(selectedConnection.lastSyncedAt).toLocaleString()}
              </p>

              <div className="mt-4 space-y-2">
                {tablesQuery.isLoading ? (
                  [1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)
                ) : !tablesQuery.data || tablesQuery.data.length === 0 ? (
                  <EmptyState icon={Table2} title="No tables found" />
                ) : (
                  tablesQuery.data.map((table) => (
                    <div key={table.id} className="rounded-lg border border-border p-3">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-sm font-medium">
                          <Table2 className="h-3.5 w-3.5 text-muted-foreground" />
                          {table.name}
                        </span>
                        <span className="text-xs text-muted-foreground">{table.rowCount.toLocaleString()} rows</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {table.columns.map((col) => (
                          <span key={col.name} className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                            {col.name}: {col.type}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
