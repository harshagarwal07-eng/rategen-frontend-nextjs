"use client";

import { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Copy, Package as PackageIcon, ChevronDown, GripVertical, Clock } from "lucide-react";
import { S3ImageUpload } from "@/components/ui/s3-image-upload";
import useUser from "@/hooks/use-user";
import { bulkUpsertTransferAddOns, getTransferAddOns } from "@/data-access/transfer-add-ons";
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
import { BorderedCard } from "@/components/ui/bordered-card";
import OptionCheckbox from "@/components/ui/option-checkbox";
import { ISeason, ITransferPackage, IOperationalHours, ITransferAddOn } from "../schemas/transfers-datastore-schema";
import { TRANSFER_TYPE_OPTIONS, TRANSFER_TYPE_GROUPS } from "@/types/transfers";
import {
  MultiSelector,
  MultiSelectorTrigger,
  MultiSelectorInput,
  MultiSelectorContent,
  MultiSelectorList,
  MultiSelectorItem,
} from "@/components/ui/multi-select";
import * as z from "zod";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  createTransferPackage,
  updateTransferPackage,
  deleteTransferPackage,
  bulkUpsertTransferPackages,
} from "@/data-access/transfer-packages";
import { bulkUpdateTransferPackageAddOns } from "@/data-access/transfer-package-add-ons";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import IndicateLocked from "@/components/common/indicate-locked";
import ImportTransferPackagesButton from "./import-package-datastore-button";

// Transfer type enum for local schema
const TransferTypeEnumLocal = z.enum([
  // Airport/Port/Station Transfers
  "airport_to_hotel",
  "hotel_to_airport",
  "port_to_hotel",
  "hotel_to_port",
  "station_to_hotel",
  "hotel_to_station",
  // Tour Transfers
  "hotel_to_tour",
  "tour_to_hotel",
  "tour_to_tour",
  // Inter-City/Hotel Transfers
  "inter_city",
  "hotel_to_hotel",
]);

// Transfer Packages Schema
const TransferPackagesSchema = z.object({
  id: z.string().optional(),
  packages: z
    .array(
      z.object({
        id: z.string().optional(),
        transfer_id: z.string().optional(),
        name: z.string().min(1, "Package name is required"),
        transfer_type: z.array(TransferTypeEnumLocal).optional(),
        seasons: z
          .array(
            z.object({
              dates: z.string().optional(),
              sic_rate_adult: z.coerce.number().optional(),
              sic_rate_child: z.coerce.number().optional(),
              pvt_rate: z.record(z.string(), z.coerce.number()).optional(),
              // Km Based Rates (for Vehicle On Disposal mode)
              km_rate_per_km: z.coerce.number().optional(),
              km_min_per_day: z.coerce.number().optional(),
              km_max_hrs_per_day: z.coerce.number().optional(),
              km_surcharge_per_hr: z.coerce.number().optional(),
              per_vehicle_rate: z
                .array(
                  z.object({
                    rate: z.coerce.number().optional(),
                    brand: z.string().optional(),
                    vehicle_type: z.string().optional(),
                    max_passengers: z.coerce.number().optional(),
                    max_luggage: z.coerce.number().optional(),
                    // Vehicle On Disposal fields
                    max_hrs_day: z.coerce.number().optional(),
                    max_kms_day: z.coerce.number().optional(),
                    surcharge_hr: z.coerce.number().optional(),
                    surcharge_km: z.coerce.number().optional(),
                    extras: z.string().optional(),
                  })
                )
                .optional(),
              exception_rules: z.string().optional(),
            })
          )
          .optional(),
      })
    )
    .optional(),
});

export type ITransferPackages = z.infer<typeof TransferPackagesSchema>;

interface TransferPackagesFormProps {
  initialData?: Partial<
    ITransferPackages & {
      id?: string;
      mode?: string;
      packages?: ITransferPackage[];
      add_ons?: any[];
      transfer_datastore_id?: string | null;
      is_unlinked?: boolean;
    }
  >;
  syncedColumns: string[];
  onNext: (data: ITransferPackages & { id?: string }) => void;
  formRef?: React.RefObject<HTMLFormElement>;
}

// Sortable Package Component
interface SortablePackageProps {
  pkg: ITransferPackage;
  packageIndex: number;
  updatePackageName: (packageIndex: number, name: string) => void;
  duplicatePackage: (packageIndex: number) => void;
  removePackage: (packageIndex: number) => void;
  packagesLength: number;
  getIsLocked: (packageIndex: number, name: string) => boolean;
  updatePackageField: (packageIndex: number, field: keyof ITransferPackage, value: any) => void;
  addSeason: (packageIndex: number) => void;
  sensors: any;
  handleSeasonDragEnd: (packageIndex: number) => (event: DragEndEvent) => void;
  packages: ITransferPackage[];
  updateSeasonField: (packageIndex: number, seasonIndex: number, field: keyof ISeason, value: any) => void;
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
    field:
      | "rate"
      | "brand"
      | "capacity"
      | "vehicle_type"
      | "max_hrs_day"
      | "max_kms_day"
      | "surcharge_hr"
      | "surcharge_km"
      | "extras",
    value: string | number
  ) => void;
  setPackages: React.Dispatch<React.SetStateAction<ITransferPackage[]>>;
  user: any;
  availableAddOns: any[];
  isLoadingAddOns: boolean;
  handleAddOnChange: (packageIndex: number, addOnId: string, checked: boolean) => void;
  handleMandatoryChange: (addOnId: string, checked: boolean) => void;
  addOperationalHour: (packageIndex: number) => void;
  removeOperationalHour: (packageIndex: number, hourIndex: number) => void;
  duplicateOperationalHour: (packageIndex: number, hourIndex: number) => void;
  updateOperationalHour: (
    packageIndex: number,
    hourIndex: number,
    field: keyof IOperationalHours,
    value: string
  ) => void;
  transferMode?: string;
}

