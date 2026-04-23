"use client";

import { memo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DragEndEvent } from "@dnd-kit/core";
import {
  GripVertical,
  ChevronDown,
  PackageIcon,
  Copy,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ITourPackage, ITourSeason } from "../schemas/tours-datastore-schema";

interface SortablePackageProps {
  pkg: ITourPackage;
  packageIndex: number;
  updatePackageName: (packageIndex: number, name: string) => void;
  duplicatePackage: (packageIndex: number) => void;
  removePackage: (packageIndex: number) => void;
  packagesLength: number;
  user: any;
  updatePackageField: (
    packageIndex: number,
    field: keyof ITourPackage,
    value: any
  ) => void;
  handlePreferredChange: (packageIndex: number, checked: boolean) => void;
  handleComboChange: (packageIndex: number, checked: boolean) => void;
  handleAddOnChange: (
    packageIndex: number,
    addOnId: string,
    checked: boolean
  ) => void;
  availableAddOns: any[];
  sensors: any;
  handleSeasonDragEnd: (packageIndex: number) => (event: DragEndEvent) => void;
  addSeason: (packageIndex: number) => void;
  packages: ITourPackage[];
  updateSeasonField: (
    packageIndex: number,
    seasonIndex: number,
    field: keyof ITourSeason,
    value: any
  ) => void;
  removeSeason: (packageIndex: number, seasonIndex: number) => void;
  duplicateSeason: (packageIndex: number, seasonIndex: number) => void;
  addPvtRate: (packageIndex: number, seasonIndex: number) => void;
  removePvtRate: (
    packageIndex: number,
    seasonIndex: number,
    paxKey: string
  ) => void;
  updatePvtRate: (
    packageIndex: number,
    seasonIndex: number,
    paxKey: string,
    rate: number
  ) => void;
  addPerVehicleRate: (packageIndex: number, seasonIndex: number) => void;
  removePerVehicleRate: (
    packageIndex: number,
    seasonIndex: number,
    vehicleIndex: number
  ) => void;
  updatePerVehicleRate: (
    packageIndex: number,
    seasonIndex: number,
    vehicleIndex: number,
    field: "rate" | "brand" | "capacity" | "vehicle_type",
    value: string | number
  ) => void;
  duplicatePerVehicleRate: (
    packageIndex: number,
    seasonIndex: number,
    vehicleIndex: number
  ) => void;
  handleIncludesTransferChange: (
    packageIndex: number,
    checked: boolean
  ) => void;
}

const SortablePackage = memo(({
  pkg,
  packageIndex,
  updatePackageName,
  duplicatePackage,
  removePackage,
  packagesLength,
  user,
  updatePackageField,
  handlePreferredChange,
  handleComboChange,
  handleAddOnChange,
  availableAddOns,
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
}: SortablePackageProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `package-${packageIndex}` });

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
              <span className="text-base font-semibold">
                {pkg.name || "Unnamed Package"}
              </span>
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
          {/* Component content will be imported from main file */}
          <div>Package content placeholder - will be filled from extraction</div>
        </AccordionContent>
      </AccordionItem>
    </div>
  );
});

SortablePackage.displayName = "SortablePackage";

export default SortablePackage;
