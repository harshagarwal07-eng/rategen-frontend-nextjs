"use client";

import { Clock, IdCard, CalendarDays, Star, FolderKanban, Pencil } from "lucide-react";
import { CopyButton } from "@/components/ui/copy-button";
import { ICrmTaDetails, OrgCatagory, OrgStatus } from "@/types/crm-agency";
import { format } from "date-fns";
import { DetailDataList, DetailDataListItem } from "@/components/crm/shared/detail-data-list";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { AGENCY_CATEGORIES } from "@/constants/data";
import { updateAgencyCategory, updateAgencySource, updateAgencyStatus } from "@/data-access/crm-agency";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AGENT_STATUS_CONFIGS, getAgentStatusConfig } from "@/lib/status-styles-config";
import SourceSelector from "@/components/common/source-selector";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";

type Props = {
  agent: ICrmTaDetails;
  onAgentUpdate?: (updatedFields: Partial<ICrmTaDetails>) => void;
};

export default function AgentInfoSection({ agent, onAgentUpdate }: Props) {
  const [isEditingSource, setIsEditingSource] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      return format(new Date(dateStr), "MMMM dd, yyyy, h:mmaaa");
    } catch {
      return "-";
    }
  };

  const handleCategoryUpdate = async (newCategory: string) => {
    setIsUpdating(true);
    try {
      const { data, error } = await updateAgencyCategory(agent.ta_id, newCategory as OrgCatagory);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success("Category updated successfully");
      onAgentUpdate?.({ category: newCategory as OrgCatagory, updated_at: data?.updated_at });
    } catch {
      toast.error("Failed to update category");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStatusUpdate = async (newStatus: OrgStatus) => {
    setIsUpdating(true);
    try {
      const { data, error } = await updateAgencyStatus(agent.ta_id, newStatus);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success("Status updated successfully");
      onAgentUpdate?.({ status: newStatus, updated_at: data?.updated_at });
    } catch {
      toast.error("Failed to update status");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSourceUpdate = async (sourceId: string) => {
    setIsUpdating(true);
    try {
      const { data, error } = await updateAgencySource(agent.ta_id, sourceId);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success("Source updated successfully");
      setIsEditingSource(false);
      onAgentUpdate?.({ source: sourceId, updated_at: data?.updated_at });
    } catch {
      toast.error("Failed to update source");
    } finally {
      setIsUpdating(false);
    }
  };

  const statusConfig = getAgentStatusConfig(agent.status);

  const items: DetailDataListItem[] = [
    {
      id: "added_on",
      label: "Added On",
      value: <div className="w-full text-left">{formatDateTime(agent.created_at)}</div>,
      icon: CalendarDays,
    },
    {
      id: "agent_id",
      label: "Agent ID",
      value: (
        <div className="flex items-center gap-1.5 w-full">
          <span className="font-mono truncate w-3/5">{agent.ta_id}</span>
          <CopyButton content={agent.ta_id} copyMessage="Agent ID copied" />
        </div>
      ),
      icon: IdCard,
    },
    {
      id: "status",
      label: "Status",
      icon: Clock,
      value: (
        <Select
          value={agent.status || "pending"}
          onValueChange={(value) => handleStatusUpdate(value as OrgStatus)}
          disabled={isUpdating}
        >
          <SelectTrigger
            size="xs"
            className={cn(
              "!w-fit !h-auto !px-0 !py-0.5 !border-transparent !shadow-none !text-xs !font-medium !rounded-md gap-1 !bg-transparent [&_svg:not([class*='text-'])]:!text-current [&_svg:not([class*='size-'])]:!size-2.5 cursor-pointer hover:opacity-80",
              statusConfig.color
            )}
          >
            {statusConfig.label}
          </SelectTrigger>
          <SelectContent>
            {AGENT_STATUS_CONFIGS.map((config) => (
              <SelectItem key={config.value} value={config.value} className="text-xs">
                <div className={cn("flex items-center gap-1.5", config.color)}>
                  <config.icon className={cn("size-3", config.color)} />
                  {config.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
    {
      id: "category",
      label: "Category",
      value: (
        <Select
          value={agent.category || ""}
          onValueChange={(value) => handleCategoryUpdate(value)}
          disabled={isUpdating}
        >
          <SelectTrigger
            size="xs"
            className="!w-fit !h-auto !px-0 !py-0.5 !border-transparent !shadow-none !text-xs !font-medium !rounded-md gap-1 !bg-transparent cursor-pointer hover:opacity-80"
          >
            {AGENCY_CATEGORIES.find((cat) => cat.value === agent.category)?.label || "Unrated"}
          </SelectTrigger>
          <SelectContent>
            {AGENCY_CATEGORIES.map((category) => (
              <SelectItem key={category.value} value={category.value} className="text-xs">
                {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
      icon: Star,
    },
    {
      id: "source",
      label: "Source",
      icon: FolderKanban,
      value: (
        <div className="flex items-center gap-1.5 w-full">
          <span>{agent.source_name || "-"}</span>
          <Popover open={isEditingSource} onOpenChange={setIsEditingSource}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="text-primary">
                <Pencil />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="end">
              <div className="space-y-2">
                <p className="text-xs font-semibold px-1">Select Source</p>
                <SourceSelector dmcId={agent.dmc_id} value={agent.source} onChange={handleSourceUpdate} />
              </div>
            </PopoverContent>
          </Popover>
        </div>
      ),
    },
  ];

  return <DetailDataList items={items} />;
}
