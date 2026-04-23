import { MessageSquare } from "lucide-react";

export default function QueryEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <MessageSquare className="w-16 h-16 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">No Query Selected</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        Select a query from the sidebar to view messages and details
      </p>
    </div>
  );
}
