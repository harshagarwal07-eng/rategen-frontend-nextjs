"use client";

import { useState } from "react";
import { ChevronDown, Pencil, Trash2, User, CircleCheck, CircleMinus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ITaskLibrary, TaskCategory, TaskServiceCategory } from "@/types/tasks";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { TASK_CATEGORY_OPTIONS } from "@/constants/data";
import type { IOption } from "@/types/common";
import { getTaskServiceMap, getServiceOptionsForCategory } from "@/data-access/tasks";

const getCategoryLabel = (key: TaskCategory | "uncategorized") =>
  TASK_CATEGORY_OPTIONS.find((o) => o.value === key)?.label ?? "Uncategorized";

const SERVICE_SINGULAR: Record<TaskServiceCategory, string> = {
  hotel: "hotel",
  tour: "tour",
  transfer: "transfer",
};

function ScopeDetailPopover({ task, onEdit }: { task: ITaskLibrary; onEdit: (task: ITaskLibrary) => void }) {
  const [open, setOpen] = useState(false);
  const [serviceNames, setServiceNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  if (task.scope_mode === "all") return null;

  const count = task.service_map_count;
  const category = task.service_category;
  const isInclusive = task.scope_mode === "inclusive";
  const serviceLabel = category ? SERVICE_SINGULAR[category] : "service";
  const badgeLabel = `${count} ${serviceLabel}${count !== 1 ? "s" : ""} ${isInclusive ? "included" : "excluded"}`;
  const popoverTitle = isInclusive
    ? `Applies only to the following ${serviceLabel}s`
    : `Applies to all ${serviceLabel}s except the following`;

  const handleOpenChange = async (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && serviceNames.length === 0 && category) {
      setLoading(true);
      const [mapEntries, allServices] = await Promise.all([
        getTaskServiceMap(task.id),
        getServiceOptionsForCategory(category),
      ]);
      const ids = new Set(mapEntries.map((e) => e.service_parent_id));
      setServiceNames(allServices.filter((s) => ids.has(s.id)).map((s) => s.name));
      setLoading(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] px-1.5 py-0 h-5 shrink-0 font-normal tabular-nums cursor-pointer transition-colors",
            isInclusive
              ? "border-primary/40 text-primary hover:bg-primary/10"
              : "border-destructive/40 text-destructive hover:bg-destructive/10"
          )}
        >
          {badgeLabel}
        </Badge>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-muted-foreground">{popoverTitle}</p>
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-5 w-5 text-muted-foreground hover:text-foreground shrink-0"
            onClick={() => {
              setOpen(false);
              onEdit(task);
            }}
          >
            <Pencil className="size-3" />
          </Button>
        </div>
        {loading ? (
          <p className="text-xs text-muted-foreground">Loading...</p>
        ) : serviceNames.length > 0 ? (
          <div className="flex flex-col gap-0.5">
            {serviceNames.map((name) => (
              <div key={name} className="text-xs px-1 py-0.5 rounded hover:bg-muted">
                {name}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No {serviceLabel}s found</p>
        )}
      </PopoverContent>
    </Popover>
  );
}

function formatOffset(task: ITaskLibrary): string {
  const ref = task.offset_reference.replace(/_/g, " ");
  return `${task.offset_value} ${task.offset_unit}(s) ${task.offset_direction} ${ref}`;
}

interface LibraryTaskCardProps {
  task: ITaskLibrary;
  memberOptions: IOption[];
  onEdit: (task: ITaskLibrary) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
}

export function LibraryTaskCard({ task, memberOptions, onEdit, onDelete, onToggleActive }: LibraryTaskCardProps) {
  const assignees = (task.default_assignees ?? [])
    .map((id) => memberOptions.find((o) => o.value === id))
    .filter(Boolean) as IOption[];

  const first = assignees[0];
  const rest = assignees.length - 1;

  return (
    <div className="rounded-lg shadow border border-border/60 bg-card p-3 divide-y divide-dashed space-y-1.5">
      {/* Row 1: name | description (with hover card) | edit | delete */}
      <div className="flex items-center gap-2 min-w-0 overflow-hidden pb-2">
        <p className="text-sm font-medium leading-tight shrink-0">{task.name}</p>
        {task.description && (
          <>
            <span className="text-border shrink-0">|</span>
            <HoverCard openDelay={300}>
              <HoverCardTrigger asChild>
                <p className="text-xs max-w-sm text-muted-foreground truncate cursor-default">{task.description}</p>
              </HoverCardTrigger>
              <HoverCardContent className="w-72 text-xs text-muted-foreground p-3" align="start">
                {task.description}
              </HoverCardContent>
            </HoverCard>
          </>
        )}
        <div className="flex-1" />
        <Button variant="ghost" size="icon-sm" className="shrink-0 text-primary" onClick={() => onEdit(task)}>
          <Pencil className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="shrink-0 text-destructive hover:text-destructive"
          onClick={() => onDelete(task.id)}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      {/* Row 2: status (left) | assignees | spacer | timing (right) */}
      <div className="flex items-center gap-3 pt-1.5">
        {/* Status toggle — leftmost, same position as ops task section */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-auto py-1 px-2 text-xs font-medium gap-1.5 shrink-0",
                task.is_active
                  ? "text-emerald-600 dark:text-emerald-400 hover:text-emerald-600"
                  : "text-muted-foreground hover:text-muted-foreground"
              )}
            >
              {task.is_active ? (
                <CircleCheck className="size-3.5 shrink-0" />
              ) : (
                <CircleMinus className="size-3.5 shrink-0" />
              )}
              {task.is_active ? "Active" : "Inactive"}
              <ChevronDown className="size-3.5 shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem className="text-xs gap-2" onClick={() => onToggleActive(task.id, true)}>
              <CircleCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
              Active
            </DropdownMenuItem>
            <DropdownMenuItem className="text-xs gap-2" onClick={() => onToggleActive(task.id, false)}>
              <CircleMinus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              Inactive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Assignees */}
        {first ? (
          <Popover>
            <PopoverTrigger asChild>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
                <User className="size-3 shrink-0" />
                <span>{first.label}</span>
                {rest > 0 && (
                  <span className="text-muted-foreground/60 underline decoration-dotted cursor-pointer">
                    +{rest} more
                  </span>
                )}
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="start">
              <div className="flex items-center justify-between mb-1.5 px-1">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  Default Assignees
                </p>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="h-5 w-5 text-muted-foreground hover:text-foreground"
                  onClick={() => onEdit(task)}
                >
                  <Pencil className="size-3" />
                </Button>
              </div>
              <div className="flex flex-col gap-0.5">
                {assignees.map((a) => (
                  <div key={a.value} className="flex items-center gap-1.5 px-1 py-1 rounded text-xs">
                    <User className="size-3 shrink-0 text-muted-foreground" />
                    <span>{a.label}</span>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        ) : (
          <span className="text-[11px] text-muted-foreground/40">No assignees</span>
        )}

        {/* Scope badge — after assignees */}
        <ScopeDetailPopover task={task} onEdit={onEdit} />

        <div className="flex-1" />

        {/* Timing string — rightmost */}
        <span className="text-[11px] text-muted-foreground shrink-0">{formatOffset(task)}</span>
        <span className="text-border shrink-0">|</span>
        <span className="text-[11px] text-muted-foreground/60 shrink-0">
          Created {new Date(task.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
        </span>
      </div>
    </div>
  );
}

export const LIBRARY_TASK_CATEGORY_ORDER: (TaskCategory | "uncategorized")[] = [
  "package",
  "hotel",
  "tour",
  "transfer",
  "meal",
  "guide",
  "finance",
  "on_trip",
  "uncategorized",
];

interface LibraryTasksGroupAccordionProps {
  groupKey: TaskCategory | "uncategorized";
  tasks: ITaskLibrary[];
  memberOptions: IOption[];
  onEdit: (task: ITaskLibrary) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
  defaultOpen?: boolean;
}

export function LibraryTasksGroupAccordion({
  groupKey,
  tasks,
  memberOptions,
  onEdit,
  onDelete,
  onToggleActive,
  defaultOpen = true,
}: LibraryTasksGroupAccordionProps) {
  const activeCount = tasks.filter((t) => t.is_active).length;
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg overflow-hidden shadow-sm">
      <div className="flex items-center gap-2 px-4 py-3 text-sm bg-primary/10">
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex items-center gap-3 min-w-0 text-left text-primary hover:opacity-90 transition-opacity"
        >
          <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform duration-150", !isOpen && "-rotate-90")} />
          <span className="font-semibold truncate">{getCategoryLabel(groupKey)}</span>
        </button>

        <div className="flex-1" />

        <span className="font-medium shrink-0 text-sm text-foreground/70">
          {activeCount}/{tasks.length} active
        </span>
      </div>

      {isOpen && (
        <div className="flex flex-col gap-2 p-3">
          {tasks.map((task) => (
            <LibraryTaskCard
              key={task.id}
              task={task}
              memberOptions={memberOptions}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleActive={onToggleActive}
            />
          ))}
        </div>
      )}
    </div>
  );
}
