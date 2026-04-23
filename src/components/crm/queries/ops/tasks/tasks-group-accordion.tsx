"use client";

import { useState, useMemo } from "react";
import {
  ChevronDown,
  Pencil,
  Trash2,
  User,
  Paperclip,
  MessageCircleMore,
  Filter,
  Check,
  X,
} from "lucide-react";
import { format, isPast } from "date-fns";
import { cn } from "@/lib/utils";
import type { ITaskDetails, QueryTaskStatus, TaskCategory } from "@/types/tasks";
import { QUERY_TASK_STATUS_CONFIGS } from "@/lib/status-styles-config";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandGroup, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TASK_CATEGORY_OPTIONS } from "@/constants/data";
import { TaskDetailSheet } from "./task-detail-sheet";

// ─── Filter Popover ────────────────────────────────────────────────────────────

interface FilterPopoverProps {
  title: string;
  options: { label: string; value: string }[];
  selected: Set<string>;
  onToggle: (value: string) => void;
  onClear: () => void;
}

function FilterPopover({ title, options, selected, onToggle, onClear }: FilterPopoverProps) {
  const hasSelection = selected.size > 0;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 border border-dashed text-xs gap-1.5 font-normal bg-transparent hover:bg-transparent transition-colors",
            hasSelection
              ? "border-primary text-primary hover:text-primary hover:border-primary"
              : "border-foreground/25 text-foreground/50 hover:text-foreground/80 hover:border-foreground/40"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <Filter className="size-3 shrink-0" />
          {title}
          {hasSelection && (
            <Badge variant="secondary" className="h-4 px-1 text-[10px] font-normal ml-0.5">
              {selected.size}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-0" align="end" onClick={(e) => e.stopPropagation()}>
        <Command>
          <CommandList>
            <CommandGroup>
              {options.map((opt) => {
                const isSelected = selected.has(opt.value);
                return (
                  <CommandItem key={opt.value} onSelect={() => onToggle(opt.value)} className="gap-2">
                    <div
                      className={cn(
                        "flex h-4 w-4 items-center justify-center rounded-sm border shrink-0",
                        isSelected ? "bg-primary border-primary text-primary-foreground" : "opacity-50"
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                    <span className="text-xs">{opt.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {hasSelection && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem onSelect={onClear} className="justify-center text-center text-xs">
                    Clear filter
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const getCategoryLabel = (key: TaskCategory | "uncategorized") =>
  TASK_CATEGORY_OPTIONS.find((o) => o.value === key)?.label ?? "Uncategorized";

export const TASK_CATEGORY_ORDER: (TaskCategory | "uncategorized")[] = [
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

const DUE_DATE_OPTIONS = [
  { label: "Overdue", value: "overdue" },
  { label: "Within Due Date", value: "upcoming" },
];

// ─── Assignees Display ─────────────────────────────────────────────────────────

interface AssigneesProps {
  assignees: ITaskDetails["assignees"];
  onEdit?: (task: ITaskDetails) => void;
  task: ITaskDetails;
}

function TaskAssignees({ assignees, onEdit, task }: AssigneesProps) {
  if (!assignees?.length) return null;
  const first = assignees[0];
  const rest = assignees.length - 1;

  const trigger = (
    <div className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
      <User className="size-3 shrink-0" />
      <span>{first.full_name}</span>
      {rest > 0 && (
        <span className="text-muted-foreground/60 underline decoration-dotted cursor-pointer">+{rest} more</span>
      )}
    </div>
  );

  if (rest <= 0) return trigger;

  return (
    <Popover>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        {trigger}
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="start" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1.5 px-1">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Assignees</p>
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-5 w-5 text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.(task);
            }}
          >
            <Pencil className="size-3" />
          </Button>
        </div>
        <div className="flex flex-col gap-0.5">
          {assignees.map((a) => (
            <div key={a.user_id} className="flex items-center gap-1.5 px-1 py-1 rounded text-xs">
              <User className="size-3 shrink-0 text-muted-foreground" />
              <span>{a.full_name}</span>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Task Card ─────────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: ITaskDetails;
  onStatusChange: (id: string, status: QueryTaskStatus) => void;
  onDelete: (id: string) => void;
  onEdit?: (task: ITaskDetails) => void;
}

export function TaskCard({ task, onStatusChange, onDelete, onEdit }: TaskCardProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const cfg = QUERY_TASK_STATUS_CONFIGS[task.status];
  const isOverdue = task.due_at ? isPast(new Date(task.due_at)) : false;
  const isActive = task.status === "pending" || task.status === "in_progress";

  return (
    <>
      <TaskDetailSheet task={task} open={sheetOpen} onOpenChange={setSheetOpen} onEdit={onEdit} onDelete={onDelete} />
      <div
        className="group rounded-lg shadow border border-border/60 bg-card p-3 divide-y divide-dashed space-y-1.5 cursor-pointer"
        onClick={() => setSheetOpen(true)}
      >
        {/* Row 1: name | description | edit | delete */}
        <div className="flex items-center gap-2 min-w-0 overflow-hidden pb-2">
          <p className="text-sm font-medium leading-tight shrink-0">{task.name}</p>
          {task.description && (
            <>
              <span className="text-border shrink-0">|</span>
              <p className="text-xs max-w-sm text-muted-foreground truncate">{task.description}</p>
            </>
          )}
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="icon-sm"
            className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-primary"
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.(task);
            }}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task.id);
            }}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>

        {/* Row 2: status | assignees | spacer | due date | messages | attachments */}
        <div className="flex items-center gap-3 pt-1.5">
          {/* Status */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn("h-auto py-1 px-2 text-xs font-medium gap-1.5 shrink-0", cfg.color)}
                onClick={(e) => e.stopPropagation()}
              >
                <cfg.icon className="size-3.5 shrink-0" />
                {cfg.label}
                <ChevronDown className="size-3.5 shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {(
                Object.entries(QUERY_TASK_STATUS_CONFIGS) as [
                  QueryTaskStatus,
                  (typeof QUERY_TASK_STATUS_CONFIGS)[QueryTaskStatus],
                ][]
              ).map(([value, config]) => (
                <DropdownMenuItem key={value} className="text-xs gap-2" onClick={() => onStatusChange(task.id, value)}>
                  <config.icon className={cn("h-3.5 w-3.5 shrink-0", config.color)} />
                  {config.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Assignees */}
          <TaskAssignees assignees={task.assignees} onEdit={onEdit} task={task} />

          <div className="flex-1" />

          {/* Due date badge */}
          {task.due_at ? (
            <Badge
              variant="outline"
              className={cn(
                "shrink-0 font-normal text-[11px] px-1.5 py-0 h-auto",
                isActive && isOverdue
                  ? "text-destructive border-destructive/50"
                  : isActive && !isOverdue
                    ? "text-amber-600 dark:text-amber-400 border-amber-500/50"
                    : "text-muted-foreground"
              )}
            >
              <span className="mr-1">{isActive && isOverdue ? "Overdue:" : "Due:"}</span>
              {format(new Date(task.due_at), "MMM d, yyyy")}
            </Badge>
          ) : (
            <span className="text-[11px] text-muted-foreground/40 shrink-0">No due date</span>
          )}

          {/* Separator */}
          <span className="w-px h-3 shrink-0 bg-border/60" />

          {/* Message + attachment counts grouped */}
          <div className="flex items-center gap-2 shrink-0">
            <div
              className={cn(
                "flex items-center gap-1 text-[11px]",
                task.has_unread ? "text-primary" : "text-muted-foreground/50"
              )}
            >
              <MessageCircleMore className="size-3 shrink-0" />
              <span>{task.comment_count ?? 0}</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground/50">
              <Paperclip className="size-3 shrink-0" />
              <span>{task.attachment_count ?? 0}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Group Accordion ───────────────────────────────────────────────────────────

interface TasksGroupAccordionProps {
  groupKey: TaskCategory | "uncategorized";
  tasks: ITaskDetails[];
  onStatusChange: (id: string, status: QueryTaskStatus) => void;
  onDelete: (id: string) => void;
  onEdit?: (task: ITaskDetails) => void;
  defaultOpen?: boolean;
}

export function TasksGroupAccordion({
  groupKey,
  tasks,
  onStatusChange,
  onDelete,
  onEdit,
  defaultOpen = true,
}: TasksGroupAccordionProps) {
  const totalActive = tasks.filter((t) => t.status !== "cancelled").length;
  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [assigneeFilter, setAssigneeFilter] = useState<Set<string>>(new Set());
  const [dueDateFilter, setDueDateFilter] = useState<Set<string>>(new Set());

  const assigneeOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const task of tasks) {
      for (const a of task.assignees ?? []) {
        if (!seen.has(a.user_id)) seen.set(a.user_id, a.full_name);
      }
    }
    return Array.from(seen.entries()).map(([value, label]) => ({ value, label }));
  }, [tasks]);

  const displayedTasks = useMemo(() => {
    const now = new Date();
    let result = tasks;
    if (assigneeFilter.size > 0) {
      result = result.filter((t) => t.assignees?.some((a) => assigneeFilter.has(a.user_id)));
    }
    if (dueDateFilter.size > 0) {
      result = result.filter((t) => {
        if (dueDateFilter.has("overdue") && t.due_at && new Date(t.due_at) < now) return true;
        if (dueDateFilter.has("upcoming") && t.due_at && new Date(t.due_at) >= now) return true;
        return false;
      });
    }
    return result;
  }, [tasks, assigneeFilter, dueDateFilter]);

  const hasActiveFilters = assigneeFilter.size > 0 || dueDateFilter.size > 0;

  const toggle = (setter: (fn: (prev: Set<string>) => Set<string>) => void, value: string) => {
    setter((prev) => {
      const next = new Set(prev);
      next.has(value) ? next.delete(value) : next.add(value);
      return next;
    });
  };

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

        {/* Filter controls */}
        <div className="flex items-center gap-1.5">
          {assigneeOptions.length > 0 && (
            <FilterPopover
              title="Assignee"
              options={assigneeOptions}
              selected={assigneeFilter}
              onToggle={(v) => toggle(setAssigneeFilter, v)}
              onClear={() => setAssigneeFilter(new Set())}
            />
          )}
          <FilterPopover
            title="Due Date"
            options={DUE_DATE_OPTIONS}
            selected={dueDateFilter}
            onToggle={(v) => toggle(setDueDateFilter, v)}
            onClear={() => setDueDateFilter(new Set())}
          />
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                setAssigneeFilter(new Set());
                setDueDateFilter(new Set());
              }}
            >
              <X className="size-3" />
            </Button>
          )}
        </div>

        <div className="w-px h-4 shrink-0 mx-1 bg-foreground/20" />
        <span className="font-medium shrink-0 text-sm text-foreground/70">
          {completedCount}/{totalActive} done
        </span>
      </div>

      {isOpen && (
        <div className="flex flex-col gap-2 p-3">
          {displayedTasks.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No tasks match the current filter.</p>
          ) : (
            displayedTasks.map((task) => (
              <TaskCard key={task.id} task={task} onStatusChange={onStatusChange} onDelete={onDelete} onEdit={onEdit} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
