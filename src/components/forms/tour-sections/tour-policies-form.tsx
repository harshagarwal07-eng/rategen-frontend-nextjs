"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Copy, ChevronDown } from "lucide-react";
import { ITourAddOn, IAgePolicy, ITourPackage } from "../schemas/tours-datastore-schema";
import { BorderedCard } from "@/components/ui/bordered-card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { getTourAddOns, deleteTourAddOn, bulkUpsertTourAddOns } from "@/data-access/tour-add-ons";
import { toast } from "sonner";
import * as z from "zod";
import { S3ImageUpload } from "@/components/ui/s3-image-upload";
import useUser from "@/hooks/use-user";
import { Skeleton } from "@/components/ui/skeleton";
import IndicateLocked from "@/components/common/indicate-locked";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Tour Policies Schema
const TourPoliciesSchema = z.object({
  id: z.string().optional(),
  cancellation_policy: z.string().optional(),
});

export type ITourPolicies = z.infer<typeof TourPoliciesSchema>;

interface TourPoliciesFormProps {
  initialData?: Partial<
    ITourPolicies & {
      id?: string;
      packages?: ITourPackage[];
      add_ons?: ITourAddOn[];
    }
  >;
  syncedColumns: string[];
  onNext: (data: ITourPolicies & { id?: string; add_ons: ITourAddOn[] }) => void;
  setIsLoading?: (loading: boolean) => void;
  formRef?: React.RefObject<HTMLFormElement>;
}

// Helper function for numeric input handling
const handleNumericChange = (setter: (value: any) => void, value: string, isInteger = false) => {
  const trimmedValue = value.trim();
  if (trimmedValue === "") {
    setter(undefined);
    return;
  }
  // Allow numbers and decimal point
  if (/^\d*\.?\d*$/.test(trimmedValue)) {
    const numValue = isInteger ? parseInt(trimmedValue) : parseFloat(trimmedValue);
    if (!isNaN(numValue)) {
      setter(numValue);
    }
  }
};

