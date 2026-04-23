"use client";

import { Search, X, ListFilter, XCircle, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { IOption } from "@/types/common";
import { useQueryStates } from "nuqs";
import { bookingsSearchParams } from "../bookings-searchparams";
import { useMemo, useState } from "react";
import {
  SERVICE_TYPE_CONFIGS,
  BOOKING_STATUS_CONFIGS,
  PAYMENT_STATUS_CONFIGS,
  VOUCHER_STATUS_CONFIGS,
} from "@/lib/status-styles-config";

function StaticFilterPopover({
  title,
  selected,
  options,
  onChange,
}: {
  title: string;
  selected: string[];
  options: IOption[];
  onChange: (values: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const toggle = (opt: IOption) => {
    const next = new Set(selectedSet);
    if (next.has(opt.value)) next.delete(opt.value);
    else next.add(opt.value);
    onChange(Array.from(next));
  };

  const clearFilter = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 border-dashed text-xs">
          {selectedSet.size > 0 ? (
            <span role="button" tabIndex={0} onClick={clearFilter} className="opacity-70 hover:opacity-100">
              <XCircle className="size-3.5" />
            </span>
          ) : (
            <ListFilter className="size-3.5" />
          )}
          {title}
          {selectedSet.size > 0 && (
            <>
              <Separator orientation="vertical" className="mx-0.5 data-[orientation=vertical]:h-4" />
              {selectedSet.size > 2 ? (
                <Badge variant="secondary" className="rounded-sm px-1 font-normal text-xs">
                  {selectedSet.size} selected
                </Badge>
              ) : (
                options
                  .filter((o) => selectedSet.has(o.value))
                  .map((o) => (
                    <Badge key={o.value} variant="secondary" className="rounded-sm px-1 font-normal text-xs">
                      {o.label}
                    </Badge>
                  ))
              )}
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[180px] p-0" align="start">
        <Command>
          <CommandInput placeholder={title} className="h-9" />
          <CommandList className="max-h-full">
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup className="max-h-[300px] overflow-y-auto">
              {options.map((opt) => {
                const isSelected = selectedSet.has(opt.value);
                return (
                  <CommandItem key={opt.value} onSelect={() => toggle(opt)}>
                    <div
                      className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                        isSelected ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible"
                      )}
                    >
                      <Check className="h-4 w-4" />
                    </div>
                    <span className="text-xs">{opt.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {selectedSet.size > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem onSelect={() => onChange([])} className="justify-center text-xs">
                    Clear filters
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

const SERVICE_TYPE_OPTIONS: IOption[] = SERVICE_TYPE_CONFIGS.map((c) => ({ label: c.label, value: c.value }));
const BOOKING_STATUS_OPTIONS: IOption[] = BOOKING_STATUS_CONFIGS.map((c) => ({ label: c.label, value: c.value }));
const PAYMENT_STATUS_OPTIONS: IOption[] = PAYMENT_STATUS_CONFIGS.map((c) => ({ label: c.label, value: c.value }));
const VOUCHER_STATUS_OPTIONS: IOption[] = VOUCHER_STATUS_CONFIGS.map((c) => ({ label: c.label, value: c.value }));

interface CalendarFiltersProps {
  startTransition: React.TransitionStartFunction;
  search: string;
  onSearchChange: (v: string) => void;
}

export function CalendarFilters({ startTransition, search, onSearchChange }: CalendarFiltersProps) {
  const [params, setParams] = useQueryStates(bookingsSearchParams, {
    shallow: false,
    startTransition,
  });

  const hasActiveFilters =
    params.booking_status.length > 0 ||
    params.payment_status.length > 0 ||
    params.voucher_status.length > 0 ||
    params.service_type.length > 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search */}
      <div className="relative w-64">
        <Search className="size-3.5 absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          className="pl-8 text-xs h-8"
          placeholder="Search by name, traveler, ID..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {search && (
          <button
            className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => onSearchChange("")}
          >
            <X className="size-3" />
          </button>
        )}
      </div>

      {/* Service Type */}
      <StaticFilterPopover
        title="Service Type"
        selected={params.service_type}
        options={SERVICE_TYPE_OPTIONS}
        onChange={(v) => setParams({ service_type: v })}
      />

      {/* Booking Status */}
      <StaticFilterPopover
        title="Booking Status"
        selected={params.booking_status}
        options={BOOKING_STATUS_OPTIONS}
        onChange={(v) => setParams({ booking_status: v })}
      />

      {/* Payment Status */}
      <StaticFilterPopover
        title="Payment Status"
        selected={params.payment_status}
        options={PAYMENT_STATUS_OPTIONS}
        onChange={(v) => setParams({ payment_status: v })}
      />

      {/* Voucher Status */}
      <StaticFilterPopover
        title="Voucher Status"
        selected={params.voucher_status}
        options={VOUCHER_STATUS_OPTIONS}
        onChange={(v) => setParams({ voucher_status: v })}
      />

      {/* Reset filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs text-muted-foreground"
          onClick={() =>
            setParams({
              booking_status: [],
              payment_status: [],
              voucher_status: [],
              service_type: [],
            })
          }
        >
          <X className="size-3 mr-1" />
          Reset filters
        </Button>
      )}
    </div>
  );
}
