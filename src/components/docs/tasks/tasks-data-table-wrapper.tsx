"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  type ColumnFiltersState,
  type SortingState,
  type Updater,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useQueryStates } from "nuqs";
import { DataTable } from "@/components/ui/new-table/data-table";
import { generateTaskColumns } from "./columns";
import { createLibraryTask, updateLibraryTask, deleteLibraryTask } from "@/data-access/tasks";
import type { ITaskLibrary } from "@/types/tasks";
import { LibraryTaskForm } from "@/components/forms/library-task-form";
import type { LibraryTaskFormValues } from "@/components/forms/schemas/library-task-schema";
import { tasksSearchParams } from "./tasks-searchparams";

interface Props {
  initialData: ITaskLibrary[];
}

const FILTER_KEYS = ["applies_to", "timing", "status"] as const;

export function TasksDataTableWrapper({ initialData }: Props) {
  const router = useRouter();
  const [tasks, setTasks] = useState<ITaskLibrary[]>(initialData);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ITaskLibrary | null>(null);
  const [isPending, startTransition] = useTransition();

  // URL state for filters (source of truth)
  const [urlFilters, setUrlFilters] = useQueryStates(tasksSearchParams, { shallow: true });

  // Local table state — initialized from URL once on mount
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(() =>
    FILTER_KEYS.filter((key) => urlFilters[key].length > 0).map((key) => ({ id: key, value: urlFilters[key] }))
  );

  const [sorting, setSorting] = useState<SortingState>([]);

  const onColumnFiltersChange = useCallback(
    (updaterOrValue: Updater<ColumnFiltersState>) => {
      setColumnFilters((prev) => {
        const next = typeof updaterOrValue === "function" ? updaterOrValue(prev) : updaterOrValue;
        const updates: { applies_to: string[] | null; timing: string[] | null; status: string[] | null } = {
          applies_to: null,
          timing: null,
          status: null,
        };
        for (const filter of next) {
          if (filter.id === "applies_to" || filter.id === "timing" || filter.id === "status") {
            updates[filter.id] = filter.value as string[];
          }
        }
        void setUrlFilters(updates);
        return next;
      });
    },
    [setUrlFilters]
  );

  const openCreate = () => {
    setEditingTask(null);
    setDialogOpen(true);
  };

  const openEdit = (task: ITaskLibrary) => {
    setEditingTask(task);
    setDialogOpen(true);
  };

  const handleSubmit = (values: LibraryTaskFormValues) => {
    startTransition(async () => {
      if (editingTask) {
        const updated = await updateLibraryTask(editingTask.id, values);
        if (!updated) {
          toast.error("Failed to update task");
          return;
        }
        setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        toast.success("Task updated");
      } else {
        const created = await createLibraryTask(values);
        if (!created) {
          toast.error("Failed to create task");
          return;
        }
        setTasks((prev) => [...prev, created]);
        toast.success("Task created");
      }

      setDialogOpen(false);
      router.refresh();
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const ok = await deleteLibraryTask(id);
      if (!ok) {
        toast.error("Failed to delete task");
        return;
      }
      setTasks((prev) => prev.filter((t) => t.id !== id));
      toast.success("Task deleted");
      router.refresh();
    });
  };

  const columns = generateTaskColumns(openEdit, handleDelete);

  const table = useReactTable({
    data: tasks,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const dialogDefaultValues: LibraryTaskFormValues | undefined = editingTask
    ? {
        name: editingTask.name,
        description: editingTask.description ?? "",
        category: editingTask.category ?? "package",
        apply_to: editingTask.apply_to,
        service_types: editingTask.service_types ?? [],
        service_id: editingTask.service_id ?? "",
        service_parent_id: editingTask.service_parent_id ?? "",
        offset_reference: editingTask.offset_reference,
        offset_direction: editingTask.offset_direction,
        offset_value: editingTask.offset_value,
        offset_unit: editingTask.offset_unit,
        is_active: editingTask.is_active,
        default_assignees: editingTask.default_assignees ?? [],
      }
    : undefined;

  return (
    <>
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="shrink-0 border-b bg-muted/30 flex items-center justify-between px-4 py-2.5">
          <h2 className="text-base font-semibold">Tasks</h2>
          <Button size="sm" onClick={openCreate} disabled={isPending}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Task
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden p-4">
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
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
          ) : (
            <DataTable table={table} showPagination={false} />
          )}
        </div>
      </div>

      <LibraryTaskForm
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultValues={dialogDefaultValues}
        onSubmit={handleSubmit}
        isPending={isPending}
        isEditing={!!editingTask}
      />
    </>
  );
}
