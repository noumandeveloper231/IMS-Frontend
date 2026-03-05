import { Link } from "react-router-dom";
import { Button } from "@/components/UI/button";
import assets from "@/assets/assets";

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center px-4 py-12">
      <div className="max-w-xl w-full text-center space-y-6">
        <div className="flex justify-center">
          <img
            src={assets.notFound}
            alt="Page not found"
            className="max-h-72 w-auto object-contain"
          />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Page not found
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            The page you&apos;re looking for doesn&apos;t exist or has been
            moved. Check the URL or return back to your dashboard.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <Button asChild>
            <Link to="/">Go to dashboard</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to={-1}>Go back</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

