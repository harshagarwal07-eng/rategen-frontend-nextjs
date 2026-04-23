"use client";

import { MessageSquare } from "lucide-react";

export default function AgentEmptyState() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="rounded-full bg-muted p-6">
          <MessageSquare className="h-12 w-12 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">No Agent Selected</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Select an agent from the sidebar to view their conversation history
            and details.
          </p>
        </div>
      </div>
    </div>
  );
}
