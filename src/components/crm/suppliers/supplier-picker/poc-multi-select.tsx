"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipButton } from "@/components/ui/tooltip-button";
import { Star, Mail, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ISupplierTeamMemberData } from "@/types/suppliers";

interface PocMultiSelectProps {
  teamMembers: ISupplierTeamMemberData[];
  value: string[];
  primaryId?: string;
  onChange: (ids: string[]) => void;
  onPrimaryChange: (id: string | undefined) => void;
  isLoading?: boolean;
}

export default function PocMultiSelect({
  teamMembers,
  value,
  primaryId,
  onChange,
  onPrimaryChange,
  isLoading,
}: PocMultiSelectProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (teamMembers.length === 0) {
    return <p className="text-sm text-muted-foreground">No contacts found for this supplier.</p>;
  }

  const toggleMember = (id: string, checked: boolean) => {
    if (checked) {
      const next = [...value, id];
      onChange(next);
      if (!primaryId) onPrimaryChange(id);
    } else {
      const next = value.filter((v) => v !== id);
      onChange(next);
      if (primaryId === id) onPrimaryChange(next[0]);
    }
  };

  const togglePrimary = (id: string) => {
    onPrimaryChange(primaryId === id ? undefined : id);
  };

  return (
    <div className="flex flex-wrap gap-4 items-stretch">
      {teamMembers.map((member) => {
        const selected = value.includes(member.id!);
        const isPrimary = primaryId === member.id;

        return (
          <div
            key={member.id}
            className={cn(
              "flex items-center gap-3 p-3 rounded-md border w-fit min-h-[72px]",
              selected ? "border-primary/40 bg-primary/5" : "border-border bg-card"
            )}
          >
            <Checkbox checked={selected} onCheckedChange={(checked) => toggleMember(member.id!, !!checked)} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium capitalize truncate">{member.name}</p>
              <div className="flex flex-col gap-0.5 mt-0.5">
                {member.email && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3 shrink-0" />
                    <span className="truncate">{member.email}</span>
                  </span>
                )}
                {member.phone && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3 shrink-0" />
                    <span className="truncate">{member.phone}</span>
                  </span>
                )}
              </div>
              {member.department && member.department.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {member.department.map((d) => (
                    <Badge key={d} variant="secondary" className="text-[10px] px-1.5 py-0">
                      {d}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            {selected && (
              <TooltipButton
                type="button"
                variant="ghost"
                size="icon"
                className={cn("h-7 w-7 shrink-0", isPrimary && "text-amber-500")}
                onClick={() => togglePrimary(member.id!)}
                tooltip={isPrimary ? "Remove as primary" : "Set as primary"}
              >
                <Star className={cn("h-4 w-4", isPrimary && "fill-amber-500")} />
              </TooltipButton>
            )}
          </div>
        );
      })}
    </div>
  );
}
