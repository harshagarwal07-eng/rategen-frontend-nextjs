"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, Trash2, Copy, GripVertical, ChevronDown, Loader2, X } from "lucide-react";
import {
  ICombo,
  IComboItem,
  IComboSeason,
  IAgePolicy,
  CombosDatastoreSchema,
  ComboType,
} from "./schemas/combos-datastore-schema";
import { createCombo, updateCombo } from "@/data-access/combos";
import { bulkUpsertComboItems } from "@/data-access/combo-items";
import { bulkUpsertComboSeasons } from "@/data-access/combo-seasons";
import { toast } from "sonner";
import { CURRENCY_OPTIONS } from "@/constants/data";
import { useCountryCityOptions } from "@/hooks/use-country-city-options";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import PackageSelector from "./combo-sections/package-selector";
import ComboSeasonFields from "./combo-sections/combo-season-fields";
import { BorderedCard } from "@/components/ui/bordered-card";
import { Autocomplete } from "@/components/ui/autocomplete";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchCitiesByCountryId, fetchCitiesByStateId, fetchCityById } from "@/data-access/datastore";
import { cn } from "@/lib/utils";

interface ComboFullscreenFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: ICombo | null;
  onSuccess?: () => void;
  isDataLoading?: boolean;
}

// Sortable Season Component
interface SortableSeasonProps {
  season: IComboSeason;
  seasonIndex: number;
  updateSeasonField: (index: number, field: keyof IComboSeason, value: any) => void;
  removeSeason: (index: number) => void;
  duplicateSeason: (index: number) => void;
  seasonsLength: number;
  agePolicy?: IAgePolicy;
}

