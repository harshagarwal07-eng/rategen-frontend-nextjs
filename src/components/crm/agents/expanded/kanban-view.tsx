"use client";

import { useMemo, useState, useTransition } from "react";
import { ICrmTaDetails, OrgStatus } from "@/types/crm-agency";
import { getAgentStatusConfig } from "@/lib/status-styles-config";

import { updateAgencyStatus } from "@/data-access/crm-agency";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { KanbanToolbar, type KanbanFilters } from "./kanban-toolbar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Pin, Flag } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import Link from "next/link";
import Show from "@/components/ui/show";
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

const KANBAN_COLUMNS: OrgStatus[] = ["pending", "active", "inactive", "blocked"];

function KanbanCard({ agent, status }: { agent: ICrmTaDetails; status: OrgStatus }) {
  const statusConfig = getAgentStatusConfig(agent.status);
  const updatedDate = new Date(agent.updated_at || agent.created_at);
  const timestamp = isToday(updatedDate)
    ? format(updatedDate, "h:mm a")
    : isYesterday(updatedDate)
      ? "Yesterday"
      : format(updatedDate, "MMM d");

  const location = `${agent.city_name || ""}${agent.city_name && agent.country_name ? ", " : ""}${agent.country_name || ""}`;
  const href = `/crm/agents/${status || "all"}/${agent.ta_id}`;

  // e.g. bgColor = "bg-primary/10" → borderColor = "border-primary/10", cardBg = "bg-primary/5"
  const cardBg = statusConfig.bgColor.replace("/10", "/5");
  const borderColor = statusConfig.bgColor.replace("bg-", "border-");

  return (
    <Link href={href} prefetch className="block hover:no-underline px-2 pb-2">
      <div
        className={cn(
          "rounded-lg border p-3 shadow-sm cursor-pointer transition-shadow hover:shadow-md",
          cardBg,
          borderColor
        )}
      >
        {/* Row 1: Name + Time */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className="font-semibold text-sm truncate">{agent.name}</span>
            {agent.category && agent.category !== "unrated" && (
              <Badge variant="secondary" className="shrink-0 h-5 gap-1 px-1.5 font-bold text-xs bg-warning/10">
                <span>{agent.category}</span>
                <span className="text-warning">★</span>
              </Badge>
            )}
            <Show when={agent.is_flagged}>
              <div className="shrink-0 flex items-center justify-center size-5 rounded bg-destructive/10">
                <Flag className="size-3 stroke-destructive fill-destructive" />
              </div>
            </Show>
            <Show when={!!(agent.dmc_pin_count && Number(agent.dmc_pin_count) > 0)}>
              <Badge
                variant="secondary"
                className="shrink-0 h-5 px-1.5 gap-0.5 bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
              >
                <Pin className="size-3" />
                <span className="text-[10px] font-medium">{agent.dmc_pin_count}</span>
              </Badge>
            </Show>
          </div>
          <span className="text-xs text-muted-foreground shrink-0 ml-2">{timestamp}</span>
        </div>

        {/* Row 2: Admin + Location */}
        <p className="text-sm text-muted-foreground truncate mb-1">
          {agent.ta_admin_name || "-"} · {location || "-"}
        </p>

        {/* Row 3: Queries count */}
        <p className="text-xs text-muted-foreground/70">{agent.queries_count ?? 0} queries</p>
      </div>
    </Link>
  );
}

function DraggableCard({ agent, status }: { agent: ICrmTaDetails; status: OrgStatus }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: agent.ta_id,
    data: { agent, fromStatus: status },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn("touch-none", isDragging && "opacity-40")}
      {...listeners}
      {...attributes}
    >
      <KanbanCard agent={agent} status={status} />
    </div>
  );
}

function DroppableColumn({ status, agents }: { status: OrgStatus; agents: ICrmTaDetails[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const config = getAgentStatusConfig(status);

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
          <span className="capitalize">{status}</span>
        </span>
        <span className="text-xs text-muted-foreground font-normal tabular-nums">
          {agents.length} {agents.length === 1 ? "record" : "records"}
        </span>
      </div>

      {/* Cards */}
      <ScrollArea className="flex-1 h-0">
        <div className="flex flex-col py-1">
          {agents.length === 0 ? (
            <div
              className={cn(
                "flex items-center justify-center h-20 text-xs text-muted-foreground transition-colors",
                isOver && "text-primary"
              )}
            >
              {isOver ? "Drop here" : "No agents"}
            </div>
          ) : (
            agents.map((agent) => <DraggableCard key={agent.ta_id} agent={agent} status={status} />)
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

interface KanbanViewProps {
  agents: ICrmTaDetails[];
  totalItems: number;
}

export function KanbanView({ agents: initialAgents }: KanbanViewProps) {
  const [agents, setAgents] = useState(initialAgents);
  const [draggingAgent, setDraggingAgent] = useState<ICrmTaDetails | null>(null);
  const [, startTransition] = useTransition();
  const [filters, setFilters] = useState<KanbanFilters>({
    search: "",
    countries: [],
    cities: [],
    categories: [],
    sources: [],
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // Apply all filters
  const filteredAgents = useMemo(() => {
    const q = filters.search.toLowerCase();
    return agents.filter((a) => {
      if (q && !a.name?.toLowerCase().includes(q) && !a.ta_admin_name?.toLowerCase().includes(q)) return false;
      if (filters.countries.length && !filters.countries.includes(a.country)) return false;
      if (filters.cities.length && (!a.city || !filters.cities.includes(a.city))) return false;
      if (filters.categories.length && (!a.category || !filters.categories.includes(a.category))) return false;
      if (filters.sources.length && (!a.source || !filters.sources.includes(a.source))) return false;
      return true;
    });
  }, [agents, filters]);

  const grouped = useMemo(
    () =>
      KANBAN_COLUMNS.reduce<Record<OrgStatus, ICrmTaDetails[]>>(
        (acc, status) => {
          acc[status] = filteredAgents.filter((a) => a.status === status);
          return acc;
        },
        {} as Record<OrgStatus, ICrmTaDetails[]>
      ),
    [filteredAgents]
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { agent } = event.active.data.current as { agent: ICrmTaDetails; fromStatus: OrgStatus };
    setDraggingAgent(agent);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggingAgent(null);
    const { over, active } = event;
    if (!over) return;

    const toStatus = over.id as OrgStatus;
    const { agent, fromStatus } = active.data.current as { agent: ICrmTaDetails; fromStatus: OrgStatus };
    if (fromStatus === toStatus) return;

    setAgents((prev) => prev.map((a) => (a.ta_id === agent.ta_id ? { ...a, status: toStatus } : a)));

    startTransition(async () => {
      const result = await updateAgencyStatus(agent.ta_id, toStatus);
      if (result.error) {
        setAgents((prev) => prev.map((a) => (a.ta_id === agent.ta_id ? { ...a, status: fromStatus } : a)));
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
            {KANBAN_COLUMNS.map((status) => (
              <DroppableColumn key={status} status={status} agents={grouped[status]} />
            ))}
          </div>
        </div>

        <DragOverlay>
          {draggingAgent && (
            <div className="rotate-1 shadow-lg opacity-95 bg-background rounded-lg border w-[280px]">
              <KanbanCard agent={draggingAgent} status={draggingAgent.status} />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
