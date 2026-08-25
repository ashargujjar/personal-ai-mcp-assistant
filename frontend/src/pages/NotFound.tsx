import { Compass } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";

export default function NotFound() {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <EmptyState
        icon={Compass}
        title="Page not found"
        description="The page you're looking for doesn't exist or has moved."
        action={
          <Button asChild size="sm">
            <Link to="/">Back to Dashboard</Link>
          </Button>
        }
      />
    </div>
  );
}