const SortableSeason = ({
  season,
  seasonIndex,
  updateSeasonField,
  removeSeason,
  duplicateSeason,
  seasonsLength,
  agePolicy,
}: SortableSeasonProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `season-${seasonIndex}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <AccordionItem
        value={`season-${seasonIndex}`}
        className="border-2 border-muted bg-accent/30 rounded-lg overflow-hidden"
      >
        <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-accent/40 transition-colors [&>svg]:hidden group">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing touch-none"
                onClick={(e) => e.stopPropagation()}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
              <span className="text-sm font-medium">{season.dates || `Season ${seasonIndex + 1}`}</span>
            </div>
            <div
              className="flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  duplicateSeason(seasonIndex);
                }}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    duplicateSeason(seasonIndex);
                  }
                }}
                role="button"
                tabIndex={0}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 cursor-pointer"
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </div>
              {seasonsLength > 1 && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSeason(seasonIndex);
                  }}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      removeSeason(seasonIndex);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-destructive text-destructive-foreground hover:bg-destructive/90 h-8 px-3 cursor-pointer"
                >
                  <Trash2 className="h-3 w-3" />
                </div>
              )}
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-3 pb-3">
          <ComboSeasonFields
            season={season}
            seasonIndex={seasonIndex}
            updateSeasonField={updateSeasonField}
            agePolicy={agePolicy}
          />
        </AccordionContent>
      </AccordionItem>
    </div>
  );
};

interface IOption {
  value: string;
  label: string;
}

export default function ComboFullscreenForm({
  isOpen,
  onClose,
  initialData,
  onSuccess,
  isDataLoading = false,
}: ComboFullscreenFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [items, setItems] = useState<IComboItem[]>([]);
  const [seasons, setSeasons] = useState<IComboSeason[]>([]);
  const [openSeasons, setOpenSeasons] = useState<string[]>([]);

  // Compute form values from initialData
  const formValues = useMemo(() => {
    if (initialData) {
      return {
        title: initialData.title || "",
        description: initialData.description || "",
        remarks: initialData.remarks || "",
        combo_type: initialData.combo_type,
        min_packages: initialData.min_packages,
        max_packages: initialData.max_packages,
        currency: initialData.currency || "USD",
        country: initialData.country || "",
        state: initialData.state || "",
        city: initialData.city || "",
        age_policy: initialData.age_policy || {},
      };
    }
    return {
      title: "",
      description: "",
      remarks: "",
      combo_type: "AND" as const,
      min_packages: 2,
      max_packages: undefined,
      currency: "USD",
      country: "",
      state: "",
      city: "",
      age_policy: {},
    };
  }, [initialData]);

  const form = useForm<ICombo>({
    resolver: zodResolver(CombosDatastoreSchema),
    defaultValues: formValues,
    values: formValues, // This keeps form in sync with external values
    resetOptions: {
      keepDirtyValues: false, // Ensure form values reset completely
    },
  });

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Watch country field changes for city fetching
  const countryValue = form.watch("country");
  const stateValue = form.watch("state");

  // Use cached country/city options
  const {
    countries: countryOptions,
    states: stateOptions,
    cities: cityOptions,
    isLoadingCountries,
    isLoadingStates,
    isLoadingCities,
  } = useCountryCityOptions({ countryId: countryValue, stateId: stateValue });

  const countryCodeById = Object.fromEntries(countryOptions.map((c) => [c.value, c.code!]));
  const showStateInput = !!countryValue && countryCodeById[countryValue] === "IN";

  useEffect(() => {
    form.setValue("state", "", { shouldValidate: false });
    form.setValue("city", "", { shouldValidate: false });
  }, [countryValue, form]);

  useEffect(() => {
    if (showStateInput) {
      form.setValue("city", "", { shouldValidate: false });
    }
  }, [stateValue, showStateInput, form]);

  // Reset form when initialData.id changes (for navigation between records)
  useEffect(() => {
    if (initialData) {
      form.reset(formValues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData?.id]);

  // Sync items and seasons when initialData changes
  // Form field values are handled automatically via `values` prop in useForm
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setItems(initialData.items || []);
        setSeasons(initialData.seasons || [{ dates: "All Season", order: 0 }]);
      } else {
        setItems([]);
        setSeasons([{ dates: "All Season", order: 0 }]);
      }
    }
  }, [isOpen, initialData]);

  // Auto-generate description from package names
  useEffect(() => {
    if (items.length > 0) {
      const description = items.map((item) => item.package_name || "Unknown Package").join(" + ");
      form.setValue("description", description);
    } else {
      form.setValue("description", "");
    }
  }, [items, form]);

  // Handle item changes from package selector
  const handleItemsChange = useCallback((newItems: IComboItem[]) => {
    setItems(newItems);
  }, []);

  // Handle age policy copy from package
  const handleCopyAgePolicy = useCallback(
    (sourcePackage: any) => {
      // Check package-level age_policy first, then parent-level
      const agePolicy = sourcePackage?.age_policy || sourcePackage?.parent_age_policy;
      if (agePolicy) {
        form.setValue("age_policy", agePolicy);
        toast.success("Age policy copied from package");
      } else {
        toast.error("No age policy found in selected package");
      }
    },
    [form]
  );

  // Season management functions
  const addSeason = useCallback(() => {
    const newSeason: IComboSeason = {
      dates: `Season ${seasons.length + 1}`,
      order: seasons.length,
    };
    setSeasons((prev) => [...prev, newSeason]);
    setOpenSeasons((prev) => [...prev, `season-${seasons.length}`]);
  }, [seasons.length]);

  const removeSeason = useCallback((index: number) => {
    setSeasons((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const duplicateSeason = useCallback(
    (index: number) => {
      const seasonToDuplicate = seasons[index];
      const newSeason = {
        ...JSON.parse(JSON.stringify(seasonToDuplicate)),
        id: undefined,
        dates: `${seasonToDuplicate.dates} (Copy)`,
        order: seasons.length,
      };
      setSeasons((prev) => [...prev, newSeason]);
      setOpenSeasons((prev) => [...prev, `season-${seasons.length}`]);
    },
    [seasons]
  );

  const updateSeasonField = useCallback((index: number, field: keyof IComboSeason, value: any) => {
    setSeasons((prev) => prev.map((season, i) => (i === index ? { ...season, [field]: value } : season)));
  }, []);

  const handleSeasonDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = parseInt(String(active.id).replace("season-", ""));
    const newIndex = parseInt(String(over.id).replace("season-", ""));

    setSeasons((prev) => arrayMove(prev, oldIndex, newIndex));
  }, []);

  const handleClose = () => {
    router.refresh();
    onClose();
  };

  const onSubmit = async (data: ICombo) => {
    // Validate minimum items
    if (items.length < 2) {
      toast.error("A combo must have at least 2 packages");
      return;
    }

    setIsLoading(true);
    try {
      let comboId = initialData?.id;

      // Create or update combo
      const comboData = {
        title: data.title,
        description: data.description,
        remarks: data.remarks,
        combo_type: data.combo_type || "AND",
        min_packages: data.min_packages ?? 2,
        max_packages: data.max_packages || undefined,
        currency: data.currency,
        age_policy: data.age_policy,
        country: data.country || undefined,
        state: data.state || undefined,
        city: data.city || undefined,
      };

      if (comboId) {
        const result = await updateCombo(comboId, comboData);
        if (result.error) throw new Error(result.error);
      } else {
        const result = await createCombo(comboData as ICombo);
        if (result.error) throw new Error(result.error);
        comboId = result.data?.id;
      }

      if (!comboId) throw new Error("Failed to get combo ID");

      // Save items
      const itemsWithComboId = items.map((item, index) => ({
        ...item,
        combo_id: comboId,
        order: index,
      }));
      const itemsResult = await bulkUpsertComboItems(comboId, itemsWithComboId);
      if (itemsResult.error) throw new Error(itemsResult.error);

      // Save seasons
      const seasonsWithComboId = seasons.map((season, index) => ({
        ...season,
        combo_id: comboId,
        order: index,
      }));
      const seasonsResult = await bulkUpsertComboSeasons(comboId, seasonsWithComboId);
      if (seasonsResult.error) throw new Error(seasonsResult.error);

      toast.success(initialData?.id ? "Combo updated successfully!" : "Combo created successfully!");
      router.refresh();
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Error saving combo:", error);
      toast.error("Failed to save combo");
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading skeleton when data is being fetched
  if (isDataLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent
          className="max-w-full sm:max-w-full h-full p-0 gap-0 flex flex-col"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogTitle className="sr-only">Loading Combo</DialogTitle>

          {/* Header Skeleton */}
          <div className="sticky top-0">
            <DialogHeader className="space-y-4 border-b bg-muted">
              <div className="flex justify-center">
                <div className="flex bg-muted rounded-lg p-1">
                  <div className="flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium bg-background text-foreground shadow-sm">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold bg-primary text-primary-foreground">
                      1
                    </span>
                    <span>Edit Combo</span>
                  </div>
                </div>
              </div>
            </DialogHeader>
          </div>

          {/* Loading Content */}
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading combo details...</p>
            </div>
          </div>

          {/* Footer with close button */}
          <div className="border-t p-4 flex justify-end">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        key={initialData?.id || "new"} // Force re-mount when editing different combo
        className="max-w-full sm:max-w-full h-full p-0 gap-0 flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Combo Configuration</DialogTitle>

        {/* Fixed Header */}
        <div className="sticky top-0">
          <DialogHeader className="space-y-4 border-b bg-muted">
            {/* Title Tab */}
            <div className="flex justify-center">
              <div className="flex bg-muted rounded-lg p-1">
                <div className="flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium bg-background text-foreground shadow-sm">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold bg-primary text-primary-foreground">
                    1
                  </span>
                  <span>{initialData?.id ? "Edit Combo" : "Create Combo"}</span>
                </div>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Content */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto p-6 pb-20">
              <div className="mx-auto max-w-full px-4 space-y-8">
                {/* Title */}
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter combo title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Currency, Country, City */}
                <div className={cn("grid grid-cols-1 lg:grid-cols-3 gap-4", showStateInput && "lg:grid-cols-4")}>
                  <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Currency</FormLabel>
                        <Autocomplete
                          options={CURRENCY_OPTIONS}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select currency"
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        {isLoadingCountries ? (
                          <Skeleton className="h-10 w-full" />
                        ) : (
                          <Autocomplete
                            options={countryOptions}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Select country"
                          />
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {showStateInput && (
                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          {isLoadingCountries ? (
                            <Skeleton className="h-10 w-full" />
                          ) : (
                            <Autocomplete
                              options={stateOptions}
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="Select state"
                              disabled={!countryValue}
                            />
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <Autocomplete
                          mode="server"
                          value={field.value}
                          onChange={field.onChange}
                          onSearch={(search: string) =>
                            stateValue
                              ? fetchCitiesByStateId(stateValue, search)
                              : fetchCitiesByCountryId(countryValue!, search)
                          }
                          fetchByValue={(id) => fetchCityById(id)}
                          placeholder="Select city"
                          disabled={showStateInput ? !stateValue : !countryValue}
                          emptyMessage={
                            showStateInput && !stateValue
                              ? "Select a state first"
                              : !countryValue
                                ? "Select a country first"
                                : "No cities available"
                          }
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Description (auto-generated) */}
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (auto-generated)</FormLabel>
                        <FormControl>
                          <Textarea
                            disabled
                            readOnly
                            placeholder="Will be auto-generated from package names"
                            className="min-h-[80px]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>Auto-generated from package names</FormDescription>
                      </FormItem>
                    )}
                  />

                  {/* AI Remarks */}
                  <FormField
                    control={form.control}
                    name="remarks"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>AI Remarks</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter AI-specific remarks about this combo..."
                            className="min-h-[80px]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>Specific notes for AI to reference when generating responses</FormDescription>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Packages Section */}
                <BorderedCard title="Packages" collapsible>
                  <div className="space-y-4">
                    <PackageSelector
                      items={items}
                      onItemsChange={handleItemsChange}
                      onCopyAgePolicy={handleCopyAgePolicy}
                      selectedCountry={countryValue}
                    />
                    {items.length < 2 && items.length > 0 && (
                      <p className="text-sm text-destructive">Add at least {2 - items.length} more package(s)</p>
                    )}
                    {items.length === 0 && (
                      <p className="text-sm text-muted-foreground">A combo must have at least 2 packages</p>
                    )}
                  </div>
                </BorderedCard>

                {/* Combo Type, Min & Max Packages */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="combo_type"
                    render={({ field }) => {
                      const currentValue = form.watch("combo_type") || "AND";
                      return (
                        <FormItem>
                          <FormLabel>Combo Type *</FormLabel>
                          <Select onValueChange={field.onChange} value={currentValue}>
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select combo type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="AND">AND - All packages required</SelectItem>
                              <SelectItem value="OR">OR - Any package can be selected</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            AND: All packages must be used together. OR: Customer can choose.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />

                  <FormField
                    control={form.control}
                    name="min_packages"
                    render={({ field }) => {
                      const currentValue = form.watch("min_packages");
                      return (
                        <FormItem>
                          <FormLabel>Min Packages *</FormLabel>
                          <Select
                            onValueChange={(val) => field.onChange(parseInt(val))}
                            value={currentValue?.toString() || "2"}
                            disabled={items.length < 2}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select min" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Array.from({ length: Math.max(items.length - 1, 1) }, (_, i) => i + 2).map((num) => (
                                <SelectItem key={num} value={num.toString()}>
                                  {num}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>Minimum packages required</FormDescription>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />

                  <FormField
                    control={form.control}
                    name="max_packages"
                    render={({ field }) => {
                      const currentValue = form.watch("max_packages");
                      const selectValue = typeof currentValue === "number" ? currentValue.toString() : "none";
                      return (
                        <FormItem>
                          <FormLabel>Max Packages</FormLabel>
                          <Select
                            onValueChange={(val) => field.onChange(val === "none" ? undefined : parseInt(val))}
                            value={selectValue}
                            disabled={items.length < 2}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="No limit" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">No limit</SelectItem>
                              {Array.from({ length: Math.max(items.length - 1, 1) }, (_, i) => i + 2).map((num) => (
                                <SelectItem key={num} value={num.toString()}>
                                  {num}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>Maximum packages allowed (optional)</FormDescription>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                </div>

                {/* Age Policy Section */}
                <BorderedCard title="Age Policy" collapsible>
                  <div className="space-y-4">
                    {items.length > 0 && (
                      <div className="flex justify-end">
                        <Select
                          onValueChange={(value) => {
                            const selectedItem = items.find(
                              (item) => (item.tour_package_id || item.transfer_package_id) === value
                            );
                            if (selectedItem?.source_package) {
                              handleCopyAgePolicy(selectedItem.source_package);
                            }
                          }}
                        >
                          <SelectTrigger className="w-[400px]">
                            <SelectValue placeholder="Copy from package..." />
                          </SelectTrigger>
                          <SelectContent>
                            {items.map((item) => {
                              const packageId = item.tour_package_id || item.transfer_package_id;
                              const parentName = item.tour_name || item.transfer_name;
                              return packageId ? (
                                <SelectItem key={packageId} value={packageId}>
                                  {parentName} / {item.package_name}
                                </SelectItem>
                              ) : null;
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="gap-4 grid lg:grid-cols-2">
                      {/* Adult */}
                      {form.watch("age_policy.adult") ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Adult</Label>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const currentPolicy = form.getValues("age_policy") || {};
                                const { adult, ...rest } = currentPolicy;
                                form.setValue("age_policy", rest);
                              }}
                              className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Delete
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-0.5">
                              <Label className="text-xs text-muted-foreground">Min Age</Label>
                              <Input
                                type="text"
                                placeholder="From"
                                value={form.watch("age_policy.adult.min_age") ?? ""}
                                onChange={(e) => {
                                  const val = e.target.value.trim();
                                  const parsed = parseInt(val);
                                  if (val === "" || isNaN(parsed)) return;
                                  const currentPolicy = form.getValues("age_policy") || {};
                                  form.setValue("age_policy", {
                                    ...currentPolicy,
                                    adult: {
                                      min_age: parsed,
                                      max_age: currentPolicy.adult?.max_age ?? 99,
                                    },
                                  });
                                }}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="space-y-0.5">
                              <Label className="text-xs text-muted-foreground">Max Age</Label>
                              <Input
                                type="text"
                                placeholder="To"
                                value={form.watch("age_policy.adult.max_age") ?? ""}
                                onChange={(e) => {
                                  const val = e.target.value.trim();
                                  const parsed = parseInt(val);
                                  if (val === "" || isNaN(parsed)) return;
                                  const currentPolicy = form.getValues("age_policy") || {};
                                  form.setValue("age_policy", {
                                    ...currentPolicy,
                                    adult: {
                                      min_age: currentPolicy.adult?.min_age ?? 18,
                                      max_age: parsed,
                                    },
                                  });
                                }}
                                className="h-8 text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {/* Teenager */}
                      {form.watch("age_policy.teenager") ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Teenager</Label>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const currentPolicy = form.getValues("age_policy") || {};
                                const { teenager, ...rest } = currentPolicy;
                                form.setValue("age_policy", rest);
                              }}
                              className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Delete
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-0.5">
                              <Label className="text-xs text-muted-foreground">Min Age</Label>
                              <Input
                                type="text"
                                placeholder="From"
                                value={form.watch("age_policy.teenager.min_age") ?? ""}
                                onChange={(e) => {
                                  const val = e.target.value.trim();
                                  const parsed = parseInt(val);
                                  if (val === "" || isNaN(parsed)) return;
                                  const currentPolicy = form.getValues("age_policy") || {};
                                  form.setValue("age_policy", {
                                    ...currentPolicy,
                                    teenager: {
                                      min_age: parsed,
                                      max_age: currentPolicy.teenager?.max_age ?? 17,
                                    },
                                  });
                                }}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="space-y-0.5">
                              <Label className="text-xs text-muted-foreground">Max Age</Label>
                              <Input
                                type="text"
                                placeholder="To"
                                value={form.watch("age_policy.teenager.max_age") ?? ""}
                                onChange={(e) => {
                                  const val = e.target.value.trim();
                                  const parsed = parseInt(val);
                                  if (val === "" || isNaN(parsed)) return;
                                  const currentPolicy = form.getValues("age_policy") || {};
                                  form.setValue("age_policy", {
                                    ...currentPolicy,
                                    teenager: {
                                      min_age: currentPolicy.teenager?.min_age ?? 13,
                                      max_age: parsed,
                                    },
                                  });
                                }}
                                className="h-8 text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {/* Child */}
                      {form.watch("age_policy.child") ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Child</Label>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const currentPolicy = form.getValues("age_policy") || {};
                                const { child, ...rest } = currentPolicy;
                                form.setValue("age_policy", rest);
                              }}
                              className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Delete
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-0.5">
                              <Label className="text-xs text-muted-foreground">Min Age</Label>
                              <Input
                                type="text"
                                placeholder="From"
                                value={form.watch("age_policy.child.min_age") ?? ""}
                                onChange={(e) => {
                                  const val = e.target.value.trim();
                                  const parsed = parseInt(val);
                                  if (val === "" || isNaN(parsed)) return;
                                  const currentPolicy = form.getValues("age_policy") || {};
                                  form.setValue("age_policy", {
                                    ...currentPolicy,
                                    child: {
                                      min_age: parsed,
                                      max_age: currentPolicy.child?.max_age ?? 12,
                                    },
                                  });
                                }}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="space-y-0.5">
                              <Label className="text-xs text-muted-foreground">Max Age</Label>
                              <Input
                                type="text"
                                placeholder="To"
                                value={form.watch("age_policy.child.max_age") ?? ""}
                                onChange={(e) => {
                                  const val = e.target.value.trim();
                                  const parsed = parseInt(val);
                                  if (val === "" || isNaN(parsed)) return;
                                  const currentPolicy = form.getValues("age_policy") || {};
                                  form.setValue("age_policy", {
                                    ...currentPolicy,
                                    child: {
                                      min_age: currentPolicy.child?.min_age ?? 6,
                                      max_age: parsed,
                                    },
                                  });
                                }}
                                className="h-8 text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {/* Infant */}
                      {form.watch("age_policy.infant") ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Infant</Label>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const currentPolicy = form.getValues("age_policy") || {};
                                const { infant, ...rest } = currentPolicy;
                                form.setValue("age_policy", rest);
                              }}
                              className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Delete
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-0.5">
                              <Label className="text-xs text-muted-foreground">Min Age</Label>
                              <Input
                                type="text"
                                placeholder="From"
                                value={form.watch("age_policy.infant.min_age") ?? ""}
                                onChange={(e) => {
                                  const val = e.target.value.trim();
                                  const parsed = parseInt(val);
                                  if (val === "" || isNaN(parsed)) return;
                                  const currentPolicy = form.getValues("age_policy") || {};
                                  form.setValue("age_policy", {
                                    ...currentPolicy,
                                    infant: {
                                      min_age: parsed,
                                      max_age: currentPolicy.infant?.max_age ?? 5,
                                    },
                                  });
                                }}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="space-y-0.5">
                              <Label className="text-xs text-muted-foreground">Max Age</Label>
                              <Input
                                type="text"
                                placeholder="To"
                                value={form.watch("age_policy.infant.max_age") ?? ""}
                                onChange={(e) => {
                                  const val = e.target.value.trim();
                                  const parsed = parseInt(val);
                                  if (val === "" || isNaN(parsed)) return;
                                  const currentPolicy = form.getValues("age_policy") || {};
                                  form.setValue("age_policy", {
                                    ...currentPolicy,
                                    infant: {
                                      min_age: currentPolicy.infant?.min_age ?? 0,
                                      max_age: parsed,
                                    },
                                  });
                                }}
                                className="h-8 text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {/* Add Age Bracket Buttons */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {!form.watch("age_policy.adult") && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const currentPolicy = form.getValues("age_policy") || {};
                            form.setValue("age_policy", {
                              ...currentPolicy,
                              adult: { min_age: 18, max_age: 99 },
                            });
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Adult
                        </Button>
                      )}
                      {!form.watch("age_policy.teenager") && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const currentPolicy = form.getValues("age_policy") || {};
                            form.setValue("age_policy", {
                              ...currentPolicy,
                              teenager: { min_age: 13, max_age: 17 },
                            });
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Teenager
                        </Button>
                      )}
                      {!form.watch("age_policy.child") && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const currentPolicy = form.getValues("age_policy") || {};
                            form.setValue("age_policy", {
                              ...currentPolicy,
                              child: { min_age: 2, max_age: 12 },
                            });
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Child
                        </Button>
                      )}
                      {!form.watch("age_policy.infant") && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const currentPolicy = form.getValues("age_policy") || {};
                            form.setValue("age_policy", {
                              ...currentPolicy,
                              infant: { min_age: 0, max_age: 1 },
                            });
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Infant
                        </Button>
                      )}
                    </div>
                  </div>
                </BorderedCard>

                {/* Seasonal Pricing Section */}
                <BorderedCard title="Seasonal Pricing" collapsible>
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSeasonDragEnd}>
                    <SortableContext
                      items={seasons.map((_, i) => `season-${i}`)}
                      strategy={verticalListSortingStrategy}
                    >
                      <Accordion
                        type="multiple"
                        value={openSeasons}
                        onValueChange={setOpenSeasons}
                        className="space-y-3"
                      >
                        {seasons.map((season, index) => (
                          <SortableSeason
                            key={`season-${index}`}
                            season={season}
                            seasonIndex={index}
                            updateSeasonField={updateSeasonField}
                            removeSeason={removeSeason}
                            duplicateSeason={duplicateSeason}
                            seasonsLength={seasons.length}
                            agePolicy={form.watch("age_policy")}
                          />
                        ))}
                      </Accordion>
                    </SortableContext>
                  </DndContext>

                  {/* Add Season Button */}
                  <div className="flex justify-center mt-4">
                    <Button type="button" variant="dashed" onClick={addSeason} className="w-full max-w-md">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Season
                    </Button>
                  </div>
                </BorderedCard>
              </div>
            </div>

            {/* Fixed Footer */}
            <div className="sticky bottom-0 border-t px-4 py-2 bg-muted">
              <div className="flex items-center justify-end">
                <Button
                  type="submit"
                  className="min-w-32"
                  loading={isLoading}
                  loadingText="Saving..."
                  disabled={isLoading}
                >
                  Save Combo
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