const SortablePackage = ({
  pkg,
  packageIndex,
  updatePackageName,
  duplicatePackage,
  removePackage,
  packagesLength,
  getIsLocked,
  updatePackageField,
  addSeason,
  sensors,
  handleSeasonDragEnd,
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
  setPackages,
  user,
  availableAddOns,
  isLoadingAddOns,
  handleAddOnChange,
  handleMandatoryChange,
  addOperationalHour,
  removeOperationalHour,
  duplicateOperationalHour,
  updateOperationalHour,
  transferMode,
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
              {getIsLocked(packageIndex, "transfer_package.name") && <IndicateLocked />}
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
        <PackageContent
          pkg={pkg}
          packageIndex={packageIndex}
          updatePackageField={updatePackageField}
          addSeason={addSeason}
          sensors={sensors}
          handleSeasonDragEnd={handleSeasonDragEnd}
          packages={packages}
          getIsLocked={getIsLocked}
          updateSeasonField={updateSeasonField}
          removeSeason={removeSeason}
          duplicateSeason={duplicateSeason}
          addPvtRate={addPvtRate}
          removePvtRate={removePvtRate}
          updatePvtRate={updatePvtRate}
          addPerVehicleRate={addPerVehicleRate}
          removePerVehicleRate={removePerVehicleRate}
          updatePerVehicleRate={updatePerVehicleRate}
          setPackages={setPackages}
          user={user}
          availableAddOns={availableAddOns}
          isLoadingAddOns={isLoadingAddOns}
          handleAddOnChange={handleAddOnChange}
          handleMandatoryChange={handleMandatoryChange}
          addOperationalHour={addOperationalHour}
          removeOperationalHour={removeOperationalHour}
          duplicateOperationalHour={duplicateOperationalHour}
          updateOperationalHour={updateOperationalHour}
          transferMode={transferMode}
        />
      </AccordionItem>
    </div>
  );
};

// Package Content with Seasons
interface PackageContentProps {
  pkg: ITransferPackage;
  packageIndex: number;
  updatePackageField: (packageIndex: number, field: keyof ITransferPackage, value: any) => void;
  addSeason: (packageIndex: number) => void;
  sensors: any;
  handleSeasonDragEnd: (packageIndex: number) => (event: DragEndEvent) => void;
  packages: ITransferPackage[];
  getIsLocked: (packageIndex: number, name: string) => boolean;
  updateSeasonField: (packageIndex: number, seasonIndex: number, field: keyof ISeason, value: any) => void;
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
    field:
      | "rate"
      | "brand"
      | "capacity"
      | "vehicle_type"
      | "max_hrs_day"
      | "max_kms_day"
      | "surcharge_hr"
      | "surcharge_km"
      | "extras",
    value: string | number
  ) => void;
  setPackages: React.Dispatch<React.SetStateAction<ITransferPackage[]>>;
  user: any;
  availableAddOns: any[];
  isLoadingAddOns: boolean;
  handleAddOnChange: (packageIndex: number, addOnId: string, checked: boolean) => void;
  handleMandatoryChange: (addOnId: string, checked: boolean) => void;
  addOperationalHour: (packageIndex: number) => void;
  removeOperationalHour: (packageIndex: number, hourIndex: number) => void;
  duplicateOperationalHour: (packageIndex: number, hourIndex: number) => void;
  updateOperationalHour: (
    packageIndex: number,
    hourIndex: number,
    field: keyof IOperationalHours,
    value: string
  ) => void;
  transferMode?: string;
}

