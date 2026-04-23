"use client";

import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DriverQuickForm } from "@/components/forms/library-forms/driver-quick-form";
import { VehicleQuickForm } from "@/components/forms/library-forms/vehicle-quick-form";
import { GuideQuickForm } from "@/components/forms/library-forms/guide-quick-form";
import { RestaurantQuickForm } from "@/components/forms/library-forms/restaurant-quick-form";
import { getDriverOptions, getVehicleOptions, getGuideOptions, getRestaurantOptions } from "@/data-access/docs";
import type { LibraryType } from "@/types/docs";
import type { IOption } from "@/types/common";

const TYPE_LABELS: Record<LibraryType, string> = {
  drivers: "Driver",
  vehicles: "Vehicle",
  guides: "Guide",
  restaurants: "Restaurant",
};

export interface LibraryItemPickerProps {
  type: LibraryType;
  value?: string;
  onChange: (id: string, label: string) => void;
  supplierId?: string;
  /** Pass pre-fetched options to skip internal fetching */
  options?: IOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export default function LibraryItemPicker({
  type,
  value,
  onChange,
  supplierId,
  options: optionsProp,
  placeholder,
  disabled,
  className,
}: LibraryItemPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [localOptions, setLocalOptions] = useState<IOption[]>([]);
  const queryClient = useQueryClient();

  const queryKey = ["library-options", type, supplierId ?? null];

  const { data: fetchedOptions = [] } = useQuery<IOption[]>({
    queryKey,
    queryFn: () => {
      switch (type) {
        case "drivers":
          return getDriverOptions(supplierId);
        case "vehicles":
          return getVehicleOptions(supplierId);
        case "guides":
          return getGuideOptions();
        case "restaurants":
          return getRestaurantOptions();
      }
    },
    enabled: optionsProp === undefined,
  });

  const baseOptions = optionsProp ?? fetchedOptions;

  // Merge locally added new items (avoids waiting for re-fetch)
  const options = useMemo(() => {
    if (localOptions.length === 0) return baseOptions;
    const existingIds = new Set(baseOptions.map((o) => o.value));
    return [...baseOptions, ...localOptions.filter((o) => !existingIds.has(o.value))];
  }, [baseOptions, localOptions]);

  const filtered = useMemo(
    () => options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase())),
    [options, search]
  );

  const selectedLabel = options.find((o) => o.value === value)?.label;
  const typeLabel = TYPE_LABELS[type];

  const handleSelect = (option: IOption) => {
    onChange(option.value, option.label);
    setOpen(false);
    setSearch("");
  };

  const handleCreated = (id: string, label: string) => {
    setLocalOptions((prev) => [...prev, { value: id, label }]);
    queryClient.invalidateQueries({ queryKey });
    onChange(id, label);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn("w-full justify-between h-10", !value && "text-muted-foreground", className)}
          >
            <span className="truncate">{selectedLabel ?? (placeholder || `Select ${typeLabel.toLowerCase()}...`)}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50 shrink-0" />
          </Button>
        </PopoverTrigger>

        <PopoverContent align="start" className="w-[--radix-popover-trigger-width] min-w-xs p-0">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={`Search ${typeLabel.toLowerCase()}...`}
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>No {typeLabel.toLowerCase()}s found.</CommandEmpty>
              <CommandGroup>
                {filtered.map((option) => (
                  <CommandItem key={option.value} onSelect={() => handleSelect(option)} className="cursor-pointer">
                    <Check className={cn("mr-2 h-4 w-4", value === option.value ? "opacity-100" : "opacity-0")} />
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>

            <div className="border-t p-2">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setOpen(false);
                  setCreateOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New {typeLabel}
              </Button>
            </div>
          </Command>
        </PopoverContent>
      </Popover>

      <Sheet open={createOpen} onOpenChange={(open) => !open && setCreateOpen(false)}>
        <SheetContent className="sm:max-w-2xl flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 py-4 border-b">
            <SheetTitle>New {typeLabel}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {type === "drivers" && (
              <DriverQuickForm
                supplierId={supplierId}
                onSave={(id, label) => {
                  handleCreated(id, label);
                  setCreateOpen(false);
                }}
              />
            )}
            {type === "vehicles" && (
              <VehicleQuickForm
                supplierId={supplierId}
                onSave={(id, label) => {
                  handleCreated(id, label);
                  setCreateOpen(false);
                }}
              />
            )}
            {type === "guides" && (
              <GuideQuickForm
                supplierId={supplierId}
                onSave={(id, label) => {
                  handleCreated(id, label);
                  setCreateOpen(false);
                }}
              />
            )}
            {type === "restaurants" && (
              <RestaurantQuickForm
                onSave={(id, label) => {
                  handleCreated(id, label);
                  setCreateOpen(false);
                }}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
