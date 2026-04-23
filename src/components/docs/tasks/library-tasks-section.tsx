"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertModal } from "@/components/ui/alert-modal";
import { saveLibraryTask, updateLibraryTask, deleteLibraryTask, getTaskServiceMap } from "@/data-access/tasks";
import { fetchMemberOptions } from "@/data-access/dmc";
import type { ITaskLibrary, TaskCategory } from "@/types/tasks";
import type { IOption } from "@/types/common";
import { LibraryTaskForm } from "@/components/forms/library-task-form";
import type { LibraryTaskFormValues } from "@/components/forms/schemas/library-task-schema";
import { LibraryTasksGroupAccordion, LIBRARY_TASK_CATEGORY_ORDER } from "./library-tasks-group-accordion";
import useUser from "@/hooks/use-user";

type ActiveFilter = "all" | "active" | "inactive";

const ACTIVE_FILTERS: { label: string; value: ActiveFilter }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

interface Props {
  initialData: ITaskLibrary[];
}

export function LibraryTasksSection({ initialData }: Props) {
  const router = useRouter();
  const { user } = useUser();
  const [tasks, setTasks] = useState<ITaskLibrary[]>(initialData);
  const [memberOptions, setMemberOptions] = useState<IOption[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ITaskLibrary | null>(null);
  const [editingServiceMapIds, setEditingServiceMapIds] = useState<string[]>([]);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [isSaving, startSave] = useTransition();

  useEffect(() => {
    const dmcId = user && "dmc" in user ? user.dmc?.id : undefined;
    if (dmcId) fetchMemberOptions(dmcId).then(setMemberOptions);
  }, [user]);

  const openCreate = () => {
    setEditingTask(null);
    setDialogOpen(true);
  };

  const openEdit = (task: ITaskLibrary) => {
    setEditingTask(task);
    setEditingServiceMapIds([]);
    setDialogOpen(true);
    if (task.scope_mode !== "all") {
      getTaskServiceMap(task.id).then((entries) => setEditingServiceMapIds(entries.map((e) => e.service_parent_id)));
    }
  };

  const handleSubmit = (values: LibraryTaskFormValues) => {
    startSave(async () => {
      const saved = await saveLibraryTask(values, editingTask?.id);
      if (!saved) {
        toast.error(editingTask ? "Failed to update task" : "Failed to create task");
        return;
      }
      if (editingTask) {
        setTasks((prev) => prev.map((t) => (t.id === saved.id ? saved : t)));
        toast.success("Task updated");
      } else {
        setTasks((prev) => [...prev, saved]);
        toast.success("Task created");
      }
      setDialogOpen(false);
      router.refresh();
    });
  };

  const handleDelete = async () => {
    if (!deletingTaskId) return;
    setIsDeleting(true);
    const ok = await deleteLibraryTask(deletingTaskId);
    if (!ok) {
      toast.error("Failed to delete task");
      setIsDeleting(false);
      return;
    }
    setTasks((prev) => prev.filter((t) => t.id !== deletingTaskId));
    toast.success("Task deleted");
    setIsDeleting(false);
    setDeletingTaskId(null);
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    const updated = await updateLibraryTask(id, { is_active: isActive });
    if (!updated) {
      toast.error("Failed to update task");
      return;
    }
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, is_active: isActive } : t)));
    toast.success(isActive ? "Task marked as active" : "Task marked as inactive");
  };

  const dialogDefaultValues: LibraryTaskFormValues | undefined = editingTask
    ? {
        name: editingTask.name,
        description: editingTask.description ?? "",
        category: editingTask.category ?? "package",
        service_category: editingTask.service_category ?? null,
        scope_mode: editingTask.scope_mode ?? "all",
        service_map_ids: editingServiceMapIds,
        offset_reference: editingTask.offset_reference,
        offset_direction: editingTask.offset_direction,
        offset_value: editingTask.offset_value,
        offset_unit: editingTask.offset_unit,
        is_active: editingTask.is_active,
        default_assignees: editingTask.default_assignees ?? [],
      }
    : undefined;

  if (tasks.length === 0) {
    return (
      <>
        <div className="flex-1 flex flex-col items-center justify-center w-full gap-4 text-center p-4">
          <ListTodo className="h-10 w-10 text-muted-foreground/30" />
          <div className="space-y-1">
            <p className="text-sm font-medium">No library tasks yet</p>
            <p className="text-xs text-muted-foreground">
              Create task templates that auto-assign when a booking is confirmed.
            </p>
          </div>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Task
          </Button>
        </div>
        <LibraryTaskForm
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          defaultValues={dialogDefaultValues}
          onSubmit={handleSubmit}
          isSaving={isSaving}
          isEditing={!!editingTask}
        />
      </>
    );
  }

  const taskCounts = useMemo(() => {
    const active = tasks.filter((t) => t.is_active).length;
    return { all: tasks.length, active, inactive: tasks.length - active };
  }, [tasks]);

  const availableFilters = useMemo(
    () => ACTIVE_FILTERS.filter(({ value }) => value === "all" || taskCounts[value] > 0),
    [taskCounts]
  );

  const filteredTasks = useMemo(
    () =>
      activeFilter === "all" ? tasks : tasks.filter((t) => (activeFilter === "active" ? t.is_active : !t.is_active)),
    [tasks, activeFilter]
  );

  const groups = useMemo(
    () =>
      filteredTasks.reduce(
        (acc, task) => {
          const key = (task.category ?? "uncategorized") as TaskCategory | "uncategorized";
          if (!acc[key]) acc[key] = [];
          acc[key].push(task);
          return acc;
        },
        {} as Record<TaskCategory | "uncategorized", ITaskLibrary[]>
      ),
    [filteredTasks]
  );

  return (
    <>
      <div className="flex-1 flex flex-col w-full min-h-0">
        <Tabs
          value={activeFilter}
          onValueChange={(v) => setActiveFilter(v as ActiveFilter)}
          className="flex-1 flex flex-col"
        >
          <div className="border-b bg-background/50 px-3 pt-1.5 pb-1.5">
            <div className="flex items-center justify-between">
              <TabsList className="bg-transparent p-0 gap-2">
                {availableFilters.map(({ label, value }) => {
                  return (
                    <TabsTrigger
                      key={value}
                      value={value}
                      className={cn(
                        "h-7 rounded-md px-2 py-1 gap-0.5 text-xs",
                        "data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none",
                        "text-muted-foreground hover:text-foreground hover:bg-muted font-normal"
                      )}
                    >
                      {label}
                      <sup className="ml-0.5 text-[10px] tabular-nums data-[state=active]:text-primary text-muted-foreground/70">
                        {taskCounts[value]}
                      </sup>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
              <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs gap-1 shrink-0" onClick={openCreate}>
                <Plus className="h-3.5 w-3.5" />
                Add Task
              </Button>
            </div>
          </div>

          <TabsContent value={activeFilter} className="flex-1 mt-0 min-h-0 relative">
            <ScrollArea className="absolute inset-0">
              <div className="pl-3 pr-4 pb-4 space-y-3 pt-3">
                {LIBRARY_TASK_CATEGORY_ORDER.filter((key) => key in groups).map((groupKey) => (
                  <LibraryTasksGroupAccordion
                    key={groupKey}
                    groupKey={groupKey}
                    tasks={groups[groupKey]}
                    memberOptions={memberOptions}
                    onEdit={openEdit}
                    onDelete={(id) => setDeletingTaskId(id)}
                    onToggleActive={handleToggleActive}
                  />
                ))}
              </div>
            </ScrollArea>
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

      <LibraryTaskForm
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultValues={dialogDefaultValues}
        onSubmit={handleSubmit}
        isSaving={isSaving}
        isEditing={!!editingTask}
      />
    </>
  );
}
