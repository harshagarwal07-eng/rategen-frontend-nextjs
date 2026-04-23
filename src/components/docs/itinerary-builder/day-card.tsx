"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronRight, Plus, Pencil, Check, X, Moon, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import ActivityItem from "./activity-item";
import AddActivityPopover from "@/app/(root)/playground/components/trip-details/add-activity-popover";
import { type EditableDay, type EditableActivity, convertPopoverActivityToEditable } from "./types";

interface DayCardProps {
  day: EditableDay;
  dayIndex: number;
  totalDays: number;
  itineraryNights: number;
  travelers: { adults: number; children: number };
  onUpdateDay: (updates: Partial<EditableDay>) => void;
  onToggleExpand: () => void;
  onAddActivity: (activity: EditableActivity) => void;
  onUpdateActivity: (activityIndex: number, updates: Partial<EditableActivity>) => void;
  onDeleteActivity: (activityIndex: number) => void;
  onAddRawActivity?: (popoverActivity: any) => void;
  onCopyToDays?: (toDayIndices: number[]) => void;
}

function SortableActivityWrapper({
  activity,
  activityIndex,
  dayIndex,
  onUpdate,
  onDelete,
}: {
  activity: EditableActivity;
  activityIndex: number;
  dayIndex: number;
  onUpdate: (updates: Partial<EditableActivity>) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: activity.tempId,
    data: { type: "activity", dayIndex, activity },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <ActivityItem
        activity={activity}
        activityIndex={activityIndex}
        onUpdate={onUpdate}
        onDelete={onDelete}
        dragHandleProps={listeners}
        isDragging={isDragging}
      />
    </div>
  );
}

