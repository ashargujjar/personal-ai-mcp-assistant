import * as React from "react";
import { Outlet } from "react-router-dom";
import { SidebarContent } from "./SidebarContent";
import { Topbar } from "./Topbar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { CommandPalette } from "@/components/shared/CommandPalette";

export function AppShell() {
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
      <aside className="hidden w-60 shrink-0 border-r border-sidebar-border lg:block">
        <SidebarContent />
      </aside>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-64">
          <SidebarContent onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenMobileNav={() => setMobileNavOpen(true)} />
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <Outlet />
        </main>
      </div>

      <CommandPalette />
    </div>
  );
}
