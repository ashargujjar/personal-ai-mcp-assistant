import { QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { CommandPaletteProvider } from "@/hooks/useCommandPalette";
import { ThemeProvider } from "@/hooks/useTheme";
import { queryClient } from "@/lib/queryClient";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider delayDuration={200}>
            <BrowserRouter>
              <CommandPaletteProvider>
                <App />
                <Toaster />
              </CommandPaletteProvider>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
