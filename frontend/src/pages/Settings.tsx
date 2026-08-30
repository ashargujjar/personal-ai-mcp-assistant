import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, CreditCard, Key, RefreshCw } from "lucide-react";
import * as React from "react";
import { useSearchParams } from "react-router-dom";
import { PermissionRow } from "@/components/settings/PermissionRow";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";
import { gmailService } from "@/services/gmailService";

const sections = [
  "General",
  "Appearance",
  "AI Models",
  "Memory",
  "Notifications",
  "Security",
  "Privacy",
  "Tool Permissions",
  "API",
  "Billing",
] as const;

type Section = (typeof sections)[number];

export default function Settings() {
  const [active, setActive] = React.useState<Section>("General");
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  React.useEffect(() => {
    if (searchParams.get("gmail") === "connected") {
      toast({ title: "Gmail connected" });
      queryClient.invalidateQueries({ queryKey: ["gmail", "status"] });
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, queryClient, toast]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <PageHeader title="Settings" subtitle="Manage your NEXUS AI workspace." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[200px_1fr]">
        <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
          {sections.map((section) => (
            <button
              key={section}
              onClick={() => setActive(section)}
              className={cn(
                "shrink-0 rounded-md px-3 py-1.5 text-left text-sm transition-colors",
                active === section ? "bg-accent font-medium text-foreground" : "text-muted-foreground hover:bg-accent/60"
              )}
            >
              {section}
            </button>
          ))}
        </nav>

        <div>
          {active === "General" && <GeneralSection />}
          {active === "Appearance" && <AppearanceSection />}
          {active === "AI Models" && <AiModelsSection />}
          {active === "Memory" && <MemorySection />}
          {active === "Notifications" && <NotificationsSection />}
          {active === "Security" && <SecuritySection />}
          {active === "Privacy" && <PrivacySection />}
          {active === "Tool Permissions" && <ToolPermissionsSection />}
          {active === "API" && <ApiSection />}
          {active === "Billing" && <BillingSection />}
        </div>
      </div>
    </div>
  );
}

function GeneralSection() {
  const { user } = useAuth();
  return (
    <Card>
      <CardHeader>
        <CardTitle>General</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field label="Name" defaultValue={user?.name ?? ""} />
        <Field label="Email" defaultValue={user?.email ?? ""} />
        <div className="space-y-1.5">
          <Label>Timezone</Label>
          <Select defaultValue="pst">
            <SelectTrigger className="max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pst">Pacific Time (PST)</SelectItem>
              <SelectItem value="est">Eastern Time (EST)</SelectItem>
              <SelectItem value="utc">UTC</SelectItem>
              <SelectItem value="ist">India Standard Time (IST)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}

function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>Theme</Label>
          <div className="flex gap-2">
            <Button variant={theme === "dark" ? "default" : "outline"} size="sm" onClick={() => setTheme("dark")}>
              Dark
            </Button>
            <Button variant={theme === "light" ? "default" : "outline"} size="sm" onClick={() => setTheme("light")}>
              Light
            </Button>
          </div>
        </div>
        <SwitchRow label="Compact sidebar" description="Reduce spacing in the navigation sidebar." />
        <SwitchRow label="Reduce motion" description="Minimize animations across the interface." />
      </CardContent>
    </Card>
  );
}

function AiModelsSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Models</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>Primary model</Label>
          <Select defaultValue="sonnet-5">
            <SelectTrigger className="max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sonnet-5">Claude Sonnet 5</SelectItem>
              <SelectItem value="opus-5">Claude Opus 5</SelectItem>
              <SelectItem value="haiku-4.5">Claude Haiku 4.5</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <SwitchRow label="Extended thinking" description="Allow the assistant to reason longer on complex requests." defaultChecked />
        <SwitchRow label="Web search" description="Let the assistant search the web when relevant." defaultChecked />
      </CardContent>
    </Card>
  );
}

function MemorySection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Memory</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <SwitchRow label="Auto-capture memories" description="Automatically save relevant facts from conversations." defaultChecked />
        <SwitchRow label="Cross-session recall" description="Reference memories from previous conversations." defaultChecked />
        <div className="space-y-1.5">
          <Label>Retention period</Label>
          <Select defaultValue="forever">
            <SelectTrigger className="max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="90d">90 days</SelectItem>
              <SelectItem value="1y">1 year</SelectItem>
              <SelectItem value="forever">Forever</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}

function NotificationsSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <SwitchRow label="Daily briefing email" description="Receive your AI briefing by email each morning." defaultChecked />
        <SwitchRow label="Task deadline reminders" description="Get notified before tasks are due." defaultChecked />
        <SwitchRow label="Meeting prep alerts" description="Notify 15 minutes before meetings with a brief." defaultChecked />
        <SwitchRow label="Approval requests" description="Notify when NEXUS needs approval for an action." defaultChecked />
      </CardContent>
    </Card>
  );
}

function SecuritySection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Security</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <SwitchRow label="Two-factor authentication" description="Require a verification code when signing in." defaultChecked />
        <Separator />
        <div>
          <p className="mb-2 text-sm font-medium">Active sessions</p>
          <div className="space-y-2">
            <SessionRow device="Windows · Chrome" location="Bengaluru, India" current />
            <SessionRow device="iPhone · Safari" location="Bengaluru, India" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PrivacySection() {
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const { toast } = useToast();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Privacy</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <SwitchRow label="Usage analytics" description="Help improve NEXUS by sharing anonymous usage data." defaultChecked />
        <div className="flex flex-wrap gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => toast({ title: "Export started", description: "We'll email you a download link." })}>
            Export my data
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setConfirmOpen(true)}>
            Delete account
          </Button>
        </div>
      </CardContent>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete your account?"
        description="This will permanently delete all your data, memories, and connected integrations. This action cannot be undone."
        confirmLabel="Delete account"
        destructive
        onConfirm={() => toast({ title: "This is a demo", description: "Account deletion is disabled in this preview." })}
      />
    </Card>
  );
}

function ToolPermissionsSection() {
  const { token } = useAuth();
  const { toast } = useToast();

  const status = useQuery({
    queryKey: ["gmail", "status"],
    queryFn: () => gmailService.getStatus(token),
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

  return (
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
          {status.data?.connected ? (
            <Badge variant="success">Connected</Badge>
          ) : (
            <Button size="sm" onClick={handleConnectGmail} disabled={status.isLoading}>
              Connect Gmail
            </Button>
          )}
        </CardHeader>
        <CardContent className="divide-y divide-border">
          <PermissionRow label="Read emails" level="allowed" />
          <PermissionRow label="Search emails" level="allowed" />
          <PermissionRow label="Send emails" level="approval" />
          <PermissionRow label="Delete emails" level="disabled" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Calendar</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          <PermissionRow label="Read events" level="allowed" />
          <PermissionRow label="Create events" level="approval" />
          <PermissionRow label="Delete events" level="approval" />
        </CardContent>
      </Card>
    </div>
  );
}

function ApiSection() {
  const { toast } = useToast();
  const maskedKey = "nx_live_••••••••••••••••4f2a";

  return (
    <Card>
      <CardHeader>
        <CardTitle>API</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>API key</Label>
          <div className="flex gap-2">
            <Input readOnly value={maskedKey} className="font-mono text-xs" />
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                navigator.clipboard.writeText(maskedKey);
                toast({ title: "Copied to clipboard" });
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => toast({ title: "New API key generated" })}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Key className="h-4 w-4" />
          Use this key to authenticate requests to the NEXUS AI API.
        </div>
      </CardContent>
    </Card>
  );
}

function BillingSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border border-border p-4">
          <div>
            <p className="text-sm font-medium">Pro plan</p>
            <p className="text-xs text-muted-foreground">$29/month · Renews Sep 22, 2026</p>
          </div>
          <Badge variant="success">Active</Badge>
        </div>
        <Button variant="outline" size="sm">
          <CreditCard className="h-3.5 w-3.5" />
          Manage billing
        </Button>
      </CardContent>
    </Card>
  );
}

function Field({ label, defaultValue }: { label: string; defaultValue: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input defaultValue={defaultValue} className="max-w-sm" />
    </div>
  );
}

function SwitchRow({ label, description, defaultChecked }: { label: string; description: string; defaultChecked?: boolean }) {
  const [checked, setChecked] = React.useState(!!defaultChecked);
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={setChecked} />
    </div>
  );
}

function SessionRow({ device, location, current }: { device: string; location: string; current?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
      <div>
        <p className="font-medium">{device}</p>
        <p className="text-xs text-muted-foreground">{location}</p>
      </div>
      {current && <Badge variant="secondary">This device</Badge>}
    </div>
  );
}
