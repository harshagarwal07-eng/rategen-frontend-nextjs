"use client";

import { useMemo, useState, useTransition } from "react";
import { ICrmQueryCard, QueryStatus } from "@/types/crm-query";
import { getQueryStatusConfig } from "@/lib/status-styles-config";
import { updateCrmQueryStatus } from "@/data-access/crm-queries";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Flag, Pin } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import Link from "next/link";
import { KanbanToolbar, type KanbanFilters } from "./kanban-toolbar";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

const ALL_KANBAN_COLUMNS: QueryStatus[] = ["ongoing", "booked", "live", "completed", "cancelled"];

const STATUS_CARD_STYLES: Partial<Record<QueryStatus, { bg: string; border: string }>> = {
  ongoing: { bg: "bg-amber-500/5", border: "border-amber-500/20" },
  booked: { bg: "bg-sky-500/5", border: "border-sky-500/20" },
  live: { bg: "bg-violet-500/5", border: "border-violet-500/20" },
  completed: { bg: "bg-emerald-500/5", border: "border-emerald-500/20" },
  cancelled: { bg: "bg-rose-500/5", border: "border-rose-500/20" },
};

function KanbanCard({ query }: { query: ICrmQueryCard }) {
  const cardStyle = STATUS_CARD_STYLES[query.status] ?? { bg: "bg-card", border: "border-border" };
  const updatedDate = new Date(query.updated_at || query.created_at);
  const timestamp = isToday(updatedDate)
    ? format(updatedDate, "h:mm a")
    : isYesterday(updatedDate)
      ? "Yesterday"
      : format(updatedDate, "MMM d");

  const childCount = query.pax_details?.children ?? 0;
  const totalPax = query.pax_details ? `${query.pax_details.adults}A${childCount > 0 ? `, ${childCount}C` : ""}` : "-";
  const location = query.travel_country_names?.join(", ") || "-";
  const travelDate = query.travel_date ? format(new Date(query.travel_date), "dd MMM") : "-";

  return (
    <Link href={`/crm/queries/all/${query.id}`} prefetch className="block hover:no-underline px-2 pb-2">
      <div
        className={cn(
          "rounded-lg border p-3 shadow-sm cursor-pointer transition-shadow hover:shadow-md",
          cardStyle.bg,
          cardStyle.border
        )}
      >
        {/* Row 1: Name + badges + Time */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="font-semibold text-sm truncate max-w-[120px]">{query.ta_name}</span>
            {query.ta_category && query.ta_category.toLowerCase() !== "unrated" && (
              <span className="shrink-0 inline-flex items-center gap-1 h-5 px-1.5 rounded text-xs font-bold bg-warning/10">
                <span>{query.ta_category}</span>
                <span className="text-warning">★</span>
              </span>
            )}
            <span className="shrink-0 inline-flex items-center h-5 px-2 rounded text-[10px] font-mono font-bold text-info bg-info/10">
              {query.query_id}
            </span>
            {query.is_flagged_by_dmc && (
              <div className="shrink-0 flex items-center justify-center size-5 rounded bg-destructive/10">
                <Flag className="size-3 stroke-destructive fill-destructive" />
              </div>
            )}
            {!!(query.dmc_pin_count && Number(query.dmc_pin_count) > 0) && (
              <span className="shrink-0 inline-flex items-center gap-0.5 h-5 px-1.5 rounded text-[10px] font-medium bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                <Pin className="size-3" />
                {query.dmc_pin_count}
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground shrink-0 ml-2">{timestamp}</span>
        </div>

        {/* Row 2: Traveler + Location */}
        <p className="text-sm text-muted-foreground truncate mb-2">
          {query.traveler_name} · {location}
        </p>

        {/* Row 3: Pax + Travel date */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{totalPax}</span>
          <span className="text-muted-foreground/40">·</span>
          <span>{travelDate}</span>
        </div>
      </div>
    </Link>
  );
}

function DraggableCard({ query }: { query: ICrmQueryCard }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: query.id,
    data: { query, fromStatus: query.status },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn("touch-none", isDragging && "opacity-40")}
      {...listeners}
      {...attributes}
    >
      <KanbanCard query={query} />
    </div>
  );
}

function DroppableColumn({ status, queries }: { status: QueryStatus; queries: ICrmQueryCard[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const config = getQueryStatusConfig(status);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col flex-1 gap-2 min-w-xs rounded-lg border transition-colors",
        isOver && "border-primary/40 bg-primary/5"
      )}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2 border-b shrink-0">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md",
            config.bgColor,
            config.color
          )}
        >
          <config.icon className="size-3" />
          <span className="capitalize">{config.label}</span>
        </span>
        <span className="text-xs text-muted-foreground font-normal tabular-nums">
          {queries.length} {queries.length === 1 ? "record" : "records"}
        </span>
      </div>

      {/* Cards */}
      <ScrollArea className="flex-1 h-0">
        <div className="flex flex-col py-1">
          {queries.length === 0 ? (
            <div
              className={cn(
                "flex items-center justify-center h-20 text-xs text-muted-foreground transition-colors",
                isOver && "text-primary"
              )}
            >
              {isOver ? "Drop here" : "No queries"}
            </div>
          ) : (
            queries.map((q) => <DraggableCard key={q.id} query={q} />)
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

interface KanbanViewProps {
  queries: ICrmQueryCard[];
  totalItems: number;
}

export function KanbanView({ queries: initialQueries }: KanbanViewProps) {
  const [queries, setQueries] = useState(initialQueries);
  const [dragging, setDragging] = useState<ICrmQueryCard | null>(null);
  const [, startTransition] = useTransition();
  const [filters, setFilters] = useState<KanbanFilters>({
    search: "",
    countries: [],
    categories: [],
  });
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const filtered = useMemo(() => {
    const q = filters.search.toLowerCase();
    return queries.filter((item) => {
      if (
        q &&
        !item.ta_name?.toLowerCase().includes(q) &&
        !item.traveler_name?.toLowerCase().includes(q) &&
        !item.query_id?.toLowerCase().includes(q)
      )
        return false;
      if (filters.countries.length && !item.travel_country_names?.some((c) => filters.countries.includes(c)))
        return false;
      if (filters.categories.length && (!item.ta_category || !filters.categories.includes(item.ta_category)))
        return false;
      return true;
    });
  }, [queries, filters]);

  const grouped = useMemo(
    () =>
      ALL_KANBAN_COLUMNS.reduce<Record<QueryStatus, ICrmQueryCard[]>>(
        (acc, status) => {
          acc[status] = filtered.filter((q) => q.status === status);
          return acc;
        },
        {} as Record<QueryStatus, ICrmQueryCard[]>
      ),
    [filtered]
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { query } = event.active.data.current as { query: ICrmQueryCard; fromStatus: QueryStatus };
    setDragging(query);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDragging(null);
    const { over, active } = event;
    if (!over) return;

    const toStatus = over.id as QueryStatus;
    const { query, fromStatus } = active.data.current as { query: ICrmQueryCard; fromStatus: QueryStatus };
    if (fromStatus === toStatus) return;

    setQueries((prev) => prev.map((q) => (q.id === query.id ? { ...q, status: toStatus } : q)));

    startTransition(async () => {
      const result = await updateCrmQueryStatus(query.id, toStatus);
      if (result.error) {
        setQueries((prev) => prev.map((q) => (q.id === query.id ? { ...q, status: fromStatus } : q)));
        toast.error("Failed to update status", { description: result.error });
      } else {
        toast.success(`Moved to ${toStatus}`);
      }
    });
  };

  return (
    <div className="flex flex-col flex-1 gap-y-2 overflow-hidden h-full">
      <KanbanToolbar filters={filters} onChange={setFilters} />

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex-1 h-0 overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full mr-4">
          <div className="flex gap-3 px-4 pb-4 h-full">
            {ALL_KANBAN_COLUMNS.map((status) => (
              <DroppableColumn key={status} status={status} queries={grouped[status]} />
            ))}
          </div>
        </div>

        <DragOverlay>
          {dragging && (
            <div className="rotate-1 shadow-lg opacity-95 bg-background rounded-lg border w-[280px]">
              <KanbanCard query={dragging} />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
