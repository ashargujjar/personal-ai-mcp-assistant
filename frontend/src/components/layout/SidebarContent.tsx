import { LogOut, MessageSquarePlus, Search, Settings } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { navGroups } from "./navConfig";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StatusDot } from "@/components/shared/StatusDot";
import { useAuth } from "@/hooks/useAuth";
import { useCommandPalette } from "@/hooks/useCommandPalette";
import { useSidebarBadges } from "@/hooks/useSidebarBadges";
import { cn, initials } from "@/lib/utils";

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth();
  const { setOpen } = useCommandPalette();
  const badges = useSidebarBadges();
  const navigate = useNavigate();

  function badgeValue(key?: keyof typeof badges) {
    if (!key) return undefined;
    const value = badges[key];
    return value > 0 ? value : undefined;
  }

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 px-4 pt-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <span className="text-xs font-bold">N</span>
        </div>
        <span className="text-sm font-semibold tracking-tight">NEXUS AI</span>
      </div>

      <div className="flex flex-col gap-2 px-3 pt-4">
        <Button
          className="w-full justify-start gap-2"
          size="sm"
          onClick={() => {
            navigate("/assistant?new=1");
            onNavigate?.();
          }}
        >
          <MessageSquarePlus className="h-4 w-4" />
          New Chat
        </Button>
        <Button
          variant="outline"
          className="w-full justify-between text-sidebar-foreground/70"
          size="sm"
          onClick={() => setOpen(true)}
        >
          <span className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Search
          </span>
          <kbd className="rounded border border-sidebar-border bg-sidebar-accent px-1.5 py-0.5 text-[10px] font-medium">⌘K</kbd>
        </Button>
      </div>

      <nav className="mt-2 flex-1 overflow-y-auto scrollbar-thin px-3 pb-3">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-4">
            <p className="mb-1 px-2 text-[11px] font-medium uppercase tracking-wider text-sidebar-foreground/40">
              {group.label}
            </p>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const badge = badgeValue(item.badgeKey);
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === "/"}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-foreground font-medium"
                          : "text-sidebar-foreground/65 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                      )
                    }
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {badge !== undefined && (
                      <Badge variant="secondary" className="h-5 min-w-5 justify-center px-1 text-[10px]">
                        {badge}
                      </Badge>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <Separator className="bg-sidebar-border" />

      <div className="flex items-center gap-2.5 p-3">
        <div className="relative">
          <Avatar className="h-8 w-8">
            <AvatarFallback>{initials(user?.name ?? "?")}</AvatarFallback>
          </Avatar>
          <StatusDot status="connected" className="absolute -bottom-0.5 -right-0.5 ring-2 ring-sidebar" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{user?.name ?? "Guest"}</p>
          <p className="truncate text-xs text-sidebar-foreground/50">{user?.email ?? ""}</p>
        </div>
        <NavLink
          to="/settings"
          onClick={onNavigate}
          className="rounded-md p-1.5 text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <Settings className="h-4 w-4" />
        </NavLink>
        <NavLink
          to="/logout"
          onClick={onNavigate}
          className="rounded-md p-1.5 text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          aria-label="Log out"
        >
          <LogOut className="h-4 w-4" />
        </NavLink>
      </div>
    </div>
  );
}