const PackageContent = ({
  pkg,
  packageIndex,
  updatePackageField,
  addSeason,
  sensors,
  handleSeasonDragEnd,
  packages,
  getIsLocked,
  updateSeasonField,
  removeSeason,
  duplicateSeason,
  addPvtRate,
  removePvtRate,
  updatePvtRate,
  addPerVehicleRate,
  removePerVehicleRate,
  updatePerVehicleRate,
  setPackages,
  user,
  availableAddOns,
  isLoadingAddOns,
  handleAddOnChange,
  handleMandatoryChange,
  addOperationalHour,
  removeOperationalHour,
  duplicateOperationalHour,
  updateOperationalHour,
  transferMode,
}: PackageContentProps) => (
  <AccordionContent className="px-4 pb-4">
    {/* Package Details Section - keeping existing code */}
    <BorderedCard title="Package Details" className="mb-4 mt-3" collapsible>
      <div className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <FormLabel className="text-sm font-medium">Package Name *</FormLabel>
            <Textarea
              placeholder="e.g., Standard Package, Premium Package"
              value={pkg.name || ""}
              onChange={(e) => updatePackageField(packageIndex, "name", e.target.value)}
              className="min-h-[80px] resize-none"
              disabled={getIsLocked(packageIndex, "transfer_package.name")}
              rightIcon={getIsLocked(packageIndex, "transfer_package.name") && <IndicateLocked />}
            />
          </div>

          <div className="space-y-2">
            <FormLabel className="text-sm font-medium">Description</FormLabel>
            <Textarea
              placeholder="Enter package description"
              value={pkg.description || ""}
              onChange={(e) => updatePackageField(packageIndex, "description", e.target.value)}
              className="min-h-[80px] resize-none"
            />
          </div>
        </div>

        {/* Transfer Type Multiselect */}
        <div className="space-y-2">
          <FormLabel className="text-sm font-medium">Transfer Type</FormLabel>
          <MultiSelector
            values={pkg.transfer_type || []}
            onValuesChange={(values) => updatePackageField(packageIndex, "transfer_type", values)}
            className="w-full"
          >
            <MultiSelectorTrigger
              data={TRANSFER_TYPE_OPTIONS.map((opt) => ({
                value: opt.value,
                label: opt.label,
              }))}
              keyString="label"
              valueString="value"
            >
              <MultiSelectorInput placeholder="Select transfer types..." />
            </MultiSelectorTrigger>
            <MultiSelectorContent>
              <MultiSelectorList>
                {TRANSFER_TYPE_GROUPS.map((group, groupIndex) => (
                  <div key={group.group}>
                    {groupIndex > 0 && <div className="h-px bg-border my-2" />}
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {group.group}
                    </div>
                    {group.options.map((option) => (
                      <MultiSelectorItem key={option.value} value={option.value}>
                        {option.label}
                      </MultiSelectorItem>
                    ))}
                  </div>
                ))}
              </MultiSelectorList>
            </MultiSelectorContent>
          </MultiSelector>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <FormLabel className="text-sm font-medium">AI Remarks</FormLabel>
            <Textarea
              placeholder="Remarks for AI reference..."
              value={pkg.remarks || ""}
              onChange={(e) => updatePackageField(packageIndex, "remarks", e.target.value)}
              className="min-h-[80px]"
              disabled={getIsLocked(packageIndex, "transfer_package.remarks")}
              rightIcon={getIsLocked(packageIndex, "transfer_package.remarks") && <IndicateLocked />}
            />
          </div>
          <div className="space-y-2">
            <FormLabel className="text-sm font-medium">Notes</FormLabel>
            <Textarea
              placeholder="Notes for frontend display..."
              value={pkg.notes || ""}
              onChange={(e) => updatePackageField(packageIndex, "notes", e.target.value)}
              className="min-h-[80px]"
            />
          </div>
        </div>

        {/* Route Details Section */}
        <div className="space-y-3">
          <FormLabel className="text-sm font-medium text-muted-foreground">Route Details</FormLabel>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <FormLabel className="text-sm font-medium">Origin</FormLabel>
              <Input
                placeholder="Starting point..."
                value={pkg.origin || ""}
                onChange={(e) => updatePackageField(packageIndex, "origin", e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <FormLabel className="text-sm font-medium">Destination</FormLabel>
              <Input
                placeholder="End point..."
                value={pkg.destination || ""}
                onChange={(e) => updatePackageField(packageIndex, "destination", e.target.value)}
                className="h-9"
              />
            </div>
          </div>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <FormLabel className="text-sm font-medium">No. of Stops</FormLabel>
              <Input
                type="number"
                placeholder="-"
                value={pkg.num_stops || ""}
                onChange={(e) =>
                  updatePackageField(packageIndex, "num_stops", e.target.value ? parseInt(e.target.value) : undefined)
                }
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <FormLabel className="text-sm font-medium">Via</FormLabel>
              <Input
                placeholder="Via locations..."
                value={pkg.via || ""}
                onChange={(e) => updatePackageField(packageIndex, "via", e.target.value)}
                className="h-9"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <FormLabel className="text-sm font-medium">Duration</FormLabel>
              <div className="flex gap-2 items-center">
                <div className="flex flex-col items-center gap-1">
                  <Input
                    type="text"
                    placeholder="00"
                    value={pkg.duration?.days || ""}
                    onChange={(e) => {
                      const val = e.target.value.trim();
                      if (val === "" || /^\d+$/.test(val)) {
                        const numVal = val === "" ? undefined : Math.min(parseInt(val), 999);
                        updatePackageField(packageIndex, "duration", {
                          ...pkg.duration,
                          days: numVal,
                        });
                      }
                    }}
                    className="text-sm w-16 text-center"
                  />
                  <span className="text-xs text-muted-foreground">Days</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Input
                    type="text"
                    placeholder="00"
                    value={pkg.duration?.hours || ""}
                    onChange={(e) => {
                      const val = e.target.value.trim();
                      if (val === "" || /^\d+$/.test(val)) {
                        const numVal = val === "" ? undefined : Math.min(parseInt(val), 23);
                        updatePackageField(packageIndex, "duration", {
                          ...pkg.duration,
                          hours: numVal,
                        });
                      }
                    }}
                    className="text-sm w-16 text-center"
                  />
                  <span className="text-xs text-muted-foreground">Hours</span>
                </div>

                <div className="flex flex-col items-center gap-1">
                  <Input
                    type="text"
                    placeholder="00"
                    value={pkg.duration?.minutes || ""}
                    onChange={(e) => {
                      const val = e.target.value.trim();
                      if (val === "" || /^\d+$/.test(val)) {
                        const numVal = val === "" ? undefined : Math.min(parseInt(val), 59);
                        updatePackageField(packageIndex, "duration", {
                          ...pkg.duration,
                          minutes: numVal,
                        });
                      }
                    }}
                    className="text-sm w-16 text-center"
                  />
                  <span className="text-xs text-muted-foreground">Minutes</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Location Points */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <FormLabel className="text-sm font-medium">Meeting Point</FormLabel>
            <Input
              placeholder="Meeting point details..."
              value={pkg.meeting_point || ""}
              onChange={(e) => updatePackageField(packageIndex, "meeting_point", e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <FormLabel className="text-sm font-medium">Pick-up Point</FormLabel>
            <Input
              placeholder="Pick-up location..."
              value={pkg.pickup_point || ""}
              onChange={(e) => updatePackageField(packageIndex, "pickup_point", e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <FormLabel className="text-sm font-medium">Drop-off Point</FormLabel>
            <Input
              placeholder="Drop-off location..."
              value={pkg.dropoff_point || ""}
              onChange={(e) => updatePackageField(packageIndex, "dropoff_point", e.target.value)}
              className="h-9"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <OptionCheckbox
            id={`preferred-${packageIndex}`}
            label="Preferred Package"
            description="Mark as preferred option"
            checked={pkg.preferred || false}
            onCheckedChange={(checked) => updatePackageField(packageIndex, "preferred", checked)}
          />
          {/* <OptionCheckbox
            id={`combo-${packageIndex}`}
            label="Combo Package"
            description="Package includes multiple services"
            checked={pkg.iscombo || false}
            onCheckedChange={(checked) => updatePackageField(packageIndex, "iscombo", checked)}
          /> */}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <FormLabel className="text-sm font-medium">Inclusions (Comma separated)</FormLabel>
            <Textarea
              placeholder="What's included in this package..."
              value={pkg.inclusions || ""}
              onChange={(e) => updatePackageField(packageIndex, "inclusions", e.target.value)}
              className="min-h-[80px]"
            />
          </div>
          <div className="space-y-2">
            <FormLabel className="text-sm font-medium">Exclusions (Comma separated)</FormLabel>
            <Textarea
              placeholder="What's excluded from this package..."
              value={pkg.exclusions || ""}
              onChange={(e) => updatePackageField(packageIndex, "exclusions", e.target.value)}
              className="min-h-[80px]"
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
                const isMandatory =
                  selectedAddOn && typeof selectedAddOn !== "string" && selectedAddOn.is_mandatory === true;
                const isChecked = !!selectedAddOn;

                return (
                  <div key={addOn.id} className="flex items-center gap-4">
                    <div className="flex-1">
                      <OptionCheckbox
                        id={`addon-${packageIndex}-${addOn.id}`}
                        label={addOn.name}
                        description={
                          addOn.rate_adult
                            ? `Adult: ${addOn.rate_adult}${addOn.rate_child ? ` | Child: ${addOn.rate_child}` : ""}`
                            : addOn.description || "No description"
                        }
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          handleAddOnChange(packageIndex, addOn.id, checked === true);
                        }}
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

    {/* Operational Hours Section */}
    <BorderedCard title="Operational Hours" className="mb-4" collapsible>
      <div className="space-y-2">
        {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((dayName) => {
          const dayHours = pkg.operational_hours?.find((h) => h.day === dayName);

          if (!dayHours) {
            return (
              <div key={dayName} className="flex gap-2 items-center p-2 border rounded-lg bg-muted/30">
                <div className="w-24 text-sm font-medium text-muted-foreground">{dayName}</div>
                <div className="flex-1 text-sm text-muted-foreground">Not set</div>
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
                    pkg.operational_hours?.map((h) => (h.day === dayName ? { ...h, time_start: e.target.value } : h)) ||
                    [];
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
                    pkg.operational_hours?.map((h) => (h.day === dayName ? { ...h, time_end: e.target.value } : h)) ||
                    [];
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
                <PopoverContent className="w-48 p-2">
                  <div className="space-y-1">
                    <p className="text-xs font-medium mb-2">Copy to:</p>
                    {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
                      .filter((d) => d !== dayName)
                      .map((targetDay) => (
                        <div key={targetDay} className="flex items-center gap-2">
                          <Checkbox
                            id={`copy-${dayName}-${targetDay}`}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                const updated = pkg.operational_hours?.filter((h) => h.day !== targetDay) || [];
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
                          <Label htmlFor={`copy-${dayName}-${targetDay}`} className="text-xs">
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

    {/* Images Section */}
    <BorderedCard title="Package Images" className="mb-4" collapsible>
      <S3ImageUpload
        images={pkg.images || []}
        onChange={(images) => updatePackageField(packageIndex, "images", images)}
        userId={user?.id || ""}
        prefix="transfer-packages"
        disabled={!user?.id || getIsLocked(packageIndex, "transfer_package.images")}
      />
    </BorderedCard>

    {/* Seasons Section with Drag and Drop */}
    <div className="space-y-3 pt-2">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Seasonal Pricing</div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSeasonDragEnd(packageIndex)}>
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
                setPackages={setPackages}
                transferMode={transferMode}
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
    </div>
  </AccordionContent>
);

// Sortable Season Component
interface SortableSeasonProps {
  season: ISeason;
  packageIndex: number;
  seasonIndex: number;
  packages: ITransferPackage[];
  updateSeasonField: (packageIndex: number, seasonIndex: number, field: keyof ISeason, value: any) => void;
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
    field:
      | "rate"
      | "brand"
      | "capacity"
      | "vehicle_type"
      | "max_hrs_day"
      | "max_kms_day"
      | "surcharge_hr"
      | "surcharge_km"
      | "extras",
    value: string | number
  ) => void;
  setPackages: React.Dispatch<React.SetStateAction<ITransferPackage[]>>;
  transferMode?: string;
}

const SortableSeason = ({
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
  setPackages,
  transferMode,
}: SortableSeasonProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `season-${packageIndex}-${seasonIndex}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <SeasonContent
        season={season}
        packageIndex={packageIndex}
        seasonIndex={seasonIndex}
        dragHandleProps={{ attributes, listeners }}
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
        setPackages={setPackages}
        transferMode={transferMode}
      />
    </div>
  );
};

// Season Content Component
interface SeasonContentProps {
  season: ISeason;
  packageIndex: number;
  seasonIndex: number;
  dragHandleProps?: any;
  packages: ITransferPackage[];
  updateSeasonField: (packageIndex: number, seasonIndex: number, field: keyof ISeason, value: any) => void;
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
    field:
      | "rate"
      | "brand"
      | "capacity"
      | "vehicle_type"
      | "max_hrs_day"
      | "max_kms_day"
      | "surcharge_hr"
      | "surcharge_km"
      | "extras",
    value: string | number
  ) => void;
  setPackages: React.Dispatch<React.SetStateAction<ITransferPackage[]>>;
  transferMode?: string;
}

const SeasonContent = ({
  season,
  packageIndex,
  seasonIndex,
  dragHandleProps,
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
  setPackages,
  transferMode,
}: SeasonContentProps) => {
  const pkg = packages[packageIndex];
  const isVehicleOnDisposal = transferMode === "vehicle_on_disposal";

  return (
    <AccordionItem
      value={`season-${packageIndex}-${seasonIndex}`}
      className="border-2 border-border/50 bg-card rounded-lg overflow-hidden"
    >
      <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-accent/20 transition-colors [&>svg]:hidden group">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3 flex-1">
            <div
              {...dragHandleProps?.attributes}
              {...dragHandleProps?.listeners}
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
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <FormLabel className="text-sm font-medium">Season Dates *</FormLabel>
              <DateRangePicker
                value={season.dates || ""}
                onChange={(value) => updateSeasonField(packageIndex, seasonIndex, "dates", value)}
                placeholder="Select season dates"
              />
            </div>
            <div className="space-y-1">
              <FormLabel className="text-sm font-medium">Blackout Dates</FormLabel>
              <DateRangePicker
                value={season.blackout_dates || ""}
                onChange={(value) => updateSeasonField(packageIndex, seasonIndex, "blackout_dates", value)}
                placeholder="Select blackout dates"
              />
            </div>
          </div>

          {/* Exception Rules */}
          <div>
            <div className="space-y-2">
              <FormLabel className="text-xs font-medium">Exception Rules</FormLabel>
              <Textarea
                placeholder="e.g., No transfers on public holidays"
                value={season.exception_rules || ""}
                onChange={(e) => updateSeasonField(packageIndex, seasonIndex, "exception_rules", e.target.value)}
                className="text-sm min-h-[60px]"
              />
            </div>
          </div>

          {/* SIC Rates - Hidden for Vehicle On Disposal */}
          {!isVehicleOnDisposal && (
            <div className="border-2 border-border/50 rounded-lg p-3 bg-accent/15">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">SIC Rates</div>
              <div className="grid grid-cols-4 gap-2 items-end">
                <div className="space-y-1">
                  <FormLabel className="text-xs font-medium">Adult Rate</FormLabel>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="-"
                    value={season.sic_rate_adult || ""}
                    onChange={(e) =>
                      updateSeasonField(
                        packageIndex,
                        seasonIndex,
                        "sic_rate_adult",
                        parseFloat(e.target.value) || undefined
                      )
                    }
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <FormLabel className="text-xs font-medium">Child Rate</FormLabel>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="-"
                    value={season.sic_rate_child || ""}
                    onChange={(e) =>
                      updateSeasonField(
                        packageIndex,
                        seasonIndex,
                        "sic_rate_child",
                        parseFloat(e.target.value) || undefined
                      )
                    }
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <FormLabel className="text-xs font-medium">Max Passengers</FormLabel>
                  <Input
                    type="number"
                    placeholder="-"
                    value={season.sic_max_passengers || ""}
                    onChange={(e) =>
                      updateSeasonField(
                        packageIndex,
                        seasonIndex,
                        "sic_max_passengers",
                        parseInt(e.target.value) || undefined
                      )
                    }
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <FormLabel className="text-xs font-medium">Max Luggage</FormLabel>
                  <Input
                    type="number"
                    placeholder="-"
                    value={season.sic_max_luggage || ""}
                    onChange={(e) =>
                      updateSeasonField(
                        packageIndex,
                        seasonIndex,
                        "sic_max_luggage",
                        parseInt(e.target.value) || undefined
                      )
                    }
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Km Based Rates - Only for Vehicle On Disposal */}
          {isVehicleOnDisposal && (
            <div className="border-2 border-border/50 rounded-lg p-3 bg-accent/15">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Km Based Pricing
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <FormLabel className="text-xs font-medium">Rate Per Km</FormLabel>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="-"
                    value={season.km_rate_per_km || ""}
                    onChange={(e) =>
                      updateSeasonField(
                        packageIndex,
                        seasonIndex,
                        "km_rate_per_km",
                        parseFloat(e.target.value) || undefined
                      )
                    }
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <FormLabel className="text-xs font-medium">Min km per Day</FormLabel>
                  <Input
                    type="number"
                    placeholder="-"
                    value={season.km_min_per_day || ""}
                    onChange={(e) =>
                      updateSeasonField(
                        packageIndex,
                        seasonIndex,
                        "km_min_per_day",
                        parseInt(e.target.value) || undefined
                      )
                    }
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <FormLabel className="text-xs font-medium">Max Hours/Day</FormLabel>
                  <Input
                    type="number"
                    placeholder="-"
                    value={season.km_max_hrs_per_day || ""}
                    onChange={(e) =>
                      updateSeasonField(
                        packageIndex,
                        seasonIndex,
                        "km_max_hrs_per_day",
                        parseInt(e.target.value) || undefined
                      )
                    }
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <FormLabel className="text-xs font-medium">Surcharge/Hour</FormLabel>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="-"
                    value={season.km_surcharge_per_hr || ""}
                    onChange={(e) =>
                      updateSeasonField(
                        packageIndex,
                        seasonIndex,
                        "km_surcharge_per_hr",
                        parseFloat(e.target.value) || undefined
                      )
                    }
                    className="h-8 text-sm"
                  />
                </div>
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
                      <FormLabel className="font-medium text-xs">{groupSize}</FormLabel>
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

          {/* Per Vehicle Rates Section - keeping existing implementation */}
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
                <div className="space-y-3">
                  {season.per_vehicle_rate.map((vehicle, vehicleIndex) => (
                    <div key={vehicleIndex} className="border-2 border-border/50 rounded-md p-2">
                      {/* First row - Basic vehicle info */}
                      <div className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-3 space-y-1">
                          <FormLabel className="text-xs">Vehicle Type</FormLabel>
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
                          <FormLabel className="text-xs">Brand</FormLabel>
                          <Input
                            placeholder="e.g., Toyota"
                            value={vehicle.brand || ""}
                            onChange={(e) =>
                              updatePerVehicleRate(packageIndex, seasonIndex, vehicleIndex, "brand", e.target.value)
                            }
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="col-span-2 space-y-1">
                          <FormLabel className="text-xs">Rate</FormLabel>
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
                        <div className="col-span-1 space-y-1">
                          <FormLabel className="text-xs">Max Pax</FormLabel>
                          <Input
                            type="number"
                            placeholder="-"
                            value={vehicle.max_passengers || ""}
                            onChange={(e) =>
                              updatePerVehicleRate(
                                packageIndex,
                                seasonIndex,
                                vehicleIndex,
                                "max_passengers" as any,
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="col-span-1 space-y-1">
                          <FormLabel className="text-xs">Max Lug</FormLabel>
                          <Input
                            type="number"
                            placeholder="-"
                            value={vehicle.max_luggage || ""}
                            onChange={(e) =>
                              updatePerVehicleRate(
                                packageIndex,
                                seasonIndex,
                                vehicleIndex,
                                "max_luggage" as any,
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="col-span-2 flex justify-end items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            onClick={() => {
                              const updated = [...packages];
                              const seasons = updated[packageIndex].seasons || [];
                              const currentPerVehicleRates = [...(seasons[seasonIndex].per_vehicle_rate || [])];
                              currentPerVehicleRates.push({
                                ...vehicle,
                                vehicle_type: `${vehicle.vehicle_type} (Copy)`,
                              });
                              seasons[seasonIndex].per_vehicle_rate = currentPerVehicleRates;
                              updated[packageIndex].seasons = seasons;
                              setPackages(updated);
                            }}
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

                      {/* Second row - Vehicle On Disposal specific fields */}
                      {isVehicleOnDisposal && (
                        <div className="grid grid-cols-12 gap-2 items-end mt-2 pt-2">
                          <div className="col-span-2 space-y-1">
                            <FormLabel className="text-xs">Max Hrs/Day</FormLabel>
                            <Input
                              type="number"
                              placeholder="-"
                              value={vehicle.max_hrs_day || ""}
                              onChange={(e) =>
                                updatePerVehicleRate(
                                  packageIndex,
                                  seasonIndex,
                                  vehicleIndex,
                                  "max_hrs_day",
                                  parseInt(e.target.value) || 0
                                )
                              }
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="col-span-2 space-y-1">
                            <FormLabel className="text-xs">Max Kms/Day</FormLabel>
                            <Input
                              type="number"
                              placeholder="-"
                              value={vehicle.max_kms_day || ""}
                              onChange={(e) =>
                                updatePerVehicleRate(
                                  packageIndex,
                                  seasonIndex,
                                  vehicleIndex,
                                  "max_kms_day",
                                  parseInt(e.target.value) || 0
                                )
                              }
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="col-span-2 space-y-1">
                            <FormLabel className="text-xs">Surcharge/Hr</FormLabel>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="-"
                              value={vehicle.surcharge_hr || ""}
                              onChange={(e) =>
                                updatePerVehicleRate(
                                  packageIndex,
                                  seasonIndex,
                                  vehicleIndex,
                                  "surcharge_hr",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="col-span-2 space-y-1">
                            <FormLabel className="text-xs">Surcharge/Km</FormLabel>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="-"
                              value={vehicle.surcharge_km || ""}
                              onChange={(e) =>
                                updatePerVehicleRate(
                                  packageIndex,
                                  seasonIndex,
                                  vehicleIndex,
                                  "surcharge_km",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="col-span-4 space-y-1">
                            <FormLabel className="text-xs">Extras</FormLabel>
                            <Input
                              placeholder="Additional notes..."
                              value={vehicle.extras || ""}
                              onChange={(e) =>
                                updatePerVehicleRate(packageIndex, seasonIndex, vehicleIndex, "extras", e.target.value)
                              }
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};

export default function TransferPackagesForm({
  initialData,
  syncedColumns,
  onNext,
  formRef,
}: TransferPackagesFormProps) {
  const { user } = useUser();
  const transferMode = initialData?.mode;

  const form = useForm<ITransferPackages>({
    resolver: zodResolver(TransferPackagesSchema),
    defaultValues: {
      id: initialData?.id || undefined,
      packages: initialData?.packages || [
        {
          name: "Standard Package",
          seasons: [
            {
              dates: "All Season",
              sic_rate_adult: undefined,
              sic_rate_child: undefined,
              pvt_rate: {},
              per_vehicle_rate: [],
              exception_rules: "",
            },
          ],
        },
      ],
    },
  });

  // Add-ons state
  const [availableAddOns, setAvailableAddOns] = useState<any[]>([]);
  const [isLoadingAddOns, setIsLoadingAddOns] = useState(false);

  // Fetch add-ons when component mounts or transfer ID changes
  useEffect(() => {
    const fetchAddOns = async () => {
      if (initialData?.id) {
        setIsLoadingAddOns(true);
        try {
          const { data, error } = await getTransferAddOns(initialData.id);
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

  const [packages, setPackages] = useState<ITransferPackage[]>(() => {
    if (initialData?.packages && initialData.packages.length > 0) {
      // Ensure all packages have required fields with defaults and sort by order
      return initialData.packages
        .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
        .map((pkg: any, idx: number) => ({
          ...pkg,
          preferred: pkg.preferred ?? false,
          iscombo: pkg.iscombo ?? false,
          description: pkg.description ?? "",
          remarks: pkg.remarks ?? "",
          order: pkg.order ?? idx,
          seasons: (pkg.seasons || [])
            .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
            .map((season: any, seasonIdx: number) => ({
              ...season,
              order: season.order ?? seasonIdx,
            })),
        })) as ITransferPackage[];
    }

    return [
      {
        id: crypto.randomUUID(),
        transfer_id: initialData?.id || "",
        name: "Standard Package",
        description: "",
        remarks: "",
        preferred: false,
        iscombo: false,
        order: 0,
        seasons: [
          {
            dates: "All Season",
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

  const [isLoading, setIsLoading] = useState(false);
  const [openPackages, setOpenPackages] = useState<string[]>([]);

  const onSubmit = async () => {
    setIsLoading(true);
    try {
      const transferId = initialData?.id;
      if (!transferId) throw new Error("Transfer ID is required");

      // Prepare packages for bulk upsert - ensure order and transfer_id are set
      const packagesForUpsert = packages.map((pkg: any, idx: number) => {
        const { selected_add_ons, transfer_package_add_ons, ...packageData } = pkg;

        const data: any = {
          ...packageData,
          transfer_id: transferId, // Always use the current transfer ID
          order: pkg.order !== undefined ? pkg.order : idx, // Ensure order is always set
        };
        // Generate UUID for new packages (without id or with empty string id)
        if (!data.id || data.id === "") {
          data.id = crypto.randomUUID();
        }
        return data;
      });

      // Bulk upsert all packages in one operation
      const result = await bulkUpsertTransferPackages(packagesForUpsert);
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
      const addOnResult = await bulkUpdateTransferPackageAddOns(packageAddOns);
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

      onNext(submitData);
    } catch (error) {
      console.error("Error saving packages:", error);
      toast.error("Failed to save packages");
    } finally {
      setIsLoading(false);
    }
  };

  // Package operations
  const addPackage = useCallback(() => {
    setPackages((prevPackages) => {
      const newPackage: ITransferPackage = {
        id: crypto.randomUUID(),
        transfer_id: initialData?.id || "",
        name: `Package ${prevPackages.length + 1}`,
        description: "",
        remarks: "",
        preferred: false,
        iscombo: false,
        order: prevPackages.length, // Set order to current length (0-indexed)
        seasons: [
          {
            dates: "All Season",
            sic_rate_adult: undefined,
            sic_rate_child: undefined,
            pvt_rate: {},
            per_vehicle_rate: [],
            exception_rules: "",
            order: 0,
          },
        ],
      };
      return [...prevPackages, newPackage];
    });
    setOpenPackages((prev) => [...prev, `package-${packages.length}`]);
  }, [initialData?.id, packages.length]);

  const removePackage = useCallback(
    async (packageIndex: number) => {
      const packageToDelete = packages[packageIndex];

      if (packages.length <= 1) return;

      // If package has an ID, delete from database
      if (packageToDelete.id) {
        try {
          const result = await deleteTransferPackage(packageToDelete.id);
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
      setOpenPackages((prev) =>
        prev
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
      const duplicated: ITransferPackage = JSON.parse(JSON.stringify(packageToDuplicate));
      duplicated.id = crypto.randomUUID(); // Generate new UUID for duplicated package
      duplicated.name = `${packageToDuplicate.name} (Copy)`;
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

  const updatePackageField = useCallback((packageIndex: number, field: keyof ITransferPackage, value: any) => {
    setPackages((prevPackages) => {
      const updated = [...prevPackages];
      updated[packageIndex] = {
        ...updated[packageIndex],
        [field]: value,
      };
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
          sic_rate_adult: undefined,
          sic_rate_child: undefined,
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
    (packageIndex: number, seasonIndex: number, field: keyof ISeason, value: any) => {
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
          max_passengers: 0,
          max_luggage: 0,
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
      field:
        | "rate"
        | "brand"
        | "capacity"
        | "vehicle_type"
        | "max_hrs_day"
        | "max_kms_day"
        | "surcharge_hr"
        | "surcharge_km"
        | "extras",
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

  // Add-on handlers
  const handleAddOnChange = useCallback((packageIndex: number, addOnId: string, checked: boolean) => {
    setPackages((prevPackages) => {
      const updated = [...prevPackages];
      const pkg = updated[packageIndex];
      const currentAddOns = pkg.selected_add_ons || [];
      const newAddOns = checked
        ? [...currentAddOns, { id: addOnId, is_mandatory: false }]
        : currentAddOns.filter((addOn: any) => {
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

  const handleMandatoryChange = useCallback((addOnId: string, checked: boolean) => {
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

  // Operational hours handlers
  const addOperationalHour = useCallback((packageIndex: number) => {
    setPackages((prevPackages) => {
      const updated = [...prevPackages];
      const currentHours = updated[packageIndex].operational_hours || [];
      updated[packageIndex].operational_hours = [...currentHours, { day: "", time_start: "", time_end: "" }];
      return updated;
    });
  }, []);

  const removeOperationalHour = useCallback((packageIndex: number, hourIndex: number) => {
    setPackages((prevPackages) => {
      const updated = [...prevPackages];
      const currentHours = [...(updated[packageIndex].operational_hours || [])];
      currentHours.splice(hourIndex, 1);
      updated[packageIndex].operational_hours = currentHours;
      return updated;
    });
  }, []);

  const duplicateOperationalHour = useCallback((packageIndex: number, hourIndex: number) => {
    setPackages((prevPackages) => {
      const updated = [...prevPackages];
      const currentHours = updated[packageIndex].operational_hours || [];
      const hourToDuplicate = currentHours[hourIndex];
      updated[packageIndex].operational_hours = [...currentHours, { ...hourToDuplicate }];
      return updated;
    });
  }, []);

  const updateOperationalHour = useCallback(
    (packageIndex: number, hourIndex: number, field: keyof IOperationalHours, value: string) => {
      setPackages((prevPackages) => {
        const updated = [...prevPackages];
        const currentHours = [...(updated[packageIndex].operational_hours || [])];
        currentHours[hourIndex] = {
          ...currentHours[hourIndex],
          [field]: value,
        };
        updated[packageIndex].operational_hours = currentHours;
        return updated;
      });
    },
    []
  );

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
      const oldIndex = packages.findIndex((pkg, idx) => `package-${idx}` === active.id);
      const newIndex = packages.findIndex((pkg, idx) => `package-${idx}` === over.id);
      const reorderedPackages = arrayMove(packages, oldIndex, newIndex);

      // Update order field for each package
      const packagesWithOrder = reorderedPackages.map((pkg, idx) => ({
        ...pkg,
        order: idx,
      }));

      setPackages(packagesWithOrder);

      // Save order to database for packages that have IDs (bulk update)
      const packagesWithIds = packagesWithOrder.filter((pkg) => pkg.id);
      if (packagesWithIds.length > 0) {
        try {
          const result = await bulkUpsertTransferPackages(packagesWithIds);
          if (result.error) throw new Error(result.error);
        } catch (error) {
          console.error("Error updating package order:", error);
          toast.error("Failed to update package order");
        }
      }
    }
  };

  const handleSeasonDragEnd = (packageIndex: number) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const updated = [...packages];
      const seasons = updated[packageIndex].seasons || [];
      const oldIndex = seasons.findIndex((_, idx) => `season-${packageIndex}-${idx}` === active.id);
      const newIndex = seasons.findIndex((_, idx) => `season-${packageIndex}-${idx}` === over.id);

      // Reorder and add order field to seasons
      const reorderedSeasons = arrayMove(seasons, oldIndex, newIndex).map((season, idx) => ({
        ...season,
        order: idx,
      }));

      updated[packageIndex].seasons = reorderedSeasons;
      setPackages(updated);
    }
  };

  const getIsLocked = (packageIndex: number, name: string) => {
    const pkg: any = Array.isArray(packages) ? packages[packageIndex] : {};

    const isLinked = !!pkg?.transfer_package_datastore_id && !pkg.is_unlinked;

    return isLinked && syncedColumns.includes(name);
  };

  const handleImportPackages = useCallback(
    async (selectedPackages: ITransferPackage[], relatedAddOns: ITransferAddOn[]) => {
      if (!initialData?.id) return;

      // Prepare packages for bulk upsert - remove virtual fields and ensure order is set
      const packagesForUpsert = selectedPackages.map((pkg: any, idx: number) => {
        const {
          id, // this is the datastore, we don't need this
          selected_add_ons,
          transfer_package_add_ons_datastore,
          ...packageData
        } = pkg;

        const data = {
          ...packageData,
          transfer_id: initialData?.id,
          order: pkg.order !== undefined ? pkg.order : idx, // Ensure order is always set
          // set datastore link
          transfer_package_datastore_id: pkg.id,
          is_unlinked: false,
        };
        // Generate UUID for new packages (without id or with empty string id)
        if (!data.id || data.id === "") {
          data.id = crypto.randomUUID();
        }
        return data;
      });

      // Bulk upsert all packages in one operation
      const result = await bulkUpsertTransferPackages(packagesForUpsert);
      if (result.error) throw new Error(result.error);

      const updatedPackages = result.data || [];

      // Prepare addOns for bulk upsert - remove virtual fields and set datastore link
      const relatedAddOnsFiltered = relatedAddOns.filter(
        (addOn) => !availableAddOns.some((availableAddOn) => availableAddOn.transfer_add_on_datastore_id === addOn.id)
      );

      const addOnsForUpsert = relatedAddOnsFiltered.map(({ id, ...addOn }: any) => {
        const data = {
          ...addOn,
          transfer_id: initialData?.id,
          // set datastore link
          transfer_add_on_datastore_id: id,
          is_unlinked: false,
        };
        return data;
      });

      // Bulk upsert all packages in one operation
      const { data: updatedAddOns, error: addOnError } = await bulkUpsertTransferAddOns(
        initialData.id,
        addOnsForUpsert
      );
      if (addOnError) throw new Error(addOnError);

      // Prepare all package add-ons for bulk update (single DB call instead of N calls)
      const packageAddOns = updatedPackages.map((savedPkg: any, idx: number) => {
        const pkg = selectedPackages[idx];

        // Pass full add-on objects with is_mandatory field
        const addOns = (pkg.selected_add_ons || []).map((addOn: any) => {
          const addOnId = typeof addOn === "string" ? addOn : addOn.id;
          const isMandatory = typeof addOn === "string" ? false : addOn.is_mandatory;

          const existingAddOn = availableAddOns.find((x) => x.transfer_add_on_datastore_id === addOnId);
          const updatedAddOn = updatedAddOns.find((x) => x.transfer_add_on_datastore_id === addOnId);

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
      const addOnResult = await bulkUpdateTransferPackageAddOns(packageAddOns);
      if (addOnResult.error) {
        console.error("Error updating package add-ons:", addOnResult.error);
      }

      // Merge selected_add_ons back into the response
      const finalPackages = updatedPackages.map((savedPkg: any, idx: number) => ({
        ...savedPkg,
        selected_add_ons: selectedPackages[idx].selected_add_ons?.map((addOn: any) => {
          const addOnId = typeof addOn === "string" ? addOn : addOn.id;

          const existingAddOn = availableAddOns.find((x) => x.transfer_add_on_datastore_id === addOnId);
          const updatedAddOn = updatedAddOns.find((x) => x.transfer_add_on_datastore_id === addOnId);

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
          <p className="text-sm text-muted-foreground">Configure packages with seasonal pricing</p>
        </div>
        {!!initialData?.transfer_datastore_id && !initialData.is_unlinked && (
          <ImportTransferPackagesButton
            transferDatastoreId={initialData?.transfer_datastore_id}
            currPackages={packages}
            onImport={handleImportPackages}
          />
        )}
      </div>

      <Form {...form}>
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
                    getIsLocked={getIsLocked}
                    updatePackageField={updatePackageField}
                    addSeason={addSeason}
                    sensors={sensors}
                    handleSeasonDragEnd={handleSeasonDragEnd}
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
                    setPackages={setPackages}
                    user={user}
                    availableAddOns={availableAddOns}
                    isLoadingAddOns={isLoadingAddOns}
                    handleAddOnChange={handleAddOnChange}
                    handleMandatoryChange={handleMandatoryChange}
                    addOperationalHour={addOperationalHour}
                    removeOperationalHour={removeOperationalHour}
                    duplicateOperationalHour={duplicateOperationalHour}
                    updateOperationalHour={updateOperationalHour}
                    transferMode={transferMode}
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
      </Form>
    </div>
  );
}
