import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { PermissionRow } from "@/components/settings/PermissionRow";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { calendarService } from "@/services/calendarService";
import { gmailService } from "@/services/gmailService";

function ConnectionControl({
  connected,
  isLoading,
  onConnect,
  onDisconnect,
  isDisconnecting,
  label,
}: {
  connected: boolean;
  isLoading: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  isDisconnecting: boolean;
  label: string;
}) {
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  if (!connected) {
    return (
      <Button size="sm" onClick={onConnect} disabled={isLoading}>
        Connect {label}
      </Button>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Badge variant="success">Connected</Badge>
        <Button variant="outline" size="sm" onClick={() => setConfirmOpen(true)} disabled={isDisconnecting}>
          Disconnect
        </Button>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Disconnect ${label}?`}
        description={`NEXUS will no longer be able to access your ${label} account until you reconnect it.`}
        confirmLabel="Disconnect"
        destructive
        onConfirm={onDisconnect}
      />
    </>
  );
}

export default function ToolPermissions() {
  const { token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const gmailStatus = useQuery({
    queryKey: ["gmail", "status"],
    queryFn: () => gmailService.getStatus(token),
    enabled: Boolean(token),
  });

  const calendarStatus = useQuery({
    queryKey: ["calendar", "status"],
    queryFn: () => calendarService.getStatus(token),
    enabled: Boolean(token),
  });

  async function handleConnectGmail() {
    try {
      const url = await gmailService.getConnectUrl(token);
      window.location.href = url;
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "Failed to start Gmail connection" });
    }
  }

  async function handleConnectCalendar() {
    try {
      const url = await calendarService.getConnectUrl(token);
      window.location.href = url;
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "Failed to start Calendar connection" });
    }
  }

  const disconnectGmailMutation = useMutation({
    mutationFn: () => gmailService.disconnect(token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gmail", "status"] });
      toast({ title: "Gmail disconnected" });
    },
    onError: (err) => toast({ title: err instanceof Error ? err.message : "Failed to disconnect Gmail" }),
  });

  const disconnectCalendarMutation = useMutation({
    mutationFn: () => calendarService.disconnect(token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar", "status"] });
      toast({ title: "Calendar disconnected" });
    },
    onError: (err) => toast({ title: err instanceof Error ? err.message : "Failed to disconnect Calendar" }),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <PageHeader title="Tool Permissions" subtitle="Control what NEXUS is allowed to do with each connected tool." />

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>GitHub</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            <PermissionRow label="Read repositories" level="allowed" />
            <PermissionRow label="Read issues" level="allowed" />
            <PermissionRow label="Create issues" level="approval" />
            <PermissionRow label="Create pull requests" level="approval" />
            <PermissionRow label="Delete repositories" level="disabled" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Gmail</CardTitle>
            <ConnectionControl
              connected={Boolean(gmailStatus.data?.connected)}
              isLoading={gmailStatus.isLoading}
              onConnect={handleConnectGmail}
              onDisconnect={() => disconnectGmailMutation.mutate()}
              isDisconnecting={disconnectGmailMutation.isPending}
              label="Gmail"
            />
          </CardHeader>
          <CardContent className="divide-y divide-border">
            <PermissionRow label="Read emails" level="allowed" />
            <PermissionRow label="Search emails" level="allowed" />
            <PermissionRow label="Send emails" level="approval" />
            <PermissionRow label="Delete emails" level="approval" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Calendar</CardTitle>
            <ConnectionControl
              connected={Boolean(calendarStatus.data?.connected)}
              isLoading={calendarStatus.isLoading}
              onConnect={handleConnectCalendar}
              onDisconnect={() => disconnectCalendarMutation.mutate()}
              isDisconnecting={disconnectCalendarMutation.isPending}
              label="Calendar"
            />
          </CardHeader>
          <CardContent className="divide-y divide-border">
            <PermissionRow label="Read events" level="allowed" />
            <PermissionRow label="Create events" level="approval" />
            <PermissionRow label="Delete events" level="approval" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