export default function DayCard({
  day,
  dayIndex,
  totalDays,
  itineraryNights,
  travelers,
  onUpdateDay,
  onToggleExpand,
  onAddActivity,
  onUpdateActivity,
  onDeleteActivity,
  onAddRawActivity,
  onCopyToDays,
}: DayCardProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(day.title);
  const [copyTargets, setCopyTargets] = useState<number[]>([]);
  const [copyPopoverOpen, setCopyPopoverOpen] = useState(false);

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `day-${dayIndex}`,
    data: { type: "day", dayIndex },
  });

  const handleAddPopoverActivity = (popoverActivity: any) => {
    if (onAddRawActivity) {
      onAddRawActivity(popoverActivity);
    } else {
      const editableActivity = convertPopoverActivityToEditable(popoverActivity);
      onAddActivity(editableActivity);
    }
  };

  const isFirstDay = dayIndex === 0;
  const isLastDay = dayIndex === totalDays - 1;

  const handleTitleSave = () => {
    onUpdateDay({ title: editedTitle });
    setIsEditingTitle(false);
  };

  const handleTitleCancel = () => {
    setEditedTitle(day.title);
    setIsEditingTitle(false);
  };

  return (
    <div
      ref={setDroppableRef}
      className={cn(
        "w-full rounded-lg border bg-card text-card-foreground transition-shadow",
        day.isExpanded ? "ring-1 ring-ring/20 shadow-sm" : "hover:shadow-xs",
        isOver && "ring-2 ring-primary/40"
      )}
    >
      {/* Header */}
      <div
        onClick={onToggleExpand}
        className={cn("group/header flex items-center gap-3 px-4 py-3 cursor-pointer select-none", day.isExpanded && "border-b")}
      >
        <ChevronRight
          className={cn("h-4 w-4 text-muted-foreground transition-transform shrink-0", day.isExpanded && "rotate-90")}
        />

        <div
          className={cn(
            "h-7 w-7 rounded-md text-xs font-semibold flex items-center justify-center shrink-0",
            isFirstDay
              ? "bg-primary/10 text-primary"
              : isLastDay
                ? "bg-destructive/10 text-destructive"
                : "bg-secondary text-secondary-foreground"
          )}
        >
          {day.day}
        </div>

        {isEditingTitle ? (
          <div className="flex items-center gap-1.5 flex-1" onClick={(e) => e.stopPropagation()}>
            <Input
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              className="h-7 text-sm flex-1"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleTitleSave();
                if (e.key === "Escape") handleTitleCancel();
              }}
            />
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleTitleSave}>
              <Check className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleTitleCancel}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 group flex-1 min-w-0">
            <span className="text-sm font-medium truncate">{day.title}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditingTitle(true);
              }}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </div>
        )}

        <Badge variant="outline" className="text-[11px] shrink-0 font-normal">
          {day.activities.length} {day.activities.length === 1 ? "activity" : "activities"}
        </Badge>

        {day.overnight && (
          <span className="text-xs text-muted-foreground truncate max-w-32 shrink-0 hidden sm:inline">
            <Moon className="h-3 w-3 inline mr-1" />
            {day.overnight}
          </span>
        )}

        {/* Copy day activities to other days */}
        {day.activities.length > 0 && onCopyToDays && totalDays > 1 && (
          <Popover
            open={copyPopoverOpen}
            onOpenChange={(open) => {
              setCopyPopoverOpen(open);
              if (!open) setCopyTargets([]);
            }}
          >
            <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 text-muted-foreground"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-48 p-2" onClick={(e) => e.stopPropagation()}>
              <p className="text-xs font-medium text-muted-foreground px-1 mb-1.5">Copy activities to</p>
              <div className="space-y-0.5 max-h-48 overflow-auto">
                {Array.from({ length: totalDays }, (_, i) => i)
                  .filter((i) => i !== dayIndex)
                  .map((i) => (
                    <label
                      key={i}
                      className="flex items-center gap-2 px-1 py-1 rounded hover:bg-muted cursor-pointer text-sm"
                    >
                      <Checkbox
                        checked={copyTargets.includes(i)}
                        onCheckedChange={(checked) => {
                          setCopyTargets((prev) =>
                            checked ? [...prev, i] : prev.filter((d) => d !== i)
                          );
                        }}
                      />
                      Day {i + 1}
                    </label>
                  ))}
              </div>
              <Button
                size="sm"
                className="w-full mt-2 h-7 text-xs"
                disabled={copyTargets.length === 0}
                onClick={() => {
                  onCopyToDays(copyTargets);
                  setCopyPopoverOpen(false);
                  setCopyTargets([]);
                }}
              >
                Copy{copyTargets.length > 0 && ` (${copyTargets.length})`}
              </Button>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Content */}
      {day.isExpanded && (
        <div className="p-4 space-y-3">
          {/* Activities */}
          {day.activities.length === 0 ? (
            <div className={cn(
              "py-8 text-center border border-dashed rounded-lg bg-muted/20",
              isOver && "border-primary/40 bg-primary/5"
            )}>
              <p className="text-sm text-muted-foreground mb-3">
                {isOver ? "Drop here" : "No activities yet"}
              </p>
              {!isOver && (
                <AddActivityPopover
                  trigger={
                    <Button variant="outline" size="sm">
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                      Add Activity
                    </Button>
                  }
                  onAddActivity={handleAddPopoverActivity}
                  dayIndex={dayIndex}
                  itineraryNights={itineraryNights}
                  travelers={travelers}
                />
              )}
            </div>
          ) : (
            <>
              <SortableContext
                items={day.activities.map((a) => a.tempId)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {day.activities.map((activity, actIndex) => (
                    <SortableActivityWrapper
                      key={activity.tempId}
                      activity={activity}
                      activityIndex={actIndex}
                      dayIndex={dayIndex}
                      onUpdate={(updates) => onUpdateActivity(actIndex, updates)}
                      onDelete={() => onDeleteActivity(actIndex)}
                    />
                  ))}
                </div>
              </SortableContext>
              <AddActivityPopover
                trigger={
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Add Activity
                  </Button>
                }
                onAddActivity={handleAddPopoverActivity}
                dayIndex={dayIndex}
                itineraryNights={itineraryNights}
                travelers={travelers}
              />
            </>
          )}

          {/* Overnight */}
          <div className="flex items-center gap-2 pt-3 border-t">
            <Moon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <Input
              value={day.overnight || ""}
              onChange={(e) => onUpdateDay({ overnight: e.target.value })}
              placeholder="Overnight stay (optional)"
              className="h-8 text-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
}
