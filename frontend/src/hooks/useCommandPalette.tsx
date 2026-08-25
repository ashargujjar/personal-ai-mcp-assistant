import * as React from "react";

interface CommandPaletteContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const CommandPaletteContext = React.createContext<CommandPaletteContextValue | undefined>(undefined);

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return <CommandPaletteContext.Provider value={{ open, setOpen }}>{children}</CommandPaletteContext.Provider>;
}

export function useCommandPalette() {
  const ctx = React.useContext(CommandPaletteContext);
  if (!ctx) throw new Error("useCommandPalette must be used within a CommandPaletteProvider");
  return ctx;
}
