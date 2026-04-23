"use client";

import { useEffect, useMemo, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { MultiMemberSelector } from "@/components/common/member-selector";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  MultiSelector,
  MultiSelectorContent,
  MultiSelectorInput,
  MultiSelectorItem,
  MultiSelectorList,
  MultiSelectorTrigger,
} from "@/components/ui/multi-select";
import { TASK_REFERENCE_TYPES, TASK_OFFSET_UNITS, TASK_CATEGORIES } from "@/constants/data";
import { libraryTaskFormSchema, LibraryTaskFormValues } from "./schemas/library-task-schema";
import { getServiceOptionsForCategory } from "@/data-access/tasks";
import type { TaskOffsetReference, TaskOffsetDirection, TaskOffsetUnit } from "@/types/tasks";
import { useState } from "react";

// Categories where "Applies To" is irrelevant — always applies to all
const GLOBAL_CATEGORIES = new Set(["package", "finance", "on_trip"]);

const SCOPE_MODE_OPTIONS = [
  { value: "all", label: "All" },
  { value: "inclusive", label: "Only these" },
  { value: "exclusive", label: "All except" },
] as const;

const DEFAULT_VALUES: LibraryTaskFormValues = {
  name: "",
  description: "",
  category: "package",
  service_category: null,
  scope_mode: "all",
  service_map_ids: [],
  offset_reference: "trip_start",
  offset_direction: "after",
  offset_value: 0,
  offset_unit: "day",
  is_active: true,
  default_assignees: [],
};

interface ServiceOption {
  id: string;
  name: string;
}

interface LibraryTaskFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues?: LibraryTaskFormValues;
  onSubmit: (values: LibraryTaskFormValues) => void;
  isSaving: boolean;
  isEditing: boolean;
}

export function LibraryTaskForm({
  open,
  onOpenChange,
  defaultValues,
  onSubmit,
  isSaving,
  isEditing,
}: LibraryTaskFormProps) {
  const form = useForm<LibraryTaskFormValues>({
    resolver: zodResolver(libraryTaskFormSchema),
    defaultValues: defaultValues ?? DEFAULT_VALUES,
  });

  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([]);
  const [loadingServices, startLoadingServices] = useTransition();

  useEffect(() => {
    form.reset(defaultValues ?? DEFAULT_VALUES);
  }, [defaultValues, open]);

  const category = form.watch("category");
  const serviceCategory = form.watch("service_category");
  const scopeMode = form.watch("scope_mode");
  const isGlobalCategory = GLOBAL_CATEGORIES.has(category);

  // Load service options when service_category changes
  useEffect(() => {
    if (!serviceCategory) {
      setServiceOptions([]);
      return;
    }
    startLoadingServices(async () => {
      const options = await getServiceOptionsForCategory(serviceCategory);
      setServiceOptions(options);
    });
  }, [serviceCategory]);

  // Derive service_category from category automatically
  useEffect(() => {
    if (isGlobalCategory) {
      form.setValue("service_category", null);
      form.setValue("scope_mode", "all");
      form.setValue("service_map_ids", []);
    } else if (category === "hotel" || category === "tour" || category === "transfer") {
      form.setValue("service_category", category);
    } else {
      // meal / guide — no matching service_category yet
      form.setValue("service_category", null);
      form.setValue("scope_mode", "all");
      form.setValue("service_map_ids", []);
    }
  }, [category]);

  const showServicePicker = !!serviceCategory && (scopeMode === "inclusive" || scopeMode === "exclusive");

  const multiSelectOptions = useMemo(
    () => serviceOptions.map((o) => ({ value: o.id, label: o.name })),
    [serviceOptions]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Task" : "Add Task"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Send welcome email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Optional notes about this task..." rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Task Category + Scope Mode row */}
            <div className="flex gap-3">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem className="flex-1 min-w-0">
                    <FormLabel>Task Category</FormLabel>
                    <Select value={field.value ?? ""} onValueChange={field.onChange} disabled={isEditing}>
                      <FormControl>
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="Select task category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TASK_CATEGORIES.map(({ value, label }) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  serviceCategory ? "w-[180px] opacity-100" : "w-0 opacity-0"
                }`}
              >
                <FormField
                  control={form.control}
                  name="scope_mode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Applies To</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(v) => {
                          field.onChange(v);
                          if (v === "all") form.setValue("service_map_ids", []);
                        }}
                      >
                        <FormControl>
                          <SelectTrigger className="text-sm">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {SCOPE_MODE_OPTIONS.map(({ value, label }) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {serviceCategory && showServicePicker && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">
                  {scopeMode === "inclusive"
                    ? `Task fires only for queries containing one of these ${serviceCategory}s`
                    : `Task fires for all ${serviceCategory}s except the ones selected below`}
                </p>
                <FormField
                  control={form.control}
                  name="service_map_ids"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <MultiSelector values={field.value} onValuesChange={field.onChange}>
                          <MultiSelectorTrigger data={multiSelectOptions} keyString="label" valueString="value">
                            <MultiSelectorInput
                              placeholder={loadingServices ? "Loading..." : `Search ${serviceCategory}s...`}
                              disabled={loadingServices}
                            />
                          </MultiSelectorTrigger>
                          <MultiSelectorContent>
                            <MultiSelectorList>
                              {multiSelectOptions.map((o) => (
                                <MultiSelectorItem key={o.value} value={o.value}>
                                  {o.label}
                                </MultiSelectorItem>
                              ))}
                            </MultiSelectorList>
                          </MultiSelectorContent>
                        </MultiSelector>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <Separator />

            {/* Timing */}
            <div className="space-y-3">
              <Label>Timing</Label>

              <div className="flex items-start gap-2">
                <FormField
                  control={form.control}
                  name="offset_value"
                  render={({ field }) => (
                    <FormItem className="w-20 shrink-0">
                      <FormControl>
                        <Input type="number" min={0} className="text-sm" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="offset_unit"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <Select value={field.value} onValueChange={(v) => field.onChange(v as TaskOffsetUnit)}>
                        <FormControl>
                          <SelectTrigger className="text-sm">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TASK_OFFSET_UNITS.map(({ value, label }) => (
                            <SelectItem key={value} value={value}>
                              {label}
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
                  name="offset_direction"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <Select value={field.value} onValueChange={(v) => field.onChange(v as TaskOffsetDirection)}>
                        <FormControl>
                          <SelectTrigger className="text-sm">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="before">Before</SelectItem>
                          <SelectItem value="after">After</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="offset_reference"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <Select value={field.value} onValueChange={(v) => field.onChange(v as TaskOffsetReference)}>
                        <FormControl>
                          <SelectTrigger className="text-sm">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TASK_REFERENCE_TYPES.map(({ value, label }) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Assignees */}
            <FormField
              control={form.control}
              name="default_assignees"
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

            <Separator />

            {/* Active toggle */}
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <div>
                    <FormLabel className="cursor-pointer">Active</FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Inactive tasks won&apos;t be assigned to new bookings
                    </p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : isEditing ? "Save Changes" : "Create Task"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
