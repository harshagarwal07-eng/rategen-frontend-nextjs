"use client";

import { useState, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Plus, X, User } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import {
  MultiSelector,
  MultiSelectorTrigger,
  MultiSelectorInput,
  MultiSelectorContent,
  MultiSelectorList,
  MultiSelectorItem,
} from "@/components/ui/multi-select";
import { toast } from "sonner";
import { Autocomplete } from "@/components/ui/autocomplete";
import { addSupplierItem } from "@/data-access/suppliers";
import { getAllToursByUser } from "@/data-access/tours";
import { getAllTransfersByUser } from "@/data-access/transfers";
import { getAllHotelsByUser } from "@/data-access/hotels";
import { getAllMealsByUser } from "@/data-access/meals";
import { getAllGuidesByUser } from "@/data-access/guides";
import type { ItemTypes, ISupplierTeamMemberData } from "@/types/suppliers";
import { IOption } from "@/types/common";
import { cn } from "@/lib/utils";

// ── types & constants ──────────────────────────────────────────────────────

const TYPE_LABELS: Record<ItemTypes, string> = {
  hotel: "Hotel",
  tour: "Tour",
  transfer: "Transfer",
  meal: "Meal",
  guide: "Guide",
};

const defaultParams = {
  perPage: 200,
  page: 1,
  search: null,
  sort: [],
  country: [],
  state: [],
  city: [],
  guide_type: [],
  currency: [],
  tour_name: null,
  transfer_name: null,
  title: null,
  hotel_name: null,
};

// ── validation schema ──────────────────────────────────────────────────────

const hasPackages = (type: ItemTypes | null) => type === "tour" || type === "transfer";

const addItemSchema = z.object({
  parent: z.string().min(1, "Please select an item"),
  packages: z.array(z.string()),
  pocs: z.array(z.string()),
  primaryPOC: z.string(),
});

type AddItemFormValues = z.infer<typeof addItemSchema>;

// ── component ──────────────────────────────────────────────────────────────

interface SupplierAddItemPanelProps {
  supplierId: string;
  teamMembers: ISupplierTeamMemberData[];
  category?: ItemTypes[];
}

