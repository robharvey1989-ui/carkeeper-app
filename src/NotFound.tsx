import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="text-center">
        <div className="text-7xl font-black tracking-tight">404</div>
        <p className="mt-2 text-muted-foreground">We couldn’t find that page.</p>
        <Button asChild className="mt-4"><Link to="/">Back to Garage</Link></Button>
      </div>
    </div>
  );
}
