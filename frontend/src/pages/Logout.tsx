import * as React from "react";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export default function Logout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    logout();
    navigate("/login", { replace: true });
  }, [logout, navigate]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <p className="text-sm">Signing out...</p>
      </div>
    </div>
  );
}