export default function SupplierAddItemPanel({ supplierId, teamMembers, category = [] }: SupplierAddItemPanelProps) {
  const queryClient = useQueryClient();
  const availableTypes =
    category.length > 0 ? category : (["hotel", "tour", "transfer", "meal", "guide"] as ItemTypes[]);
  const [activeType, setActiveType] = useState<ItemTypes | null>(availableTypes[0] ?? null);
  const [isAdding, setIsAdding] = useState(false);

  const getDefaultValues = (): AddItemFormValues => ({
    parent: "",
    packages: [],
    pocs: [],
    primaryPOC: "",
  });

  const form = useForm<AddItemFormValues>({
    resolver: zodResolver(addItemSchema),
    defaultValues: getDefaultValues(),
  });

  // ── data fetching ──
  const { data: hotelsData } = useQuery({
    queryKey: ["supplier-hotels-list"],
    queryFn: () => getAllHotelsByUser(defaultParams),
    enabled: activeType === "hotel",
    staleTime: 5 * 60 * 1000,
  });

  const { data: toursData } = useQuery({
    queryKey: ["supplier-tours-list"],
    queryFn: () => getAllToursByUser(defaultParams),
    enabled: activeType === "tour",
    staleTime: 5 * 60 * 1000,
  });

  const { data: transfersData } = useQuery({
    queryKey: ["supplier-transfers-list"],
    queryFn: () => getAllTransfersByUser(defaultParams),
    enabled: activeType === "transfer",
    staleTime: 5 * 60 * 1000,
  });

  const { data: mealsData } = useQuery({
    queryKey: ["supplier-meals-list"],
    queryFn: () => getAllMealsByUser(defaultParams),
    enabled: activeType === "meal",
    staleTime: 5 * 60 * 1000,
  });

  const { data: guidesData } = useQuery({
    queryKey: ["supplier-guides-list"],
    queryFn: () => getAllGuidesByUser(defaultParams),
    enabled: activeType === "guide",
    staleTime: 5 * 60 * 1000,
  });

  const hotels = hotelsData?.data || [];
  const tours = toursData?.data || [];
  const transfers = transfersData?.data || [];
  const meals = mealsData?.data || [];
  const guides = guidesData?.data || [];

  // ── derived options ────────────────────────────────────────────────────

  const pocOptions = useMemo<IOption[]>(
    () =>
      teamMembers
        .filter((m) => m.id && (m.name || m.email))
        .map((m) => ({ value: m.id!, label: m.name || m.email || "" })),
    [teamMembers]
  );

  const parentOptions = useMemo<IOption[]>(() => {
    switch (activeType) {
      case "hotel":
        return hotels.map((h: any) => ({ value: h.id, label: h.hotel_name }));
      case "tour":
        return tours.map((t: any) => ({ value: t.id, label: t.tour_name }));
      case "transfer":
        return transfers.map((t: any) => ({ value: t.id, label: t.transfer_name }));
      case "meal":
        return meals.map((m: any) => ({ value: m.id, label: m.meal_name }));
      case "guide":
        return guides.map((g: any) => ({ value: g.id, label: g.guide_type }));
      default:
        return [];
    }
  }, [activeType, hotels, tours, transfers, meals, guides]);

  const selectedParent = form.watch("parent");
  const selectedPackages = form.watch("packages");
  const selectedPOCs = form.watch("pocs");
  const primaryPOC = form.watch("primaryPOC");

  const packageOptions = useMemo<IOption[]>(() => {
    if (activeType === "tour") {
      const parent = tours.find((t: any) => t.id === selectedParent);
      return (parent?.packages || []).map((p: any) => ({ value: p.id, label: p.name }));
    }
    if (activeType === "transfer") {
      const parent = transfers.find((t: any) => t.id === selectedParent);
      return (parent?.packages || []).map((p: any) => ({ value: p.id, label: p.name }));
    }
    return [];
  }, [activeType, selectedParent, tours, transfers]);

  // ── handlers ───────────────────────────────────────────────────────────

  const handlePOCChange = (values: string[]) => {
    form.setValue("pocs", values);
    if (values.length === 0) {
      form.setValue("primaryPOC", "");
    } else if (!values.includes(primaryPOC)) {
      form.setValue("primaryPOC", values[0]);
    }
  };

  const switchType = (type: ItemTypes) => {
    setActiveType(type);
    // Reset parent and packages, keep POCs for convenience
    const currentValues = form.getValues();
    form.reset({
      parent: "",
      packages: [],
      pocs: currentValues.pocs,
      primaryPOC: currentValues.primaryPOC,
    });
  };

  const reset = useCallback(() => {
    form.reset(getDefaultValues());
    setActiveType(null);
  }, [form]);

  const onSubmit = async (data: AddItemFormValues) => {
    if (!activeType || !data.parent) return;
    setIsAdding(true);

    try {
      const pocs =
        data.pocs.length === 0
          ? []
          : data.pocs.map((id) => ({
              team_member_id: id,
              is_primary: id === (data.primaryPOC || data.pocs[0]),
            }));

      if (hasPackages(activeType)) {
        if (data.packages.length === 0) {
          toast.error("Please select at least one package");
          return;
        }

        for (const pkgId of data.packages) {
          const result = await addSupplierItem(supplierId, {
            item_type: activeType,
            tour_id: activeType === "tour" ? data.parent : null,
            transfer_id: activeType === "transfer" ? data.parent : null,
            tour_package_id: activeType === "tour" ? pkgId : null,
            transfer_package_id: activeType === "transfer" ? pkgId : null,
            pocs,
          });

          if (result.error) {
            toast.error(result.error);
            return;
          }
        }

        toast.success(`${data.packages.length} package(s) added`);
      } else {
        const result = await addSupplierItem(supplierId, {
          item_type: activeType,
          hotel_id: activeType === "hotel" ? data.parent : null,
          meal_id: activeType === "meal" ? data.parent : null,
          guide_id: activeType === "guide" ? data.parent : null,
          pocs,
        });

        if (result.error) {
          toast.error(result.error);
          return;
        }

        toast.success(`${TYPE_LABELS[activeType]} added`);
      }

      queryClient.invalidateQueries({ queryKey: ["supplier-items", supplierId] });
      // Reset parent and packages, keep POCs for convenience
      const currentValues = form.getValues();
      form.reset({
        parent: "",
        packages: [],
        pocs: currentValues.pocs,
        primaryPOC: currentValues.primaryPOC,
      });
    } finally {
      setIsAdding(false);
    }
  };

  const isAddDisabled = isAdding || !selectedParent || (hasPackages(activeType) && selectedPackages.length === 0);

  return (
    <div className="space-y-3">
      {/* Type selection tabs */}
      <div className="flex gap-2 flex-wrap">
        {availableTypes.map((type) => (
          <Button
            key={type}
            type="button"
            variant={activeType === type ? "default" : "outline"}
            size="sm"
            onClick={() => switchType(type)}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            {TYPE_LABELS[type]}
          </Button>
        ))}
      </div>

      {/* Form panel */}
      {activeType && (
        <div className="border-2 border-primary/20 rounded-lg p-4 bg-accent/10">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Row 1: Parent + Packages */}
              <div className={cn("grid gap-3", hasPackages(activeType) ? "grid-cols-2" : "grid-cols-1")}>
                <FormField
                  control={form.control}
                  name="parent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{TYPE_LABELS[activeType!]}</FormLabel>
                      <FormControl>
                        <Autocomplete
                          options={parentOptions}
                          value={field.value}
                          onChange={(value) => {
                            field.onChange(value);
                            form.setValue("packages", []);
                          }}
                          placeholder={`Select ${TYPE_LABELS[activeType!].toLowerCase()}...`}
                          searchPlaceholder={`Search ${TYPE_LABELS[activeType!].toLowerCase()}s...`}
                          maxResults={50}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {hasPackages(activeType) && (
                  <FormField
                    control={form.control}
                    name="packages"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={cn(!selectedParent && "text-muted-foreground/50")}>Packages</FormLabel>
                        <FormControl>
                          <div className={cn(!selectedParent && "opacity-50 pointer-events-none")}>
                            <MultiSelector values={field.value} onValuesChange={field.onChange}>
                              <MultiSelectorTrigger
                                data={packageOptions}
                                keyString="label"
                                valueString="value"
                                className="shadow-xs"
                              >
                                <MultiSelectorInput
                                  placeholder={
                                    !selectedParent
                                      ? `Select a ${TYPE_LABELS[activeType!].toLowerCase()} first...`
                                      : "Select packages..."
                                  }
                                />
                              </MultiSelectorTrigger>
                              <MultiSelectorContent>
                                <MultiSelectorList>
                                  {packageOptions.map((opt: IOption) => (
                                    <MultiSelectorItem key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </MultiSelectorItem>
                                  ))}
                                </MultiSelectorList>
                              </MultiSelectorContent>
                            </MultiSelector>
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {/* Row 2: POC + Primary POC */}
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="pocs"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel
                        className={cn("flex items-center gap-1", pocOptions.length === 0 && "text-muted-foreground/50")}
                      >
                        <User className="size-3" /> Point of Contact
                      </FormLabel>
                      <FormControl>
                        <div className={cn(pocOptions.length === 0 && "opacity-50 pointer-events-none")}>
                          <MultiSelector values={field.value} onValuesChange={handlePOCChange}>
                            <MultiSelectorTrigger
                              data={pocOptions}
                              keyString="label"
                              valueString="value"
                              className="shadow-xs"
                            >
                              <MultiSelectorInput
                                placeholder={pocOptions.length === 0 ? "No team members" : "Select POC..."}
                              />
                            </MultiSelectorTrigger>
                            <MultiSelectorContent>
                              <MultiSelectorList>
                                {pocOptions.map((opt) => (
                                  <MultiSelectorItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </MultiSelectorItem>
                                ))}
                              </MultiSelectorList>
                            </MultiSelectorContent>
                          </MultiSelector>
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="primaryPOC"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel
                        className={cn("flex items-center gap-1", selectedPOCs.length < 2 && "text-muted-foreground/50")}
                      >
                        <User className="size-3" /> Primary Contact
                      </FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange} disabled={selectedPOCs.length < 2}>
                          <SelectTrigger className="h-10 w-full">
                            <SelectValue placeholder="Select primary contact" />
                          </SelectTrigger>
                          <SelectContent>
                            {selectedPOCs.map((pocId) => {
                              const member = pocOptions.find((o) => o.value === pocId);
                              return (
                                <SelectItem key={pocId} value={pocId}>
                                  {member?.label || pocId}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={reset}>
                  <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
                <Button type="submit" disabled={isAddDisabled} loading={isAdding}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
            </form>
          </Form>
        </div>
      )}
    </div>
  );
}
