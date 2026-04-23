"use client";

import { useState, useCallback, memo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Plus, Trash2, Copy, Package as PackageIcon, ChevronDown, GripVertical, HelpCircle } from "lucide-react";
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
import { ITourSeason, ITourPackage, ITourAddOn } from "../schemas/tours-datastore-schema";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { BorderedCard } from "@/components/ui/bordered-card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { updatePackage, deletePackage, bulkUpsertPackages } from "@/data-access/tour-packages";
import { bulkUpdatePackageAddOns } from "@/data-access/tour-package-add-ons";
import { bulkUpsertTourAddOns, getTourAddOns } from "@/data-access/tour-add-ons";
import OptionCheckbox from "@/components/ui/option-checkbox";
import { S3ImageUpload } from "@/components/ui/s3-image-upload";
import useUser from "@/hooks/use-user";
import { toast } from "sonner";
import DurationFields from "./duration-fields";
import { handleNumericChange } from "./package-helper";
import {
  MultiSelector,
  MultiSelectorTrigger,
  MultiSelectorInput,
  MultiSelectorContent,
  MultiSelectorList,
  MultiSelectorItem,
} from "@/components/ui/multi-select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { tourCategories } from "@/data/tour-categories";
import IndicateLocked from "@/components/common/indicate-locked";
import ImportPackagesButton from "./import-package-datastore-button";

interface TourPackagesFormProps {
  initialData?: Partial<{
    id?: string;
    packages?: ITourPackage[];
    add_ons?: any[];
    tour_datastore_id?: string | null;
    is_unlinked?: boolean;
  }>;
  syncedColumns: string[];
  onNext: (data: { id?: string; packages: ITourPackage[] }) => void;
  setIsLoading?: (loading: boolean) => void;
  formRef?: React.RefObject<HTMLFormElement>;
}

// Sortable Package Component
interface SortablePackageProps {
  pkg: ITourPackage;
  packageIndex: number;
  updatePackageName: (packageIndex: number, name: string) => void;
  duplicatePackage: (packageIndex: number) => void;
  removePackage: (packageIndex: number) => void;
  packagesLength: number;
  user: any;
  getIsLocked: (packageIndex: number, name: string) => boolean;
  updatePackageField: (packageIndex: number, field: keyof ITourPackage, value: any) => void;
  handlePreferredChange: (packageIndex: number, checked: boolean) => void;
  handleComboChange: (packageIndex: number, checked: boolean) => void;
  handleAddOnChange: (packageIndex: number, addOnId: string, checked: boolean) => void;
  handleMandatoryChange: (addOnId: string, checked: boolean) => void;
  availableAddOns: any[];
  isLoadingAddOns: boolean;
  sensors: any;
  handleSeasonDragEnd: (packageIndex: number) => (event: DragEndEvent) => void;
  addSeason: (packageIndex: number) => void;
  packages: ITourPackage[];
  updateSeasonField: (packageIndex: number, seasonIndex: number, field: keyof ITourSeason, value: any) => void;
  removeSeason: (packageIndex: number, seasonIndex: number) => void;
  duplicateSeason: (packageIndex: number, seasonIndex: number) => void;
  addPvtRate: (packageIndex: number, seasonIndex: number) => void;
  removePvtRate: (packageIndex: number, seasonIndex: number, paxKey: string) => void;
  updatePvtRate: (packageIndex: number, seasonIndex: number, paxKey: string, rate: number) => void;
  addPerVehicleRate: (packageIndex: number, seasonIndex: number) => void;
  removePerVehicleRate: (packageIndex: number, seasonIndex: number, vehicleIndex: number) => void;
  updatePerVehicleRate: (
    packageIndex: number,
    seasonIndex: number,
    vehicleIndex: number,
    field: "rate" | "brand" | "capacity" | "vehicle_type",
    value: string | number
  ) => void;
  duplicatePerVehicleRate: (packageIndex: number, seasonIndex: number, vehicleIndex: number) => void;
  handleIncludesTransferChange: (packageIndex: number, checked: boolean) => void;
  removeAgeBracket: (packageIndex: number, bracket: "adult" | "teenager" | "child" | "infant") => void;
}

