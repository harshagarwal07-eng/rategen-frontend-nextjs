"use client";

import { User2, Pencil, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import QueryInfoSection from "./query-info-section";
import TravelDetailsSection from "./travel-details-section";
import AgencyDetailsSection from "./agency-details-section";
import FileUploadsSection from "./file-uploads-section";
import AccountsSection from "./accounts-section";
import { IQueryDetails } from "@/types/crm-query";
import { cn } from "@/lib/utils";

type Props = {
  query: IQueryDetails;
  onEdit?: () => void;
  onDelete?: () => void;
  inSidebar?: boolean;
  totalTokens?: number;
  onViewTokenHistory?: () => void;
};

export default function QueryDetailsPanel({
  query,
  onEdit,
  onDelete,
  inSidebar = false,
  totalTokens,
  onViewTokenHistory,
}: Props) {
  const location = query.travel_country_names?.join(", ") || "-";

  return (
    <div className={cn("h-full flex flex-col", !inSidebar && "w-70 shrink-0 p-2")}>
      <div className={cn("flex flex-col h-full", !inSidebar && "rounded-xl border border-border shadow")}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 shrink-0 border-b">
          <p className="font-semibold text-sm">Query Details</p>
        </div>

        {/* Scrollable Content */}
        <ScrollArea className="flex-1">
          <div className="space-y-3 divide-y px-4 py-3">
            {/* User Info */}
            <div className="flex gap-3 items-center pb-3">
              <Avatar className="size-10">
                <AvatarFallback className="bg-primary/10 text-primary">
                  <User2 className="size-5" />
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold capitalize leading-tight">{query.ta_name ?? "Unknown"}</p>
                <p className="text-xs text-muted-foreground leading-tight mt-0.5">{location}</p>
              </div>
            </div>

            {/* Query Info */}
            <QueryInfoSection query={query} totalTokens={totalTokens} onViewTokenHistory={onViewTokenHistory} />

            {/* Travel Details */}
            <TravelDetailsSection query={query} />

            {/* Agency Details */}
            <AgencyDetailsSection query={query} />

            {/* Accounts */}
            <AccountsSection queryId={query.id} />

            {/* File Uploads */}
            <FileUploadsSection queryId={query.id} />

            {/* Action Buttons */}
            <div className="space-y-2 pt-3">
              <Button
                size="sm"
                variant="secondary"
                className={cn(
                  "font-medium py-1.5 px-4 gap-2 shadow bg-primary/10 text-primary hover:opacity-80 w-full"
                )}
                onClick={onEdit}
              >
                <Pencil className="w-3.5 h-3.5 mr-2" />
                Edit Query
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="font-medium py-1.5 px-4 gap-2 shadow bg-destructive/10 text-destructive hover:opacity-80 w-full"
                onClick={onDelete}
              >
                <Trash2 className="w-3.5 h-3.5 mr-2" />
                Delete Query
              </Button>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
