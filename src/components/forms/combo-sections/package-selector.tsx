"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, GripVertical, Loader2, X, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { IComboItem } from "../schemas/combos-datastore-schema";
import { getAllToursByUser, getTourPackageById } from "@/data-access/tours";
import { getAllTransfersByUser, getTransferPackageById } from "@/data-access/transfers";
import PackageDetailsSheet from "./package-details-sheet";
import { toast } from "sonner";
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
import { VirtualizedAutocomplete } from "@/components/ui/virtualized-autocomplete";

interface PackageSelectorProps {
  items: IComboItem[];
  onItemsChange: (items: IComboItem[]) => void;
  onCopyAgePolicy: (sourcePackage: any) => void;
  selectedCountry?: string;
}

// Sortable Item Component
interface SortableItemProps {
  item: IComboItem;
  index: number;
  onRemove: (index: number) => void;
  onViewDetails: (item: IComboItem) => void;
}

const SortableItem = ({ item, index, onRemove, onViewDetails }: SortableItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `item-${index}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 border-2 border-border rounded-lg bg-card"
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 flex items-center gap-2">
        <span className="font-medium text-sm">{item.package_name}</span>
        <Badge variant="secondary" className="ml-2">
          {item.item_type === "tour" ? item.tour_name : item.transfer_name}
        </Badge>
        <Badge variant="outline" className="capitalize">
          {item.item_type}
        </Badge>
      </div>
      <Button type="button" variant="ghost" size="sm" onClick={() => onViewDetails(item)} className="h-7 px-2">
        <Info className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onRemove(index)}
        className="text-destructive hover:text-destructive h-7 px-2"
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
};

const defaultParams = {
  perPage: 200,
  page: 1,
  search: "",
  sort: [],
  country: [],
  state: [],
  city: [],
  guide_type: [],
  currency: [],
};

export default function PackageSelector({ items, onItemsChange, selectedCountry }: PackageSelectorProps) {
  const [activeType, setActiveType] = useState<"tour" | "transfer" | null>(null);
  const [selectedParent, setSelectedParent] = useState<string>("");
  const [selectedPackage, setSelectedPackage] = useState<string>("");
  const [viewItem, setViewItem] = useState<IComboItem | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [packageLoading, setPackageLoading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch tours with caching
  const { data: toursData, isLoading: toursLoading } = useQuery({
    queryKey: ["combo-tours-list"],
    queryFn: () => getAllToursByUser(defaultParams),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch transfers with caching
  const { data: transfersData, isLoading: transfersLoading } = useQuery({
    queryKey: ["combo-transfers-list"],
    queryFn: () => getAllTransfersByUser(defaultParams),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const tours = toursData?.data || [];
  const transfers = transfersData?.data || [];

  // Filter tours/transfers by selected country
  const filteredTours = useMemo(() => {
    if (!selectedCountry) return tours;
    return tours.filter((t: any) => t.country === selectedCountry);
  }, [tours, selectedCountry]);

  const filteredTransfers = useMemo(() => {
    if (!selectedCountry) return transfers;
    return transfers.filter((t: any) => t.country === selectedCountry);
  }, [transfers, selectedCountry]);

  const isLoading = activeType === "tour" ? toursLoading : activeType === "transfer" ? transfersLoading : false;

  // Convert tours/transfers to options format for VirtualizedAutocomplete
  const parentOptions = useMemo(() => {
    if (activeType === "tour") {
      return filteredTours.map((t: any) => ({ value: t.id, label: t.tour_name }));
    }
    if (activeType === "transfer") {
      return filteredTransfers.map((t: any) => ({ value: t.id, label: t.transfer_name }));
    }
    return [];
  }, [activeType, filteredTours, filteredTransfers]);

  const getSelectedParentData = useCallback(() => {
    if (activeType === "tour") {
      return tours.find((t: any) => t.id === selectedParent);
    }
    if (activeType === "transfer") {
      return transfers.find((t: any) => t.id === selectedParent);
    }
    return null;
  }, [activeType, tours, transfers, selectedParent]);

  // Convert packages to options format for VirtualizedAutocomplete
  const packageOptions = useMemo(() => {
    const parent = getSelectedParentData();
    if (!parent) return [];
    const packages = parent.packages || [];
    return packages.map((pkg: any) => ({ value: pkg.id, label: pkg.name }));
  }, [getSelectedParentData]);

  const handleAddTourClick = () => {
    setActiveType("tour");
    setSelectedParent("");
    setSelectedPackage("");
  };

  const handleAddTransferClick = () => {
    setActiveType("transfer");
    setSelectedParent("");
    setSelectedPackage("");
  };

  const handleCancel = () => {
    setActiveType(null);
    setSelectedParent("");
    setSelectedPackage("");
  };

  const handleParentChange = (value: string) => {
    setSelectedParent(value);
    setSelectedPackage("");
  };

  const handleAddPackage = () => {
    if (!activeType) return;

    const parent = getSelectedParentData();
    const packages = parent?.packages || [];
    const pkg = packages.find((p: any) => p.id === selectedPackage);

    if (!parent || !pkg) {
      toast.error("Please select both a tour/transfer and a package");
      return;
    }

    // Check if already added
    const alreadyExists = items.some(
      (item) =>
        (activeType === "tour" && item.tour_package_id === pkg.id) ||
        (activeType === "transfer" && item.transfer_package_id === pkg.id)
    );

    if (alreadyExists) {
      toast.error("This package is already added");
      return;
    }

    const newItem: IComboItem = {
      item_type: activeType,
      tour_id: activeType === "tour" ? parent.id : undefined,
      transfer_id: activeType === "transfer" ? parent.id : undefined,
      tour_package_id: activeType === "tour" ? pkg.id : undefined,
      transfer_package_id: activeType === "transfer" ? pkg.id : undefined,
      package_name: pkg.name,
      tour_name: activeType === "tour" ? parent.tour_name : undefined,
      transfer_name: activeType === "transfer" ? parent.transfer_name : undefined,
      source_package: { ...pkg, parent_age_policy: parent.age_policy },
      order: items.length,
    };

    onItemsChange([...items, newItem]);
    setSelectedParent("");
    setSelectedPackage("");
    toast.success("Package added");
  };

  const removeItem = useCallback(
    (index: number) => {
      onItemsChange(items.filter((_, i) => i !== index));
    },
    [items, onItemsChange]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = parseInt(String(active.id).replace("item-", ""));
      const newIndex = parseInt(String(over.id).replace("item-", ""));

      onItemsChange(arrayMove(items, oldIndex, newIndex));
    },
    [items, onItemsChange]
  );

  const handleViewDetails = useCallback(async (item: IComboItem) => {
    // Set basic item info first (for header display)
    setViewItem(item);
    setSheetOpen(true);
    setPackageLoading(true);

    try {
      let packageData = null;

      if (item.item_type === "tour" && item.tour_package_id) {
        const result = await getTourPackageById(item.tour_package_id);
        if (result.error) {
          toast.error("Failed to load package details");
          console.error(result.error);
          setPackageLoading(false);
          return;
        }
        packageData = result.data;
      } else if (item.item_type === "transfer" && item.transfer_package_id) {
        const result = await getTransferPackageById(item.transfer_package_id);
        if (result.error) {
          toast.error("Failed to load package details");
          console.error(result.error);
          setPackageLoading(false);
          return;
        }
        packageData = result.data;
      }

      if (packageData) {
        // Update the item with fetched package data
        setViewItem({
          ...item,
          source_package: packageData,
        });
      }
    } catch (error) {
      toast.error("Failed to load package details");
      console.error(error);
    } finally {
      setPackageLoading(false);
    }
  }, []);

  return (
    <div className="space-y-4">
      {/* Add buttons */}
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={handleAddTourClick}>
          <Plus className="h-4 w-4 mr-2" />
          Add Tour Package
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={handleAddTransferClick}>
          <Plus className="h-4 w-4 mr-2" />
          Add Transfer Package
        </Button>
      </div>

      {/* Inline Add Row - shows when a type is selected */}
      {activeType && (
        <div className="border-2 border-primary/20 rounded-lg p-4 bg-accent/10">
          <div className="grid grid-cols-12 gap-3 items-end">
            {/* Parent Selector */}
            <div className="col-span-5">
              {isLoading ? (
                <div className="flex items-center gap-2 h-10 px-3 border-2 rounded-md bg-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Loading...</span>
                </div>
              ) : (
                <VirtualizedAutocomplete
                  options={parentOptions}
                  value={selectedParent}
                  onChange={handleParentChange}
                  placeholder={`Select ${activeType}...`}
                  searchPlaceholder={`Search ${activeType}s...`}
                  maxResults={50}
                />
              )}
            </div>

            {/* Package Selector */}
            <div className="col-span-4">
              <VirtualizedAutocomplete
                options={packageOptions}
                value={selectedPackage}
                onChange={setSelectedPackage}
                placeholder="Select package..."
                searchPlaceholder="Search packages..."
                maxResults={50}
              />
            </div>

            {/* Add Button */}
            <div className="col-span-2">
              <Button
                type="button"
                onClick={handleAddPackage}
                disabled={!selectedParent || !selectedPackage}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>

            {/* Cancel Button */}
            <div className="col-span-1">
              <Button type="button" variant="ghost" size="icon" onClick={handleCancel}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Selected items list */}
      {items.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((_, i) => `item-${i}`)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {items.map((item, index) => (
                <SortableItem
                  key={`item-${index}`}
                  item={item}
                  index={index}
                  onRemove={removeItem}
                  onViewDetails={handleViewDetails}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {items.length === 0 && !activeType && (
        <div className="border-2 border-dashed border-border rounded-lg p-6 text-center text-muted-foreground bg-muted/30">
          <p className="text-sm">No packages added yet</p>
          <p className="text-xs mt-1">Click the buttons above to add tour or transfer packages</p>
        </div>
      )}

      {/* Package Details Sheet */}
      <PackageDetailsSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        item={viewItem}
        isLoading={packageLoading}
      />
    </div>
  );
}
