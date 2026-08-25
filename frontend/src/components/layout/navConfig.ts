import {
  Activity,
  BrainCircuit,
  Calendar,
  CheckSquare,
  Database,
  Github,
  Layers,
  LayoutDashboard,
  Mail,
  Mic,
  NotebookText,
  ShieldCheck,
  Sparkles,
  UserSearch,
  Users,
  Webhook,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  badgeKey?: "unreadEmails" | "openPRs" | "pendingTasks" | "pendingApprovals";
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { label: "Dashboard", path: "/", icon: LayoutDashboard },
      { label: "Assistant", path: "/assistant", icon: Sparkles },
      { label: "Voice", path: "/voice", icon: Mic },
    ],
  },
  {
    label: "Knowledge",
    items: [
      { label: "Memory", path: "/memory", icon: BrainCircuit },
      { label: "Knowledge Base", path: "/knowledge", icon: Layers },
      { label: "Notes", path: "/notes", icon: NotebookText },
    ],
  },
  {
    label: "Productivity",
    items: [
      { label: "Tasks", path: "/tasks", icon: CheckSquare, badgeKey: "pendingTasks" },
      { label: "Calendar", path: "/calendar", icon: Calendar },
      { label: "Email", path: "/email", icon: Mail, badgeKey: "unreadEmails" },
      { label: "Meetings", path: "/meetings", icon: Users },
      { label: "Resume Screening", path: "/resume-screening", icon: UserSearch },
    ],
  },
  {
    label: "Connections",
    items: [
      { label: "GitHub", path: "/github", icon: Github, badgeKey: "openPRs" },
      { label: "Database", path: "/database", icon: Database },
    ],
  },
  {
    label: "Automation",
    items: [
      { label: "Webhooks", path: "/webhooks", icon: Webhook },
      { label: "Approvals", path: "/approvals", icon: ShieldCheck, badgeKey: "pendingApprovals" },
      { label: "Tool Activity", path: "/tool-activity", icon: Activity },
    ],
  },
];
