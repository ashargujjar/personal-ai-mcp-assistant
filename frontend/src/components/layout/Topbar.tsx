import { Menu, Moon, Search, Sun } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { navGroups } from "./navConfig";
import { Button } from "@/components/ui/button";
import { useCommandPalette } from "@/hooks/useCommandPalette";
import { useTheme } from "@/hooks/useTheme";

const allItems = navGroups.flatMap((g) => g.items);

function useCurrentPageLabel() {
  const location = useLocation();
  if (location.pathname === "/") return "Assistant";
  const match = allItems.find((item) => item.path !== "/" && location.pathname.startsWith(item.path));
  return match?.label ?? "NEXUS AI";
}

export function Topbar({ onOpenMobileNav }: { onOpenMobileNav: () => void }) {
  const { theme, toggleTheme } = useTheme();
  const { setOpen } = useCommandPalette();
  const label = useCurrentPageLabel();

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-4">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onOpenMobileNav}>
        <Menu className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-2 text-sm">
        <Link to="/" className="font-medium text-foreground/60 hover:text-foreground">
          NEXUS AI
        </Link>
        <span className="text-foreground/30">/</span>
        <span className="font-medium">{label}</span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="hidden gap-2 text-muted-foreground sm:flex"
          onClick={() => setOpen(true)}
        >
          <Search className="h-3.5 w-3.5" />
          Search
          <kbd className="rounded border border-border bg-secondary px-1.5 py-0.5 text-[10px] font-medium">⌘K</kbd>
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setOpen(true)} className="sm:hidden">
          <Search className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
    </header>
  );
}
