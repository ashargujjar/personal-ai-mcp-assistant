import {
  Activity,
  Calendar,
  CheckSquare,
  Github,
  Layers,
  Lock,
  Mic,
  NotebookText,
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
      { label: "Assistant", path: "/", icon: Sparkles },
      { label: "Voice", path: "/voice", icon: Mic },
    ],
  },
  {
    label: "Knowledge",
    items: [
      { label: "Knowledge Base", path: "/knowledge", icon: Layers },
      { label: "Notes", path: "/notes", icon: NotebookText },
    ],
  },
  {
    label: "Productivity",
    items: [
      { label: "Tasks", path: "/tasks", icon: CheckSquare, badgeKey: "pendingTasks" },
      { label: "Calendar", path: "/calendar", icon: Calendar },
      { label: "Meetings", path: "/meetings", icon: Users },
      { label: "Resume Screening", path: "/resume-screening", icon: UserSearch },
    ],
  },
  {
    label: "Connections",
    items: [{ label: "GitHub", path: "/github", icon: Github, badgeKey: "openPRs" }],
  },
  {
    label: "Automation",
    items: [
      { label: "Webhooks", path: "/webhooks", icon: Webhook },
      { label: "Tool Activity", path: "/tool-activity", icon: Activity },
      { label: "Tool Permissions", path: "/tool-permissions", icon: Lock },
    ],
  },
];
