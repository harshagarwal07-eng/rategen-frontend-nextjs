"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ListTodo, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TooltipButton } from "@/components/ui/tooltip-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AlertModal } from "@/components/ui/alert-modal";

import { getQueryTasks, updateQueryTask, deleteQueryTask } from "@/data-access/tasks";
import type { ITaskDetails, QueryTaskStatus, TaskCategory } from "@/types/tasks";

import { TasksGroupAccordion, TASK_CATEGORY_ORDER } from "./tasks/tasks-group-accordion";
import TaskForm from "@/components/forms/ops-forms/task-form";

const STATUS_FILTERS: { label: string; value: QueryTaskStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "In Progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
  { label: "Skipped", value: "skipped" },
  { label: "Cancelled", value: "cancelled" },
];

interface TasksSectionProps {
  queryId: string;
}

export default function TasksSection({ queryId }: TasksSectionProps) {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<QueryTaskStatus | "all">("all");
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ITaskDetails | null>(null);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["query-tasks", queryId],
    queryFn: () => getQueryTasks(queryId),
    enabled: !!queryId,
    staleTime: 30 * 1000,
  });

  const handleStatusChange = async (id: string, status: QueryTaskStatus) => {
    const updated = await updateQueryTask(id, { status });
    if (!updated) {
      toast.error("Failed to update task");
      return;
    }
    queryClient.setQueryData(["query-tasks", queryId], (prev: ITaskDetails[]) =>
      prev.map((t) => (t.id === id ? { ...t, status: updated.status, completed_at: updated.completed_at } : t))
    );
    toast.success("Task updated");
  };

  const handleDelete = async () => {
    if (!deletingTaskId) return;
    setIsDeleting(true);
    const ok = await deleteQueryTask(deletingTaskId);
    if (!ok) {
      toast.error("Failed to delete task");
      setIsDeleting(false);
      return;
    }
    queryClient.setQueryData(["query-tasks", queryId], (prev: ITaskDetails[]) =>
      prev.filter((t) => t.id !== deletingTaskId)
    );
    toast.success("Task deleted");
    setIsDeleting(false);
    setDeletingTaskId(null);
  };

  const handleTaskCreated = () => {
    queryClient.invalidateQueries({ queryKey: ["query-tasks", queryId] });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-4">
          <div className="rounded-full bg-muted p-4">
            <ListTodo className="h-6 w-6 text-muted-foreground/50" />
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-semibold">No tasks yet</p>
            <p className="text-xs text-muted-foreground max-w-[180px]">Add tasks to track work items for this query.</p>
          </div>
          <Button size="sm" className="h-8 px-3 text-xs gap-1.5" onClick={() => setAddTaskOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Add Task
          </Button>
        </div>
        <TaskForm
          open={addTaskOpen}
          onOpenChange={(open) => {
            if (!open) setAddTaskOpen(false);
          }}
          queryId={queryId}
          onTaskCreated={handleTaskCreated}
          editingTask={null}
        />
      </>
    );
  }

  const availableFilters = STATUS_FILTERS.filter(
    ({ value }) => value === "all" || tasks.some((t) => t.status === value)
  );

  const filteredTasks = statusFilter === "all" ? tasks : tasks.filter((t) => t.status === statusFilter);

  const groups = filteredTasks.reduce(
    (acc, task) => {
      const key = (task.category ?? "uncategorized") as TaskCategory | "uncategorized";
      if (!acc[key]) acc[key] = [];
      acc[key].push(task);
      return acc;
    },
    {} as Record<TaskCategory | "uncategorized", ITaskDetails[]>
  );

  return (
    <>
      <div className="h-full flex flex-col">
        <Tabs
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as QueryTaskStatus | "all")}
          className="flex-1 flex flex-col"
        >
          <div className="border-b bg-background/50 px-3 pb-2">
            <div className="flex items-center justify-between">
              <TabsList className="bg-transparent p-0 gap-2">
                {availableFilters.map(({ label, value }) => {
                  const count = value === "all" ? tasks.length : tasks.filter((t) => t.status === value).length;
                  return (
                    <TabsTrigger
                      key={value}
                      value={value}
                      className={cn(
                        "h-9 rounded-md px-2.5 py-1.5 gap-0.5",
                        "data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none",
                        "text-muted-foreground hover:text-foreground hover:bg-muted font-normal"
                      )}
                    >
                      {label}
                      <sup className="ml-0.5 text-[10px] tabular-nums data-[state=active]:text-primary text-muted-foreground/70">
                        {count}
                      </sup>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2.5 text-xs gap-1 shrink-0"
                  onClick={() => setAddTaskOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Task
                </Button>
                <div className="h-4 w-px bg-border shrink-0 ml-2" />
                <TooltipButton
                  tooltip="Refresh tasks"
                  tooltipSide="bottom"
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ["query-tasks", queryId] })}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </TooltipButton>
              </div>
            </div>
          </div>

          <TabsContent value={statusFilter} className="flex-1 mt-0 overflow-y-auto">
            <div className="px-3 pb-4 space-y-3 pt-3">
              {TASK_CATEGORY_ORDER.filter((key) => key in groups).map((groupKey) => (
                <TasksGroupAccordion
                  key={groupKey}
                  groupKey={groupKey}
                  tasks={groups[groupKey]}
                  onStatusChange={handleStatusChange}
                  onDelete={(id: string) => setDeletingTaskId(id)}
                  onEdit={(task: ITaskDetails) => setEditingTask(task)}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <AlertModal
        isOpen={!!deletingTaskId}
        onClose={() => setDeletingTaskId(null)}
        onConfirm={handleDelete}
        loading={isDeleting}
        title="Delete Task"
        description="Are you sure you want to delete this task? This action cannot be undone."
      />

      <TaskForm
        open={addTaskOpen || !!editingTask}
        onOpenChange={(open) => {
          if (!open) {
            setAddTaskOpen(false);
            setEditingTask(null);
          }
        }}
        queryId={queryId}
        onTaskCreated={handleTaskCreated}
        onTaskUpdated={() => {
          queryClient.invalidateQueries({ queryKey: ["query-tasks", queryId] });
          setEditingTask(null);
        }}
        editingTask={editingTask}
      />
    </>
  );
}
