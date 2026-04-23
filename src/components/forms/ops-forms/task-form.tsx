"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { MultiMemberSelector } from "@/components/common/member-selector";

import { TASK_CATEGORIES } from "@/constants/data";
import { addQueryTask, updateQueryTask, setTaskAssignees } from "@/data-access/tasks";
import type { ITaskDetails, TaskCategory } from "@/types/tasks";

const schema = z.object({
  name: z.string().min(1, "Task name is required").max(200),
  category: z.string().min(1, "Task category is required"),
  description: z.string().optional(),
  due_at: z.date().optional(),
  assignees: z.array(z.string()),
});

type FormValues = z.infer<typeof schema>;

interface TaskFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  queryId: string;
  onTaskCreated?: (task: ITaskDetails) => void;
  onTaskUpdated?: (task: ITaskDetails) => void;
  /** Pass an existing task to switch to edit mode */
  editingTask?: ITaskDetails | null;
}

export default function TaskForm({
  open,
  onOpenChange,
  queryId,
  onTaskCreated,
  onTaskUpdated,
  editingTask,
}: TaskFormProps) {
  const isEditing = !!editingTask;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      category: "package",
      description: "",
      due_at: undefined,
      assignees: [],
    },
  });

  useEffect(() => {
    if (editingTask) {
      form.reset({
        name: editingTask.name,
        category: editingTask.category ?? "package",
        description: editingTask.description ?? "",
        due_at: editingTask.due_at ? new Date(editingTask.due_at) : undefined,
        assignees: editingTask.assignees?.map((a) => a.user_id) ?? [],
      });
    } else {
      form.reset({ name: "", category: "package", description: "", due_at: undefined, assignees: [] });
    }
  }, [editingTask, open]);

  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  };

  const onSubmit = async (values: FormValues) => {
    if (isEditing && editingTask) {
      const updated = await updateQueryTask(editingTask.id, {
        name: values.name,
        category: values.category as TaskCategory,
        description: values.description?.trim() || null,
        due_at: values.due_at ? values.due_at.toISOString() : null,
      });
      if (!updated) {
        toast.error("Failed to update task");
        return;
      }
      await setTaskAssignees(editingTask.id, values.assignees);
      onTaskUpdated?.(updated);
      toast.success("Task updated");
    } else {
      const task = await addQueryTask({
        query_id: queryId,
        name: values.name,
        description: values.description?.trim() || null,
        category: values.category as TaskCategory,
        due_at: values.due_at ? values.due_at.toISOString() : null,
      });
      if (!task) {
        toast.error("Failed to create task");
        return;
      }
      await setTaskAssignees(task.id, values.assignees);
      onTaskCreated?.(task);
      toast.success("Task created");
    }

    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Task" : "Add Task"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Send confirmation voucher" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isEditing}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select task category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TASK_CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="due_at"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Due Date (Optional)</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Pick a date"
                      captionLayout="dropdown"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Add details or context..." className="resize-none" rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            <FormField
              control={form.control}
              name="assignees"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assignees</FormLabel>
                  <FormControl>
                    <MultiMemberSelector
                      value={field.value ?? []}
                      onChange={field.onChange}
                      placeholder="Select assignees..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClose}
                disabled={form.formState.isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? isEditing
                    ? "Saving..."
                    : "Creating..."
                  : isEditing
                    ? "Save Changes"
                    : "Create Task"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
