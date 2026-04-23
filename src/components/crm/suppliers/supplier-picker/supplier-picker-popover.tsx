"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, Pencil, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { getSupplierOptions } from "@/data-access/suppliers";
import type { ItemTypes } from "@/types/suppliers";

type SupplierOption = { label: string; value: string; inactive?: boolean };

interface SupplierPickerPopoverProps {
  itemType: ItemTypes;
  existingSupplierIds: string[];
  onSelect: (supplierId: string, supplierName: string) => void;
  onCreateNew: () => void;
  // Optional: pre-loaded list from parent (avoids redundant fetches per card)
  suppliers?: SupplierOption[];
  // For inline display of selected value
  selectedSupplierId?: string;
  selectedSupplierName?: string;
  selectedInactive?: boolean;
  // Edit callback — if provided, edit icon appears per item
  onEdit?: (supplierId: string) => void;
}

export default function SupplierPickerPopover({
  existingSupplierIds,
  onSelect,
  onCreateNew,
  suppliers: suppliersProp,
  selectedSupplierId,
  selectedSupplierName,
  selectedInactive,
  onEdit,
}: SupplierPickerPopoverProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selfLoaded, setSelfLoaded] = useState<SupplierOption[]>([]);

  // Self-load when no suppliers are provided by parent (backward compat)
  useEffect(() => {
    if (suppliersProp !== undefined) return;
    getSupplierOptions().then((data) => setSelfLoaded(data as SupplierOption[]));
  }, [suppliersProp]);

  const suppliers = suppliersProp ?? selfLoaded;

  // Only show active suppliers in the dropdown list
  const activeSuppliers = useMemo(() => suppliers.filter((s) => !s.inactive), [suppliers]);

  const filtered = useMemo(
    () => activeSuppliers.filter((s) => s.label.toLowerCase().includes(search.toLowerCase())),
    [activeSuppliers, search]
  );

  const handleSelect = (option: SupplierOption) => {
    if (existingSupplierIds.includes(option.value)) return;
    onSelect(option.value, option.label);
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between h-10", !selectedSupplierId && "text-muted-foreground")}
        >
          {selectedSupplierId ? (
            <span className="flex items-center gap-2">
              {selectedSupplierName || selectedSupplierId}
              {selectedInactive && (
                <Badge variant="outline" className="text-xs text-muted-foreground border-muted-foreground/40">
                  Inactive
                </Badge>
              )}
            </span>
          ) : (
            "Select supplier..."
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-[--radix-popover-trigger-width] min-w-xs p-0">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search supplier..." value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>No suppliers found.</CommandEmpty>
            <CommandGroup>
              {filtered.map((option) => {
                const alreadyAdded = existingSupplierIds.includes(option.value);
                const isSelected = selectedSupplierId === option.value;
                return (
                  <CommandItem
                    key={option.value}
                    onSelect={() => handleSelect(option)}
                    disabled={alreadyAdded}
                    className="justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className={alreadyAdded ? "text-muted-foreground" : ""}>{option.label}</span>
                      {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                      {alreadyAdded && !isSelected && <Check className="h-4 w-4 text-muted-foreground shrink-0" />}
                    </div>
                    {onEdit && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="hover:border border-primary shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpen(false);
                          onEdit(option.value);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5 text-primary" />
                      </Button>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>

          <div className="border-t p-2">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                setOpen(false);
                onCreateNew();
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New Supplier
            </Button>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