const SortablePackage = memo(
  ({
    pkg,
    packageIndex,
    updatePackageName,
    duplicatePackage,
    removePackage,
    packagesLength,
    user,
    getIsLocked,
    updatePackageField,
    handlePreferredChange,
    handleComboChange,
    handleAddOnChange,
    handleMandatoryChange,
    availableAddOns,
    isLoadingAddOns,
    sensors,
    handleSeasonDragEnd,
    addSeason,
    packages,
    updateSeasonField,
    removeSeason,
    duplicateSeason,
    addPvtRate,
    removePvtRate,
    updatePvtRate,
    addPerVehicleRate,
    removePerVehicleRate,
    updatePerVehicleRate,
    duplicatePerVehicleRate,
    handleIncludesTransferChange,
    removeAgeBracket,
  }: SortablePackageProps) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id: `package-${packageIndex}`,
    });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <div ref={setNodeRef} style={style}>
        <AccordionItem
          value={`package-${packageIndex}`}
          className="border-2 border-muted bg-accent/30 rounded-lg overflow-hidden"
        >
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-accent/40 transition-colors [&>svg]:hidden group">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3 flex-1">
                <div
                  {...attributes}
                  {...listeners}
                  className="cursor-grab active:cursor-grabbing touch-none"
                  onClick={(e) => e.stopPropagation()}
                >
                  <GripVertical className="h-5 w-5 text-muted-foreground" />
                </div>
                <ChevronDown className="h-6 w-6 text-muted-foreground shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                <PackageIcon className="h-5 w-5 text-muted-foreground" />
                <span className="text-base font-semibold">{pkg.name || "Unnamed Package"}</span>
                <Badge variant="secondary" className="ml-2">
                  {pkg.seasons?.length || 0} Season
                  {pkg.seasons?.length !== 1 ? "s" : ""}
                </Badge>
                {pkg.preferred && (
                  <Badge variant="default" className="ml-1">
                    Preferred
                  </Badge>
                )}
                {pkg.iscombo && (
                  <Badge variant="outline" className="ml-1">
                    Combo
                  </Badge>
                )}
                {getIsLocked(packageIndex, "tour_package.name") && <IndicateLocked />}
              </div>
              <div
                className="flex items-center gap-2"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    duplicatePackage(packageIndex);
                  }}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      duplicatePackage(packageIndex);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-7 px-2 cursor-pointer"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Duplicate
                </div>
                {packagesLength > 1 && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      removePackage(packageIndex);
                    }}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        removePackage(packageIndex);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-destructive text-destructive-foreground hover:bg-destructive/90 h-7 px-3 cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </div>
                )}
              </div>
            </div>
          </AccordionTrigger>

          <AccordionContent className="px-4 pb-4">
            <div className="space-y-4 pt-2">
              {/* Package Details Section */}
              <BorderedCard title="Package Details" collapsible>
                <div className="space-y-4">
                  {/* Package Name & Description */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Package Name *</Label>
                      <Textarea
                        placeholder="e.g., Standard Package, Premium Package"
                        value={pkg.name || ""}
                        onChange={(e) => updatePackageName(packageIndex, e.target.value)}
                        className="text-sm min-h-[60px] resize-none"
                        disabled={getIsLocked(packageIndex, "tour_package.name")}
                        rightIcon={getIsLocked(packageIndex, "tour_package.name") && <IndicateLocked />}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Description</Label>
                      <Textarea
                        placeholder="Package description..."
                        value={pkg.description || ""}
                        onChange={(e) => updatePackageField(packageIndex, "description", e.target.value)}
                        className="text-sm min-h-[60px] resize-none"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Notes */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Notes</Label>
                      <Textarea
                        placeholder="Notes for frontend display..."
                        value={pkg.notes || ""}
                        onChange={(e) => updatePackageField(packageIndex, "notes", e.target.value)}
                        className="text-sm min-h-[80px]"
                      />
                    </div>

                    {/* AI Remarks */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">AI Remarks</Label>
                      <Textarea
                        placeholder="Remarks for AI reference..."
                        value={pkg.remarks || ""}
                        onChange={(e) => updatePackageField(packageIndex, "remarks", e.target.value)}
                        className="text-sm min-h-[80px]"
                        disabled={getIsLocked(packageIndex, "tour_package.remarks")}
                        rightIcon={getIsLocked(packageIndex, "tour_package.remarks") && <IndicateLocked />}
                      />
                    </div>
                  </div>

                  {/* Package Options */}
                  <div className="grid md:grid-cols-3 gap-4">
                    <OptionCheckbox
                      id={`preferred-${packageIndex}`}
                      checked={pkg.preferred || false}
                      onCheckedChange={(checked) => handlePreferredChange(packageIndex, checked)}
                      label="Preferred Package"
                      description="Mark this package as preferred"
                    />
                    {/* <OptionCheckbox
                      id={`iscombo-${packageIndex}`}
                      checked={pkg.iscombo || false}
                      onCheckedChange={(checked) => handleComboChange(packageIndex, checked)}
                      label="Combo Package"
                      description="This package includes multiple services"
                    /> */}
                    <OptionCheckbox
                      id={`includes-transfer-${packageIndex}`}
                      checked={pkg.includes_transfer || false}
                      onCheckedChange={(checked) => handleIncludesTransferChange(packageIndex, checked)}
                      label="Includes Transfer"
                      description="Transfer service is included in this package"
                    />
                  </div>

                  {/* Duration & Max Participants & Categories*/}
                  <div className="grid md:grid-cols-3 gap-4">
                    <DurationFields pkg={pkg} updatePackageField={updatePackageField} packageIndex={packageIndex} />
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Max Participants</Label>
                      <Input
                        type="text"
                        placeholder="Maximum participants..."
                        value={pkg.max_participants || ""}
                        onChange={(e) =>
                          handleNumericChange(
                            (val) => updatePackageField(packageIndex, "max_participants", val),
                            e.target.value,
                            true
                          )
                        }
                        className="text-sm"
                      />
                    </div>

                    {/* Categories */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Categories</Label>
                      <MultiSelector
                        values={pkg.categories || []}
                        onValuesChange={(values) => updatePackageField(packageIndex, "categories", values)}
                      >
                        <MultiSelectorTrigger
                          data={tourCategories.map((cat) => ({
                            value: cat.value,
                            label: cat.label,
                          }))}
                        >
                          <MultiSelectorInput placeholder="Select categories..." />
                        </MultiSelectorTrigger>
                        <MultiSelectorContent>
                          <MultiSelectorList className="max-h-[300px]">
                            {tourCategories.map((category) => (
                              <MultiSelectorItem key={category.value} value={category.value}>
                                <div className="flex items-center gap-2 w-full">
                                  <span>{category.label}</span>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="max-w-[250px] text-xs z-[100]">
                                      <ul className="list-disc pl-3 space-y-0.5">
                                        {category.subcategories.map((sub) => (
                                          <li key={sub}>{sub}</li>
                                        ))}
                                      </ul>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              </MultiSelectorItem>
                            ))}
                          </MultiSelectorList>
                        </MultiSelectorContent>
                      </MultiSelector>
                    </div>
                  </div>

                  {/* Meeting Points */}
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Meeting Point</Label>
                      <Input
                        placeholder="Meeting point details..."
                        value={pkg.meeting_point || ""}
                        onChange={(e) => updatePackageField(packageIndex, "meeting_point", e.target.value)}
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Pickup Point</Label>
                      <Input
                        placeholder="Pickup point details..."
                        value={pkg.pickup_point || ""}
                        onChange={(e) => updatePackageField(packageIndex, "pickup_point", e.target.value)}
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Dropoff Point</Label>
                      <Input
                        placeholder="Dropoff point details..."
                        value={pkg.dropoff_point || ""}
                        onChange={(e) => updatePackageField(packageIndex, "dropoff_point", e.target.value)}
                        className="text-sm"
                      />
                    </div>
                  </div>

                  {/* Inclusions & Exclusions */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Inclusions (Comma separated)</Label>
                      <Textarea
                        placeholder="What's included in this package..."
                        value={pkg.inclusions || ""}
                        onChange={(e) => updatePackageField(packageIndex, "inclusions", e.target.value)}
                        className="text-sm min-h-[80px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Exclusions (Comma separated)</Label>
                      <Textarea
                        placeholder="What's excluded from this package..."
                        value={pkg.exclusions || ""}
                        onChange={(e) => updatePackageField(packageIndex, "exclusions", e.target.value)}
                        className="text-sm min-h-[80px]"
                      />
                    </div>
                  </div>

                  {/* Add-ons Selection */}
                  {isLoadingAddOns ? (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Select Add-ons</Label>
                      <p className="text-sm text-muted-foreground">Loading add-ons...</p>
                    </div>
                  ) : availableAddOns.length > 0 ? (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Select Add-ons</Label>
                      <div className="grid grid-cols-2 gap-3">
                        {availableAddOns.map((addOn: any) => {
                          // Find if this add-on is selected for this package
                          const selectedAddOn = pkg.selected_add_ons?.find((sa: any) =>
                            typeof sa === "string" ? sa === addOn.id : sa.id === addOn.id
                          ) as any;
                          const isChecked = !!selectedAddOn;
                          const isMandatory = isChecked && selectedAddOn?.is_mandatory === true;

                          return (
                            <div key={addOn.id} className="flex items-center gap-4">
                              <div className="flex-1">
                                <OptionCheckbox
                                  id={`addon-${packageIndex}-${addOn.id}`}
                                  checked={isChecked || false}
                                  onCheckedChange={(checked) => {
                                    handleAddOnChange(packageIndex, addOn.id, checked);
                                  }}
                                  label={addOn.name}
                                  description={
                                    addOn.ticket_only_rate_adult
                                      ? `Adult: ${addOn.ticket_only_rate_adult}${
                                          addOn.ticket_only_rate_child
                                            ? ` | Child: ${addOn.ticket_only_rate_child}`
                                            : ""
                                        }`
                                      : ""
                                  }
                                />
                              </div>
                              {/* Only show mandatory checkbox when add-on is selected */}
                              {isChecked && (
                                <div className="flex items-center gap-2 pt-1">
                                  <Checkbox
                                    id={`mandatory-${packageIndex}-${addOn.id}`}
                                    checked={isMandatory}
                                    onCheckedChange={(checked) => {
                                      handleMandatoryChange(addOn.id, checked === true);
                                    }}
                                  />
                                  <Label
                                    htmlFor={`mandatory-${packageIndex}-${addOn.id}`}
                                    className="text-xs text-muted-foreground cursor-pointer"
                                  >
                                    Mandatory
                                  </Label>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              </BorderedCard>

              {/* Images Section */}
              <BorderedCard title="Package Images" collapsible>
                <S3ImageUpload
                  images={pkg.images || []}
                  onChange={(images) => updatePackageField(packageIndex, "images", images)}
                  userId={user?.id || ""}
                  prefix="tour-packages"
                  disabled={!user?.id || getIsLocked(packageIndex, "tour_package.images")}
                />
              </BorderedCard>

              {/* Age Policy Section */}
              <BorderedCard title="Age Policy" collapsible>
                <div className="space-y-3">
                  <div className="gap-4 grid lg:grid-cols-2">
                    {/* Adult */}
                    {pkg.age_policy?.adult ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">Adult</Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAgeBracket(packageIndex, "adult")}
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
                              value={pkg.age_policy?.adult?.min_age ?? ""}
                              onChange={(e) => {
                                handleNumericChange(
                                  (val) => {
                                    const updated = {
                                      ...pkg.age_policy,
                                      adult: {
                                        ...pkg.age_policy?.adult,
                                        min_age: val ?? 0,
                                        max_age: pkg.age_policy?.adult?.max_age || 99,
                                      },
                                    };
                                    updatePackageField(packageIndex, "age_policy", updated);
                                  },
                                  e.target.value,
                                  true
                                );
                              }}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-0.5">
                            <Label className="text-xs text-muted-foreground">Max Age</Label>
                            <Input
                              type="text"
                              placeholder="To"
                              value={pkg.age_policy?.adult?.max_age ?? ""}
                              onChange={(e) => {
                                handleNumericChange(
                                  (val) => {
                                    const updated = {
                                      ...pkg.age_policy,
                                      adult: {
                                        ...pkg.age_policy?.adult,
                                        min_age: pkg.age_policy?.adult?.min_age || 0,
                                        max_age: val ?? 99,
                                      },
                                    };
                                    updatePackageField(packageIndex, "age_policy", updated);
                                  },
                                  e.target.value,
                                  true
                                );
                              }}
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {/* Teenager */}
                    {pkg.age_policy?.teenager ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">Teenager</Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAgeBracket(packageIndex, "teenager")}
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
                              value={pkg.age_policy?.teenager?.min_age ?? ""}
                              onChange={(e) => {
                                handleNumericChange(
                                  (val) => {
                                    const updated = {
                                      ...pkg.age_policy,
                                      teenager: {
                                        ...pkg.age_policy?.teenager,
                                        min_age: val ?? 0,
                                        max_age: pkg.age_policy?.teenager?.max_age || 0,
                                      },
                                    };
                                    updatePackageField(packageIndex, "age_policy", updated);
                                  },
                                  e.target.value,
                                  true
                                );
                              }}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-0.5">
                            <Label className="text-xs text-muted-foreground">Max Age</Label>
                            <Input
                              type="text"
                              placeholder="To"
                              value={pkg.age_policy?.teenager?.max_age ?? ""}
                              onChange={(e) => {
                                handleNumericChange(
                                  (val) => {
                                    const updated = {
                                      ...pkg.age_policy,
                                      teenager: {
                                        ...pkg.age_policy?.teenager,
                                        min_age: pkg.age_policy?.teenager?.min_age || 0,
                                        max_age: val ?? 0,
                                      },
                                    };
                                    updatePackageField(packageIndex, "age_policy", updated);
                                  },
                                  e.target.value,
                                  true
                                );
                              }}
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {/* Child */}
                    {pkg.age_policy?.child ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">Child</Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAgeBracket(packageIndex, "child")}
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
                              value={pkg.age_policy?.child?.min_age ?? ""}
                              onChange={(e) => {
                                handleNumericChange(
                                  (val) => {
                                    const updated = {
                                      ...pkg.age_policy,
                                      child: {
                                        ...pkg.age_policy?.child,
                                        min_age: val ?? 0,
                                        max_age: pkg.age_policy?.child?.max_age || 0,
                                      },
                                    };
                                    updatePackageField(packageIndex, "age_policy", updated);
                                  },
                                  e.target.value,
                                  true
                                );
                              }}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-0.5">
                            <Label className="text-xs text-muted-foreground">Max Age</Label>
                            <Input
                              type="text"
                              placeholder="To"
                              value={pkg.age_policy?.child?.max_age ?? ""}
                              onChange={(e) => {
                                handleNumericChange(
                                  (val) => {
                                    const updated = {
                                      ...pkg.age_policy,
                                      child: {
                                        ...pkg.age_policy?.child,
                                        min_age: pkg.age_policy?.child?.min_age || 0,
                                        max_age: val ?? 0,
                                      },
                                    };
                                    updatePackageField(packageIndex, "age_policy", updated);
                                  },
                                  e.target.value,
                                  true
                                );
                              }}
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {/* Infant */}
                    {pkg.age_policy?.infant ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">Infant</Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAgeBracket(packageIndex, "infant")}
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
                              value={pkg.age_policy?.infant?.min_age ?? ""}
                              onChange={(e) => {
                                handleNumericChange(
                                  (val) => {
                                    const updated = {
                                      ...pkg.age_policy,
                                      infant: {
                                        ...pkg.age_policy?.infant,
                                        min_age: val ?? 0,
                                        max_age: pkg.age_policy?.infant?.max_age || 0,
                                      },
                                    };
                                    updatePackageField(packageIndex, "age_policy", updated);
                                  },
                                  e.target.value,
                                  true
                                );
                              }}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-0.5">
                            <Label className="text-xs text-muted-foreground">Max Age</Label>
                            <Input
                              type="text"
                              placeholder="To"
                              value={pkg.age_policy?.infant?.max_age ?? ""}
                              onChange={(e) => {
                                handleNumericChange(
                                  (val) => {
                                    const updated = {
                                      ...pkg.age_policy,
                                      infant: {
                                        ...pkg.age_policy?.infant,
                                        min_age: pkg.age_policy?.infant?.min_age || 0,
                                        max_age: val ?? 0,
                                      },
                                    };
                                    updatePackageField(packageIndex, "age_policy", updated);
                                  },
                                  e.target.value,
                                  true
                                );
                              }}
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {/* Add Age Bracket Buttons */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                    {!pkg.age_policy?.adult && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          updatePackageField(packageIndex, "age_policy", {
                            ...pkg.age_policy,
                            adult: { min_age: 18, max_age: 99 },
                          });
                        }}
                        className="h-8"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Adult
                      </Button>
                    )}
                    {!pkg.age_policy?.teenager && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          updatePackageField(packageIndex, "age_policy", {
                            ...pkg.age_policy,
                            teenager: { min_age: 13, max_age: 17 },
                          });
                        }}
                        className="h-8"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Teenager
                      </Button>
                    )}
                    {!pkg.age_policy?.child && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          updatePackageField(packageIndex, "age_policy", {
                            ...pkg.age_policy,
                            child: { min_age: 2, max_age: 12 },
                          });
                        }}
                        className="h-8"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Child
                      </Button>
                    )}
                    {!pkg.age_policy?.infant && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          updatePackageField(packageIndex, "age_policy", {
                            ...pkg.age_policy,
                            infant: { min_age: 0, max_age: 1 },
                          });
                        }}
                        className="h-8"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Infant
                      </Button>
                    )}
                  </div>
                </div>
              </BorderedCard>

              {/* Operational Hours */}
              <BorderedCard title="Operational Hours" collapsible>
                <div className="space-y-2">
                  {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((dayName) => {
                    const dayHours = pkg.operational_hours?.find((h) => h.day === dayName);

                    if (!dayHours) {
                      return (
                        <div key={dayName} className="flex gap-2 items-center p-2 border rounded-lg bg-muted/30">
                          <div className="w-24 text-sm font-medium text-muted-foreground">{dayName}</div>
                          <div className="flex-1 text-sm text-muted-foreground text-center">Not configured</div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const updated = [
                                ...(pkg.operational_hours || []),
                                {
                                  day: dayName,
                                  time_start: "09:00",
                                  time_end: "17:00",
                                },
                              ];
                              updatePackageField(packageIndex, "operational_hours", updated);
                            }}
                            className="h-8"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add
                          </Button>
                        </div>
                      );
                    }

                    return (
                      <div key={dayName} className="flex gap-2 items-center p-2 border rounded-lg">
                        <div className="w-24 text-sm font-medium">{dayName}</div>
                        <Input
                          type="time"
                          value={dayHours.time_start}
                          onChange={(e) => {
                            const updated =
                              pkg.operational_hours?.map((h) =>
                                h.day === dayName ? { ...h, time_start: e.target.value } : h
                              ) || [];
                            updatePackageField(packageIndex, "operational_hours", updated);
                          }}
                          className="text-sm w-32"
                        />
                        <span className="text-muted-foreground">to</span>
                        <Input
                          type="time"
                          value={dayHours.time_end}
                          onChange={(e) => {
                            const updated =
                              pkg.operational_hours?.map((h) =>
                                h.day === dayName ? { ...h, time_end: e.target.value } : h
                              ) || [];
                            updatePackageField(packageIndex, "operational_hours", updated);
                          }}
                          className="text-sm w-32"
                        />
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button type="button" variant="outline" size="sm" className="h-8">
                              <Copy className="h-3 w-3 mr-1" />
                              Copy
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64">
                            <div className="space-y-2">
                              <div className="text-sm font-medium">Copy to days:</div>
                              {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
                                .filter((d) => d !== dayName)
                                .map((targetDay) => (
                                  <div key={targetDay} className="flex items-center gap-2">
                                    <Checkbox
                                      id={`copy-${dayName}-${targetDay}`}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          const updated =
                                            pkg.operational_hours?.filter((h) => h.day !== targetDay) || [];
                                          updated.push({
                                            day: targetDay,
                                            time_start: dayHours.time_start,
                                            time_end: dayHours.time_end,
                                          });
                                          updatePackageField(
                                            packageIndex,
                                            "operational_hours",
                                            updated.sort((a, b) => {
                                              const days = [
                                                "Monday",
                                                "Tuesday",
                                                "Wednesday",
                                                "Thursday",
                                                "Friday",
                                                "Saturday",
                                                "Sunday",
                                              ];
                                              return days.indexOf(a.day) - days.indexOf(b.day);
                                            })
                                          );
                                        }
                                      }}
                                    />
                                    <Label htmlFor={`copy-${dayName}-${targetDay}`} className="text-sm cursor-pointer">
                                      {targetDay}
                                    </Label>
                                  </div>
                                ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            const updated = pkg.operational_hours?.filter((h) => h.day !== dayName) || [];
                            updatePackageField(packageIndex, "operational_hours", updated);
                          }}
                          className="h-8"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </BorderedCard>

              {/* Seasons Section */}
              <BorderedCard title="Seasonal Pricing" collapsible>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleSeasonDragEnd(packageIndex)}
                >
                  <SortableContext
                    items={pkg.seasons?.map((_, idx) => `season-${packageIndex}-${idx}`) || []}
                    strategy={verticalListSortingStrategy}
                  >
                    <Accordion type="multiple" className="space-y-3">
                      {pkg.seasons?.map((season, seasonIndex) => (
                        <SortableSeason
                          key={`season-${packageIndex}-${seasonIndex}`}
                          season={season}
                          packageIndex={packageIndex}
                          seasonIndex={seasonIndex}
                          packages={packages}
                          updateSeasonField={updateSeasonField}
                          removeSeason={removeSeason}
                          duplicateSeason={duplicateSeason}
                          addPvtRate={addPvtRate}
                          removePvtRate={removePvtRate}
                          updatePvtRate={updatePvtRate}
                          addPerVehicleRate={addPerVehicleRate}
                          removePerVehicleRate={removePerVehicleRate}
                          updatePerVehicleRate={updatePerVehicleRate}
                          duplicatePerVehicleRate={duplicatePerVehicleRate}
                        />
                      ))}
                    </Accordion>
                  </SortableContext>
                </DndContext>

                {/* Add Season Button */}
                <div className="flex justify-center mt-4">
                  <Button
                    type="button"
                    variant="dashed"
                    onClick={() => addSeason(packageIndex)}
                    className="w-full max-w-md border-dashed border-2"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Season
                  </Button>
                </div>
              </BorderedCard>
            </div>
          </AccordionContent>
        </AccordionItem>
      </div>
    );
  }
);

SortablePackage.displayName = "SortablePackage";

// Sortable Season Component
interface SortableSeasonProps {
  season: ITourSeason;
  packageIndex: number;
  seasonIndex: number;
  packages: ITourPackage[];
  updateSeasonField: (packageIndex: number, seasonIndex: number, field: keyof ITourSeason, value: any) => void;
  removeSeason: (packageIndex: number, seasonIndex: number) => void;
  duplicateSeason: (packageIndex: number, seasonIndex: number) => void;
  addPvtRate: (packageIndex: number, seasonIndex: number) => void;
  removePvtRate: (packageIndex: number, seasonIndex: number, paxKey: string) => void;
  updatePvtRate: (packageIndex: number, seasonIndex: number, paxKey: string, rate: number) => void;
  addPerVehicleRate: (packageIndex: number, seasonIndex: number) => void;
  removePerVehicleRate: (packageIndex: number, seasonIndex: number, vehicleIndex: number) => void;
  updatePerVehicleRate: (
    packageIndex: number,
    seasonIndex: number,
    vehicleIndex: number,
    field: "rate" | "brand" | "capacity" | "vehicle_type",
    value: string | number
  ) => void;
  duplicatePerVehicleRate: (packageIndex: number, seasonIndex: number, vehicleIndex: number) => void;
}

const SortableSeason = memo(
  ({
    season,
    packageIndex,
    seasonIndex,
    packages,
    updateSeasonField,
    removeSeason,
    duplicateSeason,
    addPvtRate,
    removePvtRate,
    updatePvtRate,
    addPerVehicleRate,
    removePerVehicleRate,
    updatePerVehicleRate,
    duplicatePerVehicleRate,
  }: SortableSeasonProps) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id: `season-${packageIndex}-${seasonIndex}`,
    });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    const pkg = packages[packageIndex];

    // Helper function to generate age-based rate fields
    const generateAgeRateFields = (rateType: "ticket_only" | "sic") => {
      const agePolicy = pkg.age_policy || {};
      const fields = [];

      if (agePolicy.adult) {
        const ageRange =
          agePolicy.adult.min_age && agePolicy.adult.max_age
            ? ` (${agePolicy.adult.min_age}-${agePolicy.adult.max_age} years)`
            : "";
        fields.push({
          label: `${rateType === "ticket_only" ? "Ticket Only" : "SIC"} Adult${ageRange}`,
          field: `${rateType}_rate_adult`,
          value: (season as any)[`${rateType}_rate_adult`],
        });
      }

      if (agePolicy.teenager) {
        const ageRange =
          agePolicy.teenager.min_age && agePolicy.teenager.max_age
            ? ` (${agePolicy.teenager.min_age}-${agePolicy.teenager.max_age} years)`
            : "";
        fields.push({
          label: `${rateType === "ticket_only" ? "Ticket Only" : "SIC"} Teenager${ageRange}`,
          field: `${rateType}_rate_teenager`,
          value: (season as any)[`${rateType}_rate_teenager`],
        });
      }

      if (agePolicy.child) {
        const ageRange =
          agePolicy.child.min_age && agePolicy.child.max_age
            ? ` (${agePolicy.child.min_age}-${agePolicy.child.max_age} years)`
            : "";
        fields.push({
          label: `${rateType === "ticket_only" ? "Ticket Only" : "SIC"} Child${ageRange}`,
          field: `${rateType}_rate_child`,
          value: (season as any)[`${rateType}_rate_child`],
        });
      }

      if (agePolicy.infant) {
        const ageRange =
          agePolicy.infant.min_age && agePolicy.infant.max_age
            ? ` (${agePolicy.infant.min_age}-${agePolicy.infant.max_age} years)`
            : "";
        fields.push({
          label: `${rateType === "ticket_only" ? "Ticket Only" : "SIC"} Infant${ageRange}`,
          field: `${rateType}_rate_infant`,
          value: (season as any)[`${rateType}_rate_infant`],
        });
      }

      return fields;
    };

    return (
      <div ref={setNodeRef} style={style}>
        <AccordionItem
          value={`season-${packageIndex}-${seasonIndex}`}
          className="border-2 border-border bg-card rounded-lg overflow-hidden"
        >
          <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-accent/20 transition-colors [&>svg]:hidden group">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3 flex-1">
                <div
                  {...attributes}
                  {...listeners}
                  className="cursor-grab active:cursor-grabbing touch-none"
                  onClick={(e) => e.stopPropagation()}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                </div>
                <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                <span className="text-sm font-semibold">{season.dates || "Unnamed Season"}</span>
              </div>
              <div
                className="flex items-center gap-2"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    duplicateSeason(packageIndex, seasonIndex);
                  }}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      duplicateSeason(packageIndex, seasonIndex);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-7 px-2 cursor-pointer"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </div>
                {(pkg.seasons?.length || 0) > 1 && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSeason(packageIndex, seasonIndex);
                    }}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        removeSeason(packageIndex, seasonIndex);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-destructive text-destructive-foreground hover:bg-destructive/90 h-7 px-3 cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </div>
                )}
              </div>
            </div>
          </AccordionTrigger>

          <AccordionContent className="px-3 pb-3">
            <div className="space-y-3 pt-2">
              {/* Season Dates */}
              <div className="space-y-1  mb-10">
                <Label className="text-sm font-medium">Season Dates *</Label>
                <DateRangePicker
                  value={season.dates || ""}
                  onChange={(value) => updateSeasonField(packageIndex, seasonIndex, "dates", value)}
                  placeholder="Select season dates"
                  className="h-9"
                />
              </div>

              {/* Ticket Only & SIC Rates - Only show if age policy is defined */}
              {Object.keys(pkg.age_policy || {}).length > 0 && (
                <div className="border-2 border-border/50 rounded-lg p-3 bg-accent/15">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                    Ticket Only Rates
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {generateAgeRateFields("ticket_only").map((field, index) => (
                      <div key={field.field} className="space-y-1">
                        <Label className="text-xs font-medium">{field.label}</Label>
                        <Input
                          type="text"
                          placeholder="-"
                          value={field.value || ""}
                          onChange={(e) =>
                            handleNumericChange(
                              (val) =>
                                updateSeasonField(packageIndex, seasonIndex, field.field as keyof ITourSeason, val),
                              e.target.value
                            )
                          }
                          className="h-8 text-sm"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 mt-4">
                    SIC Rates
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {generateAgeRateFields("sic").map((field, index) => (
                      <div key={field.field} className="space-y-1">
                        <Label className="text-xs font-medium">{field.label}</Label>
                        <Input
                          type="text"
                          placeholder="-"
                          value={field.value || ""}
                          onChange={(e) =>
                            handleNumericChange(
                              (val) =>
                                updateSeasonField(packageIndex, seasonIndex, field.field as keyof ITourSeason, val),
                              e.target.value
                            )
                          }
                          className="h-8 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Private Rates Section */}
              <div className="border-2 border-border/50 rounded-lg p-3 bg-accent/15">
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Private Rates</div>
                  <div className="grid grid-cols-12 gap-2 items-end">
                    {Object.entries(season.pvt_rate || {}).map(([groupSize, rate]) => (
                      <div key={groupSize}>
                        <div className="flex items-center justify-between px-0.5">
                          <Label className="font-medium text-xs">{groupSize}</Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => removePvtRate(packageIndex, seasonIndex, groupSize)}
                            className="opacity-50 hover:opacity-100"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="-"
                          value={rate || ""}
                          onChange={(e) =>
                            updatePvtRate(packageIndex, seasonIndex, groupSize, parseFloat(e.target.value) || 0)
                          }
                          className="h-8 text-sm"
                        />
                      </div>
                    ))}
                    <div className="col-span-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="dashed"
                        onClick={() => addPvtRate(packageIndex, seasonIndex)}
                      >
                        <Plus /> Add Pax
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Per Vehicle Rates Section */}
              <div className="border-2 border-border/50 rounded-lg p-3 bg-accent/15">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Per Vehicle Rates
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="dashed"
                      onClick={() => addPerVehicleRate(packageIndex, seasonIndex)}
                    >
                      <Plus /> Add Vehicle
                    </Button>
                  </div>

                  {season.per_vehicle_rate && season.per_vehicle_rate.length > 0 && (
                    <div className="space-y-2">
                      {season.per_vehicle_rate.map((vehicle, vehicleIndex) => (
                        <div key={vehicleIndex} className="grid grid-cols-12 gap-2 items-end">
                          <div className="col-span-3 space-y-1">
                            <Label className="text-xs">Vehicle Type</Label>
                            <Input
                              placeholder="e.g., Sedan"
                              value={vehicle.vehicle_type || ""}
                              onChange={(e) =>
                                updatePerVehicleRate(
                                  packageIndex,
                                  seasonIndex,
                                  vehicleIndex,
                                  "vehicle_type",
                                  e.target.value
                                )
                              }
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="col-span-3 space-y-1">
                            <Label className="text-xs">Brand</Label>
                            <Input
                              placeholder="e.g., Toyota"
                              value={vehicle.brand || ""}
                              onChange={(e) =>
                                updatePerVehicleRate(packageIndex, seasonIndex, vehicleIndex, "brand", e.target.value)
                              }
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="col-span-3 space-y-1">
                            <Label className="text-xs">Capacity</Label>
                            <Input
                              placeholder="e.g., 4 seater"
                              value={vehicle.capacity || ""}
                              onChange={(e) =>
                                updatePerVehicleRate(
                                  packageIndex,
                                  seasonIndex,
                                  vehicleIndex,
                                  "capacity",
                                  e.target.value
                                )
                              }
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="col-span-2 space-y-1">
                            <Label className="text-xs">Rate</Label>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="-"
                              value={vehicle.rate || ""}
                              onChange={(e) =>
                                updatePerVehicleRate(
                                  packageIndex,
                                  seasonIndex,
                                  vehicleIndex,
                                  "rate",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="col-span-1 flex justify-end items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon-sm"
                              onClick={() => duplicatePerVehicleRate(packageIndex, seasonIndex, vehicleIndex)}
                            >
                              <Copy />
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon-sm"
                              onClick={() => removePerVehicleRate(packageIndex, seasonIndex, vehicleIndex)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Total Rate */}
              <div className="border-2 border-border/50 rounded-lg p-3 bg-accent/15">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Total Rate</Label>
                  <Input
                    type="text"
                    placeholder="Enter total rate for this season"
                    value={season.total_rate || ""}
                    onChange={(e) =>
                      handleNumericChange(
                        (val) => updateSeasonField(packageIndex, seasonIndex, "total_rate", val),
                        e.target.value
                      )
                    }
                    className="text-sm"
                  />
                </div>
              </div>

              <div className="grid gap-4 grid-cols-2">
                {/* Exception Rules */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Exception Rules</Label>
                  <Textarea
                    placeholder="e.g., No tours on public holidays"
                    value={season.exception_rules || ""}
                    onChange={(e) => updateSeasonField(packageIndex, seasonIndex, "exception_rules", e.target.value)}
                    className="text-sm min-h-[60px]"
                  />
                </div>

                {/* Blackout Dates */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Blackout Dates</Label>
                  <Textarea
                    placeholder="e.g., Dec 25-26, Jan 1, or specific date ranges"
                    value={season.blackout_dates || ""}
                    onChange={(e) => updateSeasonField(packageIndex, seasonIndex, "blackout_dates", e.target.value)}
                    className="text-sm min-h-[60px]"
                  />
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </div>
    );
  }
);

SortableSeason.displayName = "SortableSeason";

export default function TourPackagesForm({
  initialData,
  syncedColumns,
  onNext,
  setIsLoading,
  formRef,
}: TourPackagesFormProps) {
  const { user } = useUser();

  const [packages, setPackages] = useState<ITourPackage[]>(() => {
    if (initialData?.packages && initialData.packages.length > 0) {
      // Ensure all packages have required fields with defaults and sort by order
      return initialData.packages
        .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
        .map((pkg: any, idx: number) => ({
          ...pkg,
          preferred: pkg.preferred ?? false,
          iscombo: pkg.iscombo ?? false,
          includes_transfer: pkg.includes_transfer ?? false,
          description: pkg.description ?? "",
          remarks: pkg.remarks ?? "",
          child_policy: pkg.child_policy ?? "",
          // Preserve selected_add_ons with is_mandatory - ensure proper structure
          selected_add_ons: (pkg.selected_add_ons || []).map((addOn: any) => ({
            ...(typeof addOn === "string" ? { id: addOn } : addOn),
            is_mandatory: typeof addOn === "string" ? false : (addOn.is_mandatory ?? false),
          })),
          order: pkg.order ?? idx,
          // Keep duration as JSONB structure
          duration: pkg.duration || {},
          seasons: (pkg.seasons || [])
            .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
            .map((season: any, seasonIdx: number) => ({
              ...season,
              order: season.order ?? seasonIdx,
            })),
        })) as ITourPackage[];
    }

    return [
      {
        id: crypto.randomUUID(),
        tour_id: initialData?.id || "",
        name: "Standard Package",
        description: "",
        remarks: "",
        child_policy: "",
        preferred: false,
        iscombo: false,
        includes_transfer: false,
        order: 0,
        selected_add_ons: [],
        seasons: [
          {
            dates: "All Season",
            ticket_only_rate_adult: undefined,
            ticket_only_rate_child: undefined,
            sic_rate_adult: undefined,
            sic_rate_child: undefined,
            pvt_rate: {},
            per_vehicle_rate: [],
            exception_rules: "",
            order: 0,
          },
        ],
      },
    ];
  });

  const [openPackages, setOpenPackages] = useState<string[]>([]);

  // Fetch add-ons directly from database to ensure latest data
  const [availableAddOns, setAvailableAddOns] = useState<any[]>(initialData?.add_ons || []);
  const [isLoadingAddOns, setIsLoadingAddOns] = useState(false);

  // Fetch add-ons when component mounts or tour ID changes
  useEffect(() => {
    const fetchAddOns = async () => {
      if (initialData?.id) {
        setIsLoadingAddOns(true);
        try {
          const { data, error } = await getTourAddOns(initialData.id);
          if (error) {
            console.error("Error fetching add-ons:", error);
            toast.error("Failed to load add-ons");
          } else {
            setAvailableAddOns(data || []);
          }
        } catch (err) {
          console.error("Error fetching add-ons:", err);
        } finally {
          setIsLoadingAddOns(false);
        }
      }
    };
    fetchAddOns();
  }, [initialData?.id]);

  const onSubmit = async () => {
    setIsLoading?.(true);
    try {
      // Prepare packages for bulk upsert - remove virtual fields and ensure order is set
      const packagesForUpsert = packages.map((pkg: any, idx: number) => {
        const { selected_add_ons, tour_package_add_ons, ...packageData } = pkg;

        const data = {
          ...packageData,
          tour_id: initialData?.id || pkg.tour_id,
          order: pkg.order !== undefined ? pkg.order : idx, // Ensure order is always set
        };
        // Generate UUID for new packages (without id or with empty string id)
        if (!data.id || data.id === "") {
          data.id = crypto.randomUUID();
        }
        return data;
      });

      // Bulk upsert all packages in one operation
      const result = await bulkUpsertPackages(packagesForUpsert);
      if (result.error) throw new Error(result.error);

      const updatedPackages = result.data || [];

      // Prepare all package add-ons for bulk update (single DB call instead of N calls)
      const packageAddOns = updatedPackages.map((savedPkg: any, idx: number) => {
        const pkg = packages[idx];

        // Pass full add-on objects with is_mandatory field
        const addOns = (pkg.selected_add_ons || []).map((addOn: any) => {
          if (typeof addOn === "string") {
            return { id: addOn, is_mandatory: false };
          }
          return { id: addOn.id, is_mandatory: addOn.is_mandatory || false };
        });

        return {
          packageId: savedPkg.id,
          addOns,
        };
      });

      // Bulk update all add-ons in one operation
      const addOnResult = await bulkUpdatePackageAddOns(packageAddOns);
      if (addOnResult.error) {
        console.error("Error updating package add-ons:", addOnResult.error);
      }

      // Merge selected_add_ons back into the response
      const finalPackages = updatedPackages.map((savedPkg: any, idx: number) => ({
        ...savedPkg,
        selected_add_ons: packages[idx].selected_add_ons,
      }));

      // Update local state with saved packages (including new IDs)
      setPackages(finalPackages);

      const submitData = {
        id: initialData?.id,
        packages: finalPackages,
      };

      // Let parent handle loading state and dialog close
      await onNext(submitData);
    } catch (error) {
      console.error("Error saving packages:", error);
      toast.error("Failed to save packages");
      setIsLoading?.(false);
      throw error; // Re-throw so parent can handle the error state
    }
  };

  // Package operations
  const addPackage = useCallback(() => {
    setPackages((prevPackages) => {
      const newPackage: ITourPackage = {
        id: crypto.randomUUID(),
        tour_id: initialData?.id || "",
        name: `Package ${prevPackages.length + 1}`,
        description: "",
        remarks: "",
        child_policy: "",
        preferred: false,
        iscombo: false,
        includes_transfer: false,
        selected_add_ons: [],
        order: prevPackages.length, // Set order to current length (0-indexed)
        seasons: [
          {
            dates: "All Season",
            ticket_only_rate_adult: undefined,
            ticket_only_rate_child: undefined,
            sic_rate_adult: undefined,
            sic_rate_child: undefined,
            pvt_rate: {},
            per_vehicle_rate: [],
            exception_rules: "",
            order: 0,
          },
        ],
      };
      const newPackages = [...prevPackages, newPackage];
      // Auto-open the newly added package
      setOpenPackages((prev) => [...prev, `package-${prevPackages.length}`]);
      return newPackages;
    });
  }, [initialData?.id]);

  const removePackage = useCallback(
    async (packageIndex: number) => {
      const packageToDelete = packages[packageIndex];

      if (packages.length <= 1) return;

      // If package has an ID, delete from database
      if (packageToDelete.id) {
        try {
          const result = await deletePackage(packageToDelete.id);
          if (result.error) {
            toast.error("Failed to delete package");
            return;
          }
          toast.success("Package deleted successfully");
        } catch (error) {
          console.error("Error deleting package:", error);
          toast.error("Failed to delete package");
          return;
        }
      }

      // Update local state
      setPackages((prevPackages) => prevPackages.filter((_, i) => i !== packageIndex));

      // Update accordion state - remove deleted package and adjust indices
      setOpenPackages((prevOpen) =>
        prevOpen
          .filter((value) => value !== `package-${packageIndex}`)
          .map((value) => {
            const match = value.match(/^package-(\d+)$/);
            if (match) {
              const index = parseInt(match[1]);
              if (index > packageIndex) {
                return `package-${index - 1}`;
              }
            }
            return value;
          })
      );
    },
    [packages]
  );

  const duplicatePackage = useCallback((packageIndex: number) => {
    setPackages((prevPackages) => {
      const packageToDuplicate = prevPackages[packageIndex];
      // Deep clone to avoid reference issues with nested objects
      const duplicated: ITourPackage = JSON.parse(JSON.stringify(packageToDuplicate));
      duplicated.id = crypto.randomUUID(); // Generate new UUID for duplicated package
      duplicated.name = `${packageToDuplicate.name} (Copy)`;
      duplicated.tour_package_datastore_id = null;
      duplicated.is_unlinked = false;
      return [...prevPackages, duplicated];
    });
  }, []);

  const updatePackageName = useCallback((packageIndex: number, name: string) => {
    setPackages((prevPackages) => {
      const updated = [...prevPackages];
      updated[packageIndex].name = name;
      return updated;
    });
  }, []);

  const updatePackageField = useCallback((packageIndex: number, field: keyof ITourPackage, value: any) => {
    setPackages((prevPackages) => {
      const updated = [...prevPackages];
      updated[packageIndex] = {
        ...updated[packageIndex],
        [field]: value,
      };
      return updated;
    });
  }, []);

  // Helper to remove age bracket and clear associated rate values from all seasons
  const removeAgeBracket = useCallback((packageIndex: number, bracket: "adult" | "teenager" | "child" | "infant") => {
    setPackages((prevPackages) => {
      const updated = [...prevPackages];
      const pkg = { ...updated[packageIndex] };

      // Remove the bracket from age_policy
      const newAgePolicy = { ...pkg.age_policy };
      delete newAgePolicy[bracket];
      pkg.age_policy = newAgePolicy;

      // Clear corresponding rate values from all seasons
      if (pkg.seasons) {
        pkg.seasons = pkg.seasons.map((season) => {
          const updatedSeason = { ...season };
          // Clear ticket_only and sic rates for this bracket
          delete (updatedSeason as any)[`ticket_only_rate_${bracket}`];
          delete (updatedSeason as any)[`sic_rate_${bracket}`];
          return updatedSeason;
        });
      }

      updated[packageIndex] = pkg;
      return updated;
    });
  }, []);

  // Season operations
  const addSeason = useCallback((packageIndex: number) => {
    setPackages((prevPackages) => {
      const updated = [...prevPackages];
      const currentSeasons = updated[packageIndex].seasons || [];
      updated[packageIndex].seasons = [
        ...currentSeasons,
        {
          dates: `Season ${currentSeasons.length + 1}`,
          ticket_only_rate_adult: undefined,
          ticket_only_rate_child: undefined,
          ticket_only_rate_teenager: undefined,
          ticket_only_rate_infant: undefined,
          sic_rate_adult: undefined,
          sic_rate_child: undefined,
          sic_rate_teenager: undefined,
          sic_rate_infant: undefined,
          pvt_rate: {},
          per_vehicle_rate: [],
          exception_rules: "",
        },
      ];
      return updated;
    });
  }, []);

  const removeSeason = useCallback((packageIndex: number, seasonIndex: number) => {
    setPackages((prevPackages) => {
      const updated = [...prevPackages];
      const currentSeasons = updated[packageIndex].seasons || [];
      if (currentSeasons.length <= 1) return prevPackages;
      updated[packageIndex].seasons = currentSeasons.filter((_, i) => i !== seasonIndex);
      return updated;
    });
  }, []);

  const duplicateSeason = useCallback((packageIndex: number, seasonIndex: number) => {
    setPackages((prevPackages) => {
      const updated = [...prevPackages];
      const currentSeasons = updated[packageIndex].seasons || [];
      const seasonToDuplicate = currentSeasons[seasonIndex];
      updated[packageIndex].seasons = [
        ...currentSeasons,
        {
          ...seasonToDuplicate,
          dates: `${seasonToDuplicate.dates} (Copy)`,
        },
      ];
      return updated;
    });
  }, []);

  const updateSeasonField = useCallback(
    (packageIndex: number, seasonIndex: number, field: keyof ITourSeason, value: any) => {
      setPackages((prevPackages) => {
        const updated = [...prevPackages];
        const seasons = updated[packageIndex].seasons || [];
        seasons[seasonIndex] = {
          ...seasons[seasonIndex],
          [field]: value,
        };
        updated[packageIndex].seasons = seasons;
        return updated;
      });
    },
    []
  );

  // Private rate operations
  const addPvtRate = useCallback((packageIndex: number, seasonIndex: number) => {
    setPackages((prevPackages) => {
      const updated = [...prevPackages];
      const seasons = updated[packageIndex].seasons || [];
      const currentPvtRates = seasons[seasonIndex].pvt_rate || {};
      const nextPaxNumber = Object.keys(currentPvtRates).length + 1;
      seasons[seasonIndex].pvt_rate = {
        ...currentPvtRates,
        [`${nextPaxNumber}pax`]: 0,
      };
      updated[packageIndex].seasons = seasons;
      return updated;
    });
  }, []);

  const removePvtRate = useCallback((packageIndex: number, seasonIndex: number, paxKey: string) => {
    setPackages((prevPackages) => {
      const updated = [...prevPackages];
      const seasons = updated[packageIndex].seasons || [];
      const currentPvtRates = { ...seasons[seasonIndex].pvt_rate };
      delete currentPvtRates[paxKey];
      seasons[seasonIndex].pvt_rate = currentPvtRates;
      updated[packageIndex].seasons = seasons;
      return updated;
    });
  }, []);

  const updatePvtRate = useCallback((packageIndex: number, seasonIndex: number, paxKey: string, rate: number) => {
    setPackages((prevPackages) => {
      const updated = [...prevPackages];
      const seasons = updated[packageIndex].seasons || [];
      const currentPvtRates = seasons[seasonIndex].pvt_rate || {};
      currentPvtRates[paxKey] = rate;
      seasons[seasonIndex].pvt_rate = currentPvtRates;
      updated[packageIndex].seasons = seasons;
      return updated;
    });
  }, []);

  // Per vehicle rate operations
  const addPerVehicleRate = useCallback((packageIndex: number, seasonIndex: number) => {
    setPackages((prevPackages) => {
      const updated = [...prevPackages];
      const seasons = updated[packageIndex].seasons || [];
      const currentPerVehicleRates = seasons[seasonIndex].per_vehicle_rate || [];
      seasons[seasonIndex].per_vehicle_rate = [
        ...currentPerVehicleRates,
        {
          brand: "",
          vehicle_type: "",
          rate: 0,
          capacity: "",
        },
      ];
      updated[packageIndex].seasons = seasons;
      return updated;
    });
  }, []);

  const removePerVehicleRate = useCallback((packageIndex: number, seasonIndex: number, vehicleIndex: number) => {
    setPackages((prevPackages) => {
      const updated = [...prevPackages];
      const seasons = updated[packageIndex].seasons || [];
      const currentPerVehicleRates = [...(seasons[seasonIndex].per_vehicle_rate || [])];
      currentPerVehicleRates.splice(vehicleIndex, 1);
      seasons[seasonIndex].per_vehicle_rate = currentPerVehicleRates;
      updated[packageIndex].seasons = seasons;
      return updated;
    });
  }, []);

  const updatePerVehicleRate = useCallback(
    (
      packageIndex: number,
      seasonIndex: number,
      vehicleIndex: number,
      field: "rate" | "brand" | "capacity" | "vehicle_type",
      value: string | number
    ) => {
      setPackages((prevPackages) => {
        const updated = [...prevPackages];
        const seasons = updated[packageIndex].seasons || [];
        const currentPerVehicleRates = [...(seasons[seasonIndex].per_vehicle_rate || [])];
        currentPerVehicleRates[vehicleIndex] = {
          ...currentPerVehicleRates[vehicleIndex],
          [field]: value,
        };
        seasons[seasonIndex].per_vehicle_rate = currentPerVehicleRates;
        updated[packageIndex].seasons = seasons;
        return updated;
      });
    },
    []
  );

  const duplicatePerVehicleRate = useCallback((packageIndex: number, seasonIndex: number, vehicleIndex: number) => {
    setPackages((prevPackages) => {
      const updated = [...prevPackages];
      const seasons = updated[packageIndex].seasons || [];
      const currentPerVehicleRates = [...(seasons[seasonIndex].per_vehicle_rate || [])];
      const vehicle = currentPerVehicleRates[vehicleIndex];
      currentPerVehicleRates.push({
        ...vehicle,
        vehicle_type: `${vehicle.vehicle_type} (Copy)`,
      });
      seasons[seasonIndex].per_vehicle_rate = currentPerVehicleRates;
      updated[packageIndex].seasons = seasons;
      return updated;
    });
  }, []);

  // Create stable handlers for package checkboxes
  const handlePreferredChange = useCallback(
    (packageIndex: number, checked: boolean) => {
      updatePackageField(packageIndex, "preferred", checked);
    },
    [updatePackageField]
  );

  const handleComboChange = useCallback(
    (packageIndex: number, checked: boolean) => {
      updatePackageField(packageIndex, "iscombo", checked);
    },
    [updatePackageField]
  );

  const handleAddOnChange = useCallback((packageIndex: number, addOnId: string, checked: boolean) => {
    setPackages((prevPackages) => {
      const updated = [...prevPackages];
      const pkg = updated[packageIndex];
      const currentAddOns = pkg.selected_add_ons || [];
      const newAddOns = checked
        ? [...currentAddOns, { id: addOnId, is_mandatory: false }] // Always add as object with is_mandatory: false
        : currentAddOns.filter((addOn: any) => {
            // Handle both string and object formats
            const id = typeof addOn === "string" ? addOn : addOn.id;
            return id !== addOnId;
          });
      updated[packageIndex] = {
        ...pkg,
        selected_add_ons: newAddOns,
      };
      return updated;
    });
  }, []);

  const handleIncludesTransferChange = useCallback(
    (packageIndex: number, checked: boolean) => {
      updatePackageField(packageIndex, "includes_transfer", checked);
    },
    [updatePackageField]
  );

  const handleMandatoryChange = useCallback((addOnId: string, checked: boolean) => {
    // Update local state for selected_add_ons in packages
    // DB update will happen when user clicks "Save Tour"
    setPackages((prevPackages) =>
      prevPackages.map((pkg) => ({
        ...pkg,
        selected_add_ons: pkg.selected_add_ons?.map((addOn: any) =>
          (typeof addOn === "string" ? addOn : addOn.id) === addOnId
            ? {
                ...(typeof addOn === "string" ? { id: addOn } : addOn),
                is_mandatory: checked,
              }
            : addOn
        ),
      }))
    );
  }, []);

  // Drag and drop handlers
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handlePackageDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setPackages((prevPackages) => {
        const oldIndex = prevPackages.findIndex((pkg, idx) => `package-${idx}` === active.id);
        const newIndex = prevPackages.findIndex((pkg, idx) => `package-${idx}` === over.id);
        const reorderedPackages = arrayMove(prevPackages, oldIndex, newIndex);

        // Update order field for each package
        const packagesWithOrder = reorderedPackages.map((pkg, idx) => ({
          ...pkg,
          order: idx,
        }));

        // Save order to database for packages that have IDs (bulk update)
        (async () => {
          const packagesWithIds = packagesWithOrder
            .filter((pkg) => pkg.id)
            .map((pkg) => {
              // Remove virtual fields before saving
              const { selected_add_ons, tour_package_add_ons, ...packageData } = pkg as any;
              return packageData;
            });

          if (packagesWithIds.length > 0) {
            try {
              const result = await bulkUpsertPackages(packagesWithIds);
              if (result.error) {
                console.error("Error updating package order:", result.error);
              }
            } catch (error) {
              console.error("Error updating package order:", error);
            }
          }
        })();

        return packagesWithOrder;
      });
    }
  };

  const handleSeasonDragEnd = (packageIndex: number) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setPackages((prevPackages) => {
        const updated = [...prevPackages];
        const seasons = updated[packageIndex].seasons || [];
        const oldIndex = seasons.findIndex((_, idx) => `season-${packageIndex}-${idx}` === active.id);
        const newIndex = seasons.findIndex((_, idx) => `season-${packageIndex}-${idx}` === over.id);

        // Reorder and add order field to seasons
        const reorderedSeasons = arrayMove(seasons, oldIndex, newIndex).map((season, idx) => ({
          ...season,
          order: idx,
        }));

        updated[packageIndex].seasons = reorderedSeasons;
        return updated;
      });
    }
  };

  const getIsLocked = (packageIndex: number, name: string) => {
    const pkg: any = Array.isArray(packages) ? packages[packageIndex] : {};

    const isLinked = !!pkg?.tour_package_datastore_id && !pkg.is_unlinked;

    return isLinked && syncedColumns.includes(name);
  };

  const handleImportPackages = useCallback(
    async (selectedPackages: ITourPackage[], relatedAddOns: ITourAddOn[]) => {
      if (!initialData?.id) return;

      // Prepare packages for bulk upsert - remove virtual fields and ensure order is set
      const packagesForUpsert = selectedPackages.map((pkg: any, idx: number) => {
        const {
          id, // this is the datastore, we don't need this
          selected_add_ons,
          tour_package_add_ons_datastore,
          ...packageData
        } = pkg;

        const data = {
          ...packageData,
          tour_id: initialData?.id,
          order: pkg.order !== undefined ? pkg.order : idx, // Ensure order is always set
          // set datastore link
          tour_package_datastore_id: pkg.id,
          is_unlinked: false,
        };
        // Generate UUID for new packages (without id or with empty string id)
        if (!data.id || data.id === "") {
          data.id = crypto.randomUUID();
        }
        return data;
      });

      // Bulk upsert all packages in one operation
      const result = await bulkUpsertPackages(packagesForUpsert);
      if (result.error) throw new Error(result.error);

      const updatedPackages = result.data || [];

      // Prepare addOns for bulk upsert - remove virtual fields and set datastore link
      const relatedAddOnsFiltered = relatedAddOns.filter(
        (addOn) => !availableAddOns.some((availableAddOn) => availableAddOn.tour_add_on_datastore_id === addOn.id)
      );

      const addOnsForUpsert = relatedAddOnsFiltered.map(({ id, ...addOn }: any) => {
        const data = {
          ...addOn,
          tour_id: initialData?.id,
          // set datastore link
          tour_add_on_datastore_id: id,
          is_unlinked: false,
        };
        return data;
      });

      // Bulk upsert all packages in one operation
      const { data: updatedAddOns, error: addOnError } = await bulkUpsertTourAddOns(initialData.id, addOnsForUpsert);
      if (addOnError) throw new Error(addOnError);

      // Prepare all package add-ons for bulk update (single DB call instead of N calls)
      const packageAddOns = updatedPackages.map((savedPkg: any, idx: number) => {
        const pkg = selectedPackages[idx];

        // Pass full add-on objects with is_mandatory field
        const addOns = (pkg.selected_add_ons || []).map((addOn: any) => {
          const addOnId = typeof addOn === "string" ? addOn : addOn.id;
          const isMandatory = typeof addOn === "string" ? false : addOn.is_mandatory;

          const existingAddOn = availableAddOns.find((x) => x.tour_add_on_datastore_id === addOnId);
          const updatedAddOn = updatedAddOns.find((x) => x.tour_add_on_datastore_id === addOnId);

          const newAddOnId = existingAddOn ? existingAddOn.id : updatedAddOn ? updatedAddOn.id : addOnId;

          return {
            id: newAddOnId,
            is_mandatory: isMandatory,
          };
        });

        return {
          packageId: savedPkg.id,
          addOns,
        };
      });

      // Bulk update all add-ons in one operation
      const addOnResult = await bulkUpdatePackageAddOns(packageAddOns);
      if (addOnResult.error) {
        console.error("Error updating package add-ons:", addOnResult.error);
      }

      // Merge selected_add_ons back into the response
      const finalPackages = updatedPackages.map((savedPkg: any, idx: number) => ({
        ...savedPkg,
        selected_add_ons: selectedPackages[idx].selected_add_ons?.map((addOn: any) => {
          const addOnId = typeof addOn === "string" ? addOn : addOn.id;

          const existingAddOn = availableAddOns.find((x) => x.tour_add_on_datastore_id === addOnId);
          const updatedAddOn = updatedAddOns.find((x) => x.tour_add_on_datastore_id === addOnId);

          const newAddOnId = existingAddOn ? existingAddOn.id : updatedAddOn ? updatedAddOn.id : addOnId;

          return {
            ...addOn,
            id: newAddOnId,
          };
        }),
      }));

      // Update local state with saved packages (including new IDs)
      setPackages((prev) => [...prev, ...finalPackages]);
      setAvailableAddOns((prev) => [...prev, ...updatedAddOns]);
    },
    [packages, availableAddOns]
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Packages & Rates</h2>
          <p className="text-sm text-muted-foreground">Configure packages with seasonal pricing and transfer options</p>
        </div>
        {!!initialData?.tour_datastore_id && !initialData.is_unlinked && (
          <ImportPackagesButton
            tourDatastoreId={initialData?.tour_datastore_id}
            currPackages={packages}
            onImport={handleImportPackages}
          />
        )}
      </div>

      <form
        ref={formRef}
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="space-y-6"
      >
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handlePackageDragEnd}>
          <SortableContext items={packages.map((_, idx) => `package-${idx}`)} strategy={verticalListSortingStrategy}>
            <Accordion type="multiple" className="space-y-4" value={openPackages} onValueChange={setOpenPackages}>
              {packages.map((pkg, packageIndex) => (
                <SortablePackage
                  key={`${pkg.id || "new"}-${packageIndex}`}
                  pkg={pkg}
                  packageIndex={packageIndex}
                  updatePackageName={updatePackageName}
                  duplicatePackage={duplicatePackage}
                  removePackage={removePackage}
                  packagesLength={packages.length}
                  user={user}
                  getIsLocked={getIsLocked}
                  updatePackageField={updatePackageField}
                  handlePreferredChange={handlePreferredChange}
                  handleComboChange={handleComboChange}
                  handleAddOnChange={handleAddOnChange}
                  handleMandatoryChange={handleMandatoryChange}
                  availableAddOns={availableAddOns}
                  isLoadingAddOns={isLoadingAddOns}
                  sensors={sensors}
                  handleSeasonDragEnd={handleSeasonDragEnd}
                  addSeason={addSeason}
                  packages={packages}
                  updateSeasonField={updateSeasonField}
                  removeSeason={removeSeason}
                  duplicateSeason={duplicateSeason}
                  addPvtRate={addPvtRate}
                  removePvtRate={removePvtRate}
                  updatePvtRate={updatePvtRate}
                  addPerVehicleRate={addPerVehicleRate}
                  removePerVehicleRate={removePerVehicleRate}
                  updatePerVehicleRate={updatePerVehicleRate}
                  duplicatePerVehicleRate={duplicatePerVehicleRate}
                  handleIncludesTransferChange={handleIncludesTransferChange}
                  removeAgeBracket={removeAgeBracket}
                />
              ))}
            </Accordion>
          </SortableContext>
        </DndContext>

        {/* Add Package Button */}
        <div className="space-y-6">
          <div className="flex justify-center">
            <Button
              type="button"
              variant="dashed"
              onClick={addPackage}
              className="w-full max-w-md border-dashed border-2"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Package
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