export default function TourPoliciesForm({
  initialData,
  syncedColumns,
  onNext,
  setIsLoading,
  formRef,
}: TourPoliciesFormProps) {
  const { user } = useUser();
  const form = useForm<ITourPolicies>({
    resolver: zodResolver(TourPoliciesSchema),
    defaultValues: {
      id: initialData?.id || undefined,
      cancellation_policy: initialData?.cancellation_policy || "",
    },
  });

  const [isAddOnRemoveOpen, setIsAddOnRemoveOpen] = useState<boolean>(false);
  const [addOnRemoveIndex, setAddOnRemoveIndex] = useState<number | null>(null);
  const [affectedPackages, setAffectedPackages] = useState<any[]>([]);
  const [isAddOnRemoving, setIsAddOnRemoving] = useState<boolean>(false);
  const [addOns, setAddOns] = useState<ITourAddOn[]>(() => {
    return initialData?.add_ons || [];
  });
  const [loadingAddOns, setLoadingAddOns] = useState(false);

  // Reset form when initialData.id changes (for navigation between records)
  useEffect(() => {
    if (initialData) {
      form.reset({
        id: initialData?.id || undefined,
        cancellation_policy: initialData?.cancellation_policy || "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData?.id]);

  // Load add-ons when component mounts or tour changes
  useEffect(() => {
    const loadAddOns = async () => {
      if (initialData?.id) {
        setLoadingAddOns(true);
        try {
          const result = await getTourAddOns(initialData.id);
          if (result.data && result.data.length > 0) {
            setAddOns(result.data);
          }
        } finally {
          setLoadingAddOns(false);
        }
      }
    };
    loadAddOns();
  }, [initialData?.id]);

  const getIsLocked = (addOnIndex: number, name: string) => {
    const addOn: any = Array.isArray(addOns) ? addOns[addOnIndex] : {};

    const isLinked = !!addOn?.tour_add_on_datastore_id && !addOn.is_unlinked;

    return isLinked && syncedColumns.includes(name);
  };

  const onSubmit = async (data: ITourPolicies) => {
    setIsLoading?.(true);
    try {
      const tourId = initialData?.id;
      if (!tourId) throw new Error("Tour ID is required");

      // Bulk upsert all add-ons
      const result = await bulkUpsertTourAddOns(tourId, addOns);
      if (result.error) throw new Error(result.error);

      // Update local state with saved add-ons (including new IDs)
      setAddOns(result.data);

      onNext({ ...data, id: initialData?.id, add_ons: result.data });
    } catch (error) {
      console.error("Error saving add-ons:", error);
      toast.error("Failed to save add-ons");
      setIsLoading?.(false);
    }
  };

  const addAddOn = () => {
    const newAddOn: ITourAddOn = {
      id: "",
      tour_id: initialData?.id || "",
      name: `Add-on ${addOns.length + 1}`,
      description: "",
      age_policy: {
        adult: { min_age: 18, max_age: 99 },
        teenager: { min_age: 13, max_age: 17 },
        child: { min_age: 2, max_age: 12 },
        infant: { min_age: 0, max_age: 1 },
      },
      remarks: "",
      notes: "",
      ticket_only_rate_adult: undefined,
      ticket_only_rate_child: undefined,
      ticket_only_rate_infant: undefined,
      ticket_only_rate_teenager: undefined,
      total_rate: undefined,
      max_participants: undefined,
      images: [],
      tour_add_on_datastore_id: null,
      is_unlinked: false,
    };
    setAddOns([...addOns, newAddOn]);
  };

  const removeAddOn = async (index: number) => {
    const addOnToDelete = addOns[index];

    // If add-on has an ID, delete from database
    if (addOnToDelete.id) {
      setIsAddOnRemoving(true);

      const affectedPackages: any[] = [];

      initialData?.packages?.forEach((pkg) => {
        pkg.selected_add_ons?.forEach((addOn) => {
          if (typeof addOn === "string" ? addOn === addOnToDelete.id : addOn.id === addOnToDelete.id) {
            affectedPackages.push({
              id: pkg.id,
              packageName: pkg.name,
              isMandatory: typeof addOn === "string" ? false : addOn.is_mandatory,
            });
          }
        });
      });

      if (affectedPackages?.length !== 0 && !isAddOnRemoveOpen) {
        setIsAddOnRemoving(false);
        setIsAddOnRemoveOpen(true);
        setAddOnRemoveIndex(index);
        setAffectedPackages(affectedPackages);
        return;
      }

      try {
        const result = await deleteTourAddOn(addOnToDelete.id);
        if (result.error) {
          toast.error("Failed to delete add-on");
          return;
        }
        toast.success("Add-on deleted successfully");
      } catch (error) {
        console.error("Error deleting add-on:", error);
        toast.error("Failed to delete add-on");
        return;
      } finally {
        setIsAddOnRemoveOpen(false);
        setAddOnRemoveIndex(null);
        setAffectedPackages([]);
        setIsAddOnRemoving(false);
      }
    }

    setAddOns(addOns.filter((_, i) => i !== index));
  };

  const duplicateAddOn = (index: number) => {
    const addOnToDuplicate = addOns[index];
    const duplicated: ITourAddOn = {
      ...addOnToDuplicate,
      id: "", // Clear ID for new add-on
      name: `${addOnToDuplicate.name} (Copy)`,
      tour_add_on_datastore_id: null,
      is_unlinked: false,
    };
    setAddOns([...addOns, duplicated]);
  };

  const updateAddOnField = (index: number, field: keyof ITourAddOn, value: any) => {
    const updated = [...addOns];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setAddOns(updated);
  };

  const updateAgePolicy = (index: number, ageBracket: keyof IAgePolicy, field: string, value: any) => {
    const updated = [...addOns];
    if (!updated[index].age_policy) {
      updated[index].age_policy = {};
    }
    if (!updated[index].age_policy![ageBracket]) {
      updated[index].age_policy![ageBracket] = {} as any;
    }

    if (field === "min_age" || field === "max_age") {
      handleNumericChange(
        (val) => {
          (updated[index].age_policy![ageBracket] as any)[field] = val;
          setAddOns(updated);
        },
        value,
        true // isInteger
      );
      return;
    } else {
      (updated[index].age_policy![ageBracket] as any)[field] = value;
    }

    setAddOns(updated);
  };

  const deleteAgeBracket = (index: number, ageBracket: keyof IAgePolicy) => {
    const updated = [...addOns];
    if (updated[index].age_policy && updated[index].age_policy![ageBracket]) {
      delete updated[index].age_policy![ageBracket];
    }
    // Also clear associated rate values
    const rateField = `ticket_only_rate_${ageBracket}` as keyof (typeof updated)[0];
    if (rateField in updated[index]) {
      (updated[index] as any)[rateField] = undefined;
    }
    setAddOns(updated);
  };

  const addAgeBracket = (index: number, ageBracket: keyof IAgePolicy) => {
    const updated = [...addOns];
    if (!updated[index].age_policy) {
      updated[index].age_policy = {};
    }

    const defaultAges = {
      adult: { min_age: 18, max_age: 99 },
      teenager: { min_age: 13, max_age: 17 },
      child: { min_age: 2, max_age: 12 },
      infant: { min_age: 0, max_age: 1 },
    };

    updated[index].age_policy![ageBracket] = defaultAges[ageBracket] as any;
    setAddOns(updated);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">Policies & Add-ons</h2>
        <p className="text-muted-foreground">Define tour policies and configure optional add-ons</p>
      </div>

      <Form {...form}>
        <form ref={formRef} onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Policies Section */}
          <BorderedCard title="Policies & Rules" collapsible>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="cancellation_policy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cancellation Policy</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter cancellation policy details"
                        className="min-h-[100px]"
                        {...field}
                        disabled={false}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </BorderedCard>

          {/* Add-ons Section */}
          <BorderedCard title="Tour Add-ons" collapsible>
            {loadingAddOns ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="border-2 border-border bg-card rounded-lg overflow-hidden">
                    <div className="px-3 py-2 flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <Skeleton className="h-5 w-5 rounded" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-7 w-20" />
                        <Skeleton className="h-7 w-16" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Accordion type="multiple" className="space-y-3">
                {addOns.map((addOn, index) => (
                  <AccordionItem
                    key={index}
                    value={`addon-${index}`}
                    className="border-2 border-border bg-card rounded-lg overflow-hidden"
                  >
                    <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-accent/20 transition-colors [&>svg]:hidden group">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3 flex-1">
                          <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                          <span className="text-sm font-semibold">{addOn.name || `Add-on ${index + 1}`}</span>
                          {getIsLocked(index, "tour_add_on.name") && (
                            <IndicateLocked tooltip="This addon is linked to datastore" />
                          )}
                        </div>
                        <div
                          className="flex items-center gap-2"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              duplicateAddOn(index);
                            }}
                            onKeyDown={(e) => {
                              e.stopPropagation();
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                duplicateAddOn(index);
                              }
                            }}
                            role="button"
                            tabIndex={0}
                            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-7 px-2 cursor-pointer"
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Duplicate
                          </div>
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              removeAddOn(index);
                            }}
                            onKeyDown={(e) => {
                              e.stopPropagation();
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                removeAddOn(index);
                              }
                            }}
                            role="button"
                            tabIndex={0}
                            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-destructive text-destructive-foreground hover:bg-destructive/90 h-7 px-3 cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>

                    <AccordionContent className="px-4 pb-4">
                      <div className="space-y-4 pt-2">
                        <div className="grid lg:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Add-on Name</Label>
                            <Textarea
                              placeholder="e.g., Museum Entry, Lunch Package"
                              value={addOn.name}
                              onChange={(e) => updateAddOnField(index, "name", e.target.value)}
                              className="min-h-[60px] resize-none"
                              disabled={getIsLocked(index, "tour_add_on.name")}
                              rightIcon={getIsLocked(index, "tour_add_on.name") && <IndicateLocked />}
                            />
                          </div>

                          {/* Description */}
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Description</Label>
                            <Textarea
                              placeholder="1-line description of the add-on"
                              value={addOn.description || ""}
                              onChange={(e) => updateAddOnField(index, "description", e.target.value)}
                              className="min-h-[60px] resize-none"
                            />
                          </div>
                        </div>

                        {/* Age Policy Section */}
                        <BorderedCard title="Age Policy" collapsible>
                          <div className="space-y-3">
                            <div className="gap-4 grid lg:grid-cols-2">
                              {/* Adult */}
                              {addOn.age_policy?.adult ? (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-sm font-medium">Adult</Label>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => deleteAgeBracket(index, "adult")}
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
                                        type="number"
                                        placeholder="From"
                                        value={addOn.age_policy?.adult?.min_age ?? ""}
                                        onChange={(e) => updateAgePolicy(index, "adult", "min_age", e.target.value)}
                                        className="h-8 text-sm"
                                      />
                                    </div>
                                    <div className="space-y-0.5">
                                      <Label className="text-xs text-muted-foreground">Max Age</Label>
                                      <Input
                                        type="number"
                                        placeholder="To"
                                        value={addOn.age_policy?.adult?.max_age ?? ""}
                                        onChange={(e) => updateAgePolicy(index, "adult", "max_age", e.target.value)}
                                        className="h-8 text-sm"
                                      />
                                    </div>
                                  </div>
                                </div>
                              ) : null}

                              {/* Teenager */}
                              {addOn.age_policy?.teenager ? (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-sm font-medium">Teenager</Label>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => deleteAgeBracket(index, "teenager")}
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
                                        type="number"
                                        placeholder="From"
                                        value={addOn.age_policy?.teenager?.min_age ?? ""}
                                        onChange={(e) => updateAgePolicy(index, "teenager", "min_age", e.target.value)}
                                        className="h-8 text-sm"
                                      />
                                    </div>
                                    <div className="space-y-0.5">
                                      <Label className="text-xs text-muted-foreground">Max Age</Label>
                                      <Input
                                        type="number"
                                        placeholder="To"
                                        value={addOn.age_policy?.teenager?.max_age ?? ""}
                                        onChange={(e) => updateAgePolicy(index, "teenager", "max_age", e.target.value)}
                                        className="h-8 text-sm"
                                      />
                                    </div>
                                  </div>
                                </div>
                              ) : null}

                              {/* Child */}
                              {addOn.age_policy?.child ? (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-sm font-medium">Child</Label>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => deleteAgeBracket(index, "child")}
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
                                        type="number"
                                        placeholder="From"
                                        value={addOn.age_policy?.child?.min_age ?? ""}
                                        onChange={(e) => updateAgePolicy(index, "child", "min_age", e.target.value)}
                                        className="h-8 text-sm"
                                      />
                                    </div>
                                    <div className="space-y-0.5">
                                      <Label className="text-xs text-muted-foreground">Max Age</Label>
                                      <Input
                                        type="number"
                                        placeholder="To"
                                        value={addOn.age_policy?.child?.max_age ?? ""}
                                        onChange={(e) => updateAgePolicy(index, "child", "max_age", e.target.value)}
                                        className="h-8 text-sm"
                                      />
                                    </div>
                                  </div>
                                </div>
                              ) : null}

                              {/* Infant */}
                              {addOn.age_policy?.infant ? (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-sm font-medium">Infant</Label>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => deleteAgeBracket(index, "infant")}
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
                                        type="number"
                                        placeholder="From"
                                        value={addOn.age_policy?.infant?.min_age ?? ""}
                                        onChange={(e) => updateAgePolicy(index, "infant", "min_age", e.target.value)}
                                        className="h-8 text-sm"
                                      />
                                    </div>
                                    <div className="space-y-0.5">
                                      <Label className="text-xs text-muted-foreground">Max Age</Label>
                                      <Input
                                        type="number"
                                        placeholder="To"
                                        value={addOn.age_policy?.infant?.max_age ?? ""}
                                        onChange={(e) => updateAgePolicy(index, "infant", "max_age", e.target.value)}
                                        className="h-8 text-sm"
                                      />
                                    </div>
                                  </div>
                                </div>
                              ) : null}
                            </div>

                            {/* Add Age Bracket Buttons */}
                            <div className="flex flex-wrap gap-2 pt-2 border-t">
                              {!addOn.age_policy?.adult && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addAgeBracket(index, "adult")}
                                  className="h-8"
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add Adult
                                </Button>
                              )}
                              {!addOn.age_policy?.teenager && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addAgeBracket(index, "teenager")}
                                  className="h-8"
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add Teenager
                                </Button>
                              )}
                              {!addOn.age_policy?.child && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addAgeBracket(index, "child")}
                                  className="h-8"
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add Child
                                </Button>
                              )}
                              {!addOn.age_policy?.infant && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addAgeBracket(index, "infant")}
                                  className="h-8"
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add Infant
                                </Button>
                              )}
                            </div>
                          </div>
                        </BorderedCard>

                        {/* Pricing Section - Based on Age Policy */}
                        <div className="space-y-3">
                          {/* Total Rate and Max Participants */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Total Rate</Label>
                              <Input
                                type="text"
                                placeholder="Total Rate"
                                value={addOn.total_rate || ""}
                                onChange={(e) =>
                                  handleNumericChange(
                                    (val) => updateAddOnField(index, "total_rate", val),
                                    e.target.value
                                  )
                                }
                                className="h-9 text-sm"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Max Participants</Label>
                              <Input
                                type="text"
                                placeholder="Max Participants"
                                value={addOn.max_participants || ""}
                                onChange={(e) =>
                                  handleNumericChange(
                                    (val) => updateAddOnField(index, "max_participants", val),
                                    e.target.value,
                                    true
                                  )
                                }
                                className="h-9 text-sm"
                              />
                            </div>
                          </div>

                          {/* Age-based Rates - Only show for active age policies */}
                          {(addOn.age_policy?.adult ||
                            addOn.age_policy?.child ||
                            addOn.age_policy?.infant ||
                            addOn.age_policy?.teenager) && (
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Age-based Rates</Label>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {addOn.age_policy?.adult && (
                                  <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">
                                      Adult
                                      {addOn.age_policy.adult.min_age !== undefined &&
                                        addOn.age_policy.adult.max_age !== undefined &&
                                        ` (${addOn.age_policy.adult.min_age}-${addOn.age_policy.adult.max_age})`}
                                    </Label>
                                    <Input
                                      type="text"
                                      placeholder="Adult Rate"
                                      value={addOn.ticket_only_rate_adult || ""}
                                      onChange={(e) =>
                                        handleNumericChange(
                                          (val) => updateAddOnField(index, "ticket_only_rate_adult", val),
                                          e.target.value
                                        )
                                      }
                                      className="h-8 text-sm"
                                    />
                                  </div>
                                )}
                                {addOn.age_policy?.child && (
                                  <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">
                                      Child
                                      {addOn.age_policy.child.min_age !== undefined &&
                                        addOn.age_policy.child.max_age !== undefined &&
                                        ` (${addOn.age_policy.child.min_age}-${addOn.age_policy.child.max_age})`}
                                    </Label>
                                    <Input
                                      type="text"
                                      placeholder="Child Rate"
                                      value={addOn.ticket_only_rate_child || ""}
                                      onChange={(e) =>
                                        handleNumericChange(
                                          (val) => updateAddOnField(index, "ticket_only_rate_child", val),
                                          e.target.value
                                        )
                                      }
                                      className="h-8 text-sm"
                                    />
                                  </div>
                                )}
                                {addOn.age_policy?.infant && (
                                  <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">
                                      Infant
                                      {addOn.age_policy.infant.min_age !== undefined &&
                                        addOn.age_policy.infant.max_age !== undefined &&
                                        ` (${addOn.age_policy.infant.min_age}-${addOn.age_policy.infant.max_age})`}
                                    </Label>
                                    <Input
                                      type="text"
                                      placeholder="Infant Rate"
                                      value={addOn.ticket_only_rate_infant || ""}
                                      onChange={(e) =>
                                        handleNumericChange(
                                          (val) => updateAddOnField(index, "ticket_only_rate_infant", val),
                                          e.target.value
                                        )
                                      }
                                      className="h-8 text-sm"
                                    />
                                  </div>
                                )}
                                {addOn.age_policy?.teenager && (
                                  <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">
                                      Teenager
                                      {addOn.age_policy.teenager.min_age !== undefined &&
                                        addOn.age_policy.teenager.max_age !== undefined &&
                                        ` (${addOn.age_policy.teenager.min_age}-${addOn.age_policy.teenager.max_age})`}
                                    </Label>
                                    <Input
                                      type="text"
                                      placeholder="Teen Rate"
                                      value={addOn.ticket_only_rate_teenager || ""}
                                      onChange={(e) =>
                                        handleNumericChange(
                                          (val) => updateAddOnField(index, "ticket_only_rate_teenager", val),
                                          e.target.value
                                        )
                                      }
                                      className="h-8 text-sm"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Remarks and Notes */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">AI Remarks</Label>
                            <Textarea
                              placeholder="Remarks for AI reference"
                              value={addOn.remarks || ""}
                              onChange={(e) => updateAddOnField(index, "remarks", e.target.value)}
                              className="min-h-[60px] resize-none text-sm"
                              disabled={getIsLocked(index, "tour_add_on.remarks")}
                              rightIcon={getIsLocked(index, "tour_add_on.remarks") && <IndicateLocked />}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Notes</Label>
                            <Textarea
                              placeholder="Notes for frontend and vouchers"
                              value={addOn.notes || ""}
                              onChange={(e) => updateAddOnField(index, "notes", e.target.value)}
                              className="min-h-[60px] resize-none text-sm"
                            />
                          </div>
                        </div>

                        {/* Images Section */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">
                            Add-on Images
                            {getIsLocked(index, "tour_add_on.images")}
                            <IndicateLocked tooltip="Adding or removing images is restricted" />
                          </Label>
                          <S3ImageUpload
                            images={addOn.images || []}
                            onChange={(images) => updateAddOnField(index, "images", images)}
                            userId={user?.id || ""}
                            prefix="tour-addons"
                            // disabled={!user?.id}
                            disabled={!user?.id || getIsLocked(index, "tour_add_on.images")}
                          />
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}

                {addOns.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <h3 className="font-medium mb-2">No add-ons configured yet</h3>
                    <p className="text-sm mb-4">Add optional add-ons that can be selected in packages</p>
                    <Button type="button" variant="outline" onClick={addAddOn} className="w-full max-w-xs">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Add-on
                    </Button>
                  </div>
                )}
              </Accordion>
            )}

            {!loadingAddOns && addOns.length > 0 && (
              <div className="flex justify-center pt-4">
                <Button type="button" variant="dashed" onClick={addAddOn} className="w-full max-w-md">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Another Add-on
                </Button>
              </div>
            )}
          </BorderedCard>
        </form>
      </Form>

      <Dialog open={isAddOnRemoveOpen} onOpenChange={setIsAddOnRemoveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this Add-on? Removing this global add-on will also remove this add-on from
              the packages. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-60 overflow-y-auto">
            <p className="text-sm font-medium mb-2">Affected Packages:</p>
            <ul className="space-y-1">
              {affectedPackages.map((item) => (
                <li key={item.id} className="text-sm text-muted-foreground">
                  • {item.isMandatory ? "Mandatory" : "Included"} in {item.packageName}
                </li>
              ))}
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOnRemoveOpen(false)} disabled={isAddOnRemoving}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => addOnRemoveIndex !== null && removeAddOn(addOnRemoveIndex)}
              disabled={isAddOnRemoving || addOnRemoveIndex === null}
            >
              {isAddOnRemoving ? "Deleting..." : `Delete Add-on`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
