import React from "react";
import { Link } from "wouter";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex h-[calc(100vh-8rem)] w-full flex-col items-center justify-center p-8 text-center">
      <div className="mb-4 rounded-full bg-muted p-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
      </div>
      <h1 className="mb-2 font-serif text-3xl font-bold tracking-tight text-foreground">
        Page Not Found
      </h1>
      <p className="mb-8 max-w-[500px] text-muted-foreground">
        The page you are looking for doesn't exist or has been moved. Check the URL or return to the dashboard.
      </p>
      <Button asChild>
        <Link href="/">Return to Dashboard</Link>
      </Button>
    </div>
  );
}
