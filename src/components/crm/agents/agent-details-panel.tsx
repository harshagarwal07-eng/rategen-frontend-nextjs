"use client";

import { User2, Phone, Mail } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ICrmTaDetails, OrgStatus } from "@/types/crm-agency";
import AgentInfoSection from "./agent-info-section";
import KYCDetailsSection from "./kyc-details-section";
import TeamDetailsSection from "./team-details-section";
import StatisticsSection from "./statistics-section";
import BookingsSection from "./bookings-section";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getAgentStatusConfig } from "@/lib/status-styles-config";
import { updateAgencyStatus } from "@/data-access/crm-agency";
import { toast } from "sonner";
import { useState } from "react";

type Props = {
  agent: ICrmTaDetails;
  inSidebar?: boolean;
  onAgentUpdate?: (updatedFields: Partial<ICrmTaDetails>) => void;
};

export default function AgentDetailsPanel({ agent, inSidebar = false, onAgentUpdate }: Props) {
  const [isUpdating, setIsUpdating] = useState(false);

  // Format location string
  const location = agent.city_name ? `${agent.city_name}, ${agent.country_name}` : agent.country_name;

  const isActive = agent.status === "active";
  const blockedConfig = getAgentStatusConfig("blocked");
  const activeConfig = getAgentStatusConfig("active");

  const handleStatusUpdate = async (status: OrgStatus) => {
    setIsUpdating(true);
    try {
      const { data, error } = await updateAgencyStatus(agent.ta_id, status);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success(status === "blocked" ? "Agent blocked" : "Agent activated");
      onAgentUpdate?.({ status, updated_at: data?.updated_at });
    } catch {
      toast.error("Failed to update status");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className={cn("h-full flex flex-col", !inSidebar && "w-70 shrink-0 p-2")}>
      <div className={cn("flex flex-col h-full", !inSidebar && "rounded-xl border border-border shadow")}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 shrink-0 border-b">
          <p className="font-semibold text-sm">Agent Details</p>
        </div>

        {/* Scrollable Content */}
        <ScrollArea className="flex-1">
          <div className="space-y-3 divide-y px-4 py-3">
            {/* Agency Info */}
            <div className="flex gap-3 items-center pb-3">
              <Avatar className="size-10">
                <AvatarFallback className="bg-primary/10 text-primary">
                  <User2 className="size-5" />
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold capitalize leading-tight">{agent.name ?? "Unknown"}</p>
                <p className="text-xs text-muted-foreground leading-tight mt-0.5">{location}</p>
                {agent.website && (
                  <Link
                    href={`https://${agent.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-info hover:underline leading-tight block mt-0.5"
                  >
                    {agent.website}
                  </Link>
                )}
              </div>
            </div>

            {/* Admin Details */}
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <p className="text-sm font-semibold leading-tight">{agent.ta_admin_name}</p>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-medium">
                  Admin
                </Badge>
              </div>
              <div className="flex gap-3 mt-1 pb-2.5 text-xs text-muted-foreground divide-x">
                {agent.ta_admin_phone && (
                  <div className="flex items-center gap-1.5 pr-2">
                    <Phone className="size-3 shrink-0" />
                    <span>+{agent.ta_admin_phone.replace(/(\d{2})(\d{5})(\d+)/, "$1 $2 $3")}</span>
                  </div>
                )}
                {agent.ta_admin_email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="size-3 shrink-0" />
                    <a href={`mailto:${agent.ta_admin_email}`} className="text-info hover:underline truncate">
                      {agent.ta_admin_email}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Agent Info */}
            <AgentInfoSection agent={agent} onAgentUpdate={onAgentUpdate} />

            {/* KYC Details */}
            <KYCDetailsSection agent={agent} />

            {/* Team Details */}
            <TeamDetailsSection agent={agent} />

            {/* Statistics */}
            <StatisticsSection agent={agent} />

            {/* Bookings */}
            <BookingsSection agent={agent} />

            {/* Action Buttons */}
            <div className="space-y-2 pt-3">
              {isActive ? (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={isUpdating}
                  className={cn(
                    "font-medium py-1.5 px-4 gap-2 shadow hover:opacity-80 w-full",
                    blockedConfig.bgColor,
                    blockedConfig.color
                  )}
                  onClick={() => handleStatusUpdate("blocked")}
                >
                  <blockedConfig.icon className="w-3.5 h-3.5" />
                  Block Agent
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={isUpdating}
                  className={cn(
                    "font-medium py-1.5 px-4 gap-2 shadow hover:opacity-80 w-full",
                    activeConfig.bgColor,
                    activeConfig.color
                  )}
                  onClick={() => handleStatusUpdate("active")}
                >
                  <activeConfig.icon className="w-3.5 h-3.5" />
                  Activate Agent
                </Button>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
