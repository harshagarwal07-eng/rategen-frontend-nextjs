"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Building2,
  Map,
  Car,
  Package,
  UtensilsCrossed,
  MoreHorizontal,
  Info,
  Receipt,
  X,
  Filter,
  Check,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Command, CommandGroup, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { getServiceBreakupsByChat, deleteServiceBreakup, type ServiceBreakup, type ServiceType } from "@/data-access/service-breakups";
import { deleteActivity } from "@/data-access/itinerary-activities";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import AddBreakupSheet from "./add-breakup-sheet";

// Reusable column header filter component
interface ColumnFilterProps {
  title: string;
  options: { label: string; value: string }[];
  selected: Set<string>;
  onSelect: (value: string) => void;
  onClear: () => void;
}

function ColumnFilter({ title, options, selected, onSelect, onClear }: ColumnFilterProps) {
  const hasSelection = selected.size > 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            " h-8 data-[state=open]:bg-accent flex items-center gap-2 [&_svg:not([class*='size-'])]:size-3",
            hasSelection && "text-primary",
          )}
        >
          {title}
          <Filter className={cn(hasSelection ? "text-primary" : "text-muted-foreground")} />
          {hasSelection && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px] font-normal">
              {selected.size}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[150px] p-0" align="start">
        <Command>
          <CommandList>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selected.has(option.value);
                return (
                  <CommandItem key={option.value} onSelect={() => onSelect(option.value)} className="gap-2">
                    <div
                      className={cn(
                        "flex h-4 w-4 items-center justify-center rounded-sm border",
                        isSelected ? "bg-primary border-primary text-primary-foreground" : "opacity-50",
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                    <span className="text-xs">{option.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {hasSelection && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem onSelect={onClear} className="justify-center text-center text-xs">
                    Clear filter
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

interface DayActivity {
  service_type: "hotel" | "tour" | "transfer";
  name: string;
  id?: string;
}

interface DayData {
  day_number: number;
  date: string;
  activities: DayActivity[];
}

interface ServiceRatesProps {
  chatId: string;
  messageId?: string; // For creating breakups
  optionNumber?: number; // Multi-option support
  dayDates?: string[]; // Array of dates for each day (index 0 = day 1)
  days?: DayData[]; // Full days data with activities
  onTotalChange?: (total: number, currency: string) => void;
  onActivityDeleted?: () => void; // Callback when an activity is deleted from itinerary
}

// Category configuration for sidebar
const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ElementType; types: ServiceType[] }> = {
  total: { label: "All", icon: Receipt, types: [] },
  hotel: { label: "Hotels", icon: Building2, types: ["hotel"] },
  tour: { label: "Tours", icon: Map, types: ["tour"] },
  transfer: { label: "Transfers", icon: Car, types: ["transfer"] },
  combo: { label: "Combos", icon: Package, types: ["combo"] },
  meal: { label: "Meals", icon: UtensilsCrossed, types: ["meal"] },
  activity: { label: "Activities", icon: MoreHorizontal, types: ["activity"] },
  other: { label: "Other", icon: MoreHorizontal, types: ["other"] },
};

const SERVICE_TYPE_COLORS: Record<string, string> = {
  hotel: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
  tour: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800",
  transfer:
    "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800",
  combo: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
  meal: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800",
  activity:
    "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-800",
  other: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950 dark:text-slate-300 dark:border-slate-800",
};

function formatCurrency(amount: number | string | undefined, currency: string = "USD"): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount || 0;
  return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "–";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

export default function ServiceRates({ chatId, messageId, optionNumber, dayDates = [], days = [], onTotalChange, onActivityDeleted }: ServiceRatesProps) {
  const [breakups, setBreakups] = useState<ServiceBreakup[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("total");
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [editingBreakup, setEditingBreakup] = useState<ServiceBreakup | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [breakupToDelete, setBreakupToDelete] = useState<ServiceBreakup | null>(null);
  const [deleteMode, setDeleteMode] = useState<"breakup" | "both">("breakup");
  const [isDeleting, setIsDeleting] = useState(false);

  // Column filters
  const [dayFilter, setDayFilter] = useState<Set<string>>(new Set());
  const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set());
  const [unitFilter, setUnitFilter] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadBreakups();
  }, [chatId, optionNumber]);

  const loadBreakups = async () => {
    setLoading(true);
    try {
      const data = await getServiceBreakupsByChat(chatId, optionNumber);
      if (data) {
        setBreakups(data);
        // Calculate and report total
        const total = data.reduce((sum, b) => sum + (Number(b.final_cost) || Number(b.total_amount) || 0), 0);
        const currency = data[0]?.currency || "USD";
        onTotalChange?.(total, currency);
      }
    } catch (error) {
      console.error("[ServiceRates] Error loading breakups:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle edit
  const handleEdit = (breakup: ServiceBreakup) => {
    setEditingBreakup(breakup);
    setAddSheetOpen(true);
  };

  // Handle delete confirmation
  const handleDeleteClick = (breakup: ServiceBreakup) => {
    setBreakupToDelete(breakup);
    setDeleteMode("breakup"); // Reset to default
    setDeleteDialogOpen(true);
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!breakupToDelete) return;

    setIsDeleting(true);
    let activityWasDeleted = false;
    try {
      // Delete activity first if user chose "both" and activity_id exists
      if (deleteMode === "both" && breakupToDelete.activity_id) {
        const activityDeleted = await deleteActivity(breakupToDelete.activity_id);
        if (!activityDeleted) {
          toast.error("Failed to delete activity from itinerary");
          setIsDeleting(false);
          return;
        }
        activityWasDeleted = true;
      }

      // Delete the breakup
      const success = await deleteServiceBreakup(breakupToDelete.id);
      if (success) {
        toast.success(
          activityWasDeleted
            ? "Breakup and activity deleted"
            : "Breakup deleted"
        );
        loadBreakups();
        // Notify parent to refresh itinerary if activity was deleted
        if (activityWasDeleted) {
          onActivityDeleted?.();
        }
      } else {
        toast.error("Failed to delete breakup");
      }
    } catch (error) {
      console.error("[ServiceRates] Delete error:", error);
      toast.error("Failed to delete");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setBreakupToDelete(null);
    }
  };

  // Handle sheet close
  const handleSheetClose = (open: boolean) => {
    setAddSheetOpen(open);
    if (!open) {
      setEditingBreakup(null);
    }
  };

  // Get unique values for column filters
  const filterOptions = useMemo(() => {
    const days = [
      ...new Set(breakups.map((b) => b.day_number).filter((d): d is number => d !== null && d !== undefined)),
    ]
      .sort((a, b) => a - b)
      .map((d) => ({ label: `Day ${d}`, value: String(d) }));

    const types = [...new Set(breakups.map((b) => b.service_type))].map((t) => ({
      label: CATEGORY_CONFIG[t]?.label || t,
      value: t,
    }));

    const units = [...new Set(breakups.map((b) => b.unit_type).filter(Boolean))].map((u) => ({
      label: u.charAt(0).toUpperCase() + u.slice(1),
      value: u,
    }));

    return { days, types, units };
  }, [breakups]);

  // Toggle filter value
  const toggleFilter = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, value: string) => {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });
  };

  // Check if any filter is active
  const hasActiveFilters = dayFilter.size > 0 || typeFilter.size > 0 || unitFilter.size > 0;

  // Clear all filters
  const clearAllFilters = () => {
    setDayFilter(new Set());
    setTypeFilter(new Set());
    setUnitFilter(new Set());
  };

  // Determine which categories to show based on available data
  const availableCategories = useMemo(() => {
    const types = new Set(breakups.map((b) => b.service_type));
    const categories = [{ key: "total", ...CATEGORY_CONFIG.total }];

    Object.entries(CATEGORY_CONFIG).forEach(([key, config]) => {
      if (key !== "total" && config.types.some((t) => types.has(t))) {
        categories.push({ key, ...config });
      }
    });

    return categories;
  }, [breakups]);

  // Filter breakups for current category and column filters
  const filteredBreakups = useMemo(() => {
    let filtered = breakups;

    // Apply sidebar category filter
    if (activeTab !== "total") {
      const types = CATEGORY_CONFIG[activeTab]?.types || [];
      filtered = filtered.filter((b) => types.includes(b.service_type));
    }

    // Apply day column filter
    if (dayFilter.size > 0) {
      filtered = filtered.filter((b) => dayFilter.has(String(b.day_number)));
    }

    // Apply type column filter
    if (typeFilter.size > 0) {
      filtered = filtered.filter((b) => typeFilter.has(b.service_type));
    }

    // Apply unit column filter
    if (unitFilter.size > 0) {
      filtered = filtered.filter((b) => unitFilter.has(b.unit_type));
    }

    return filtered;
  }, [breakups, activeTab, dayFilter, typeFilter, unitFilter]);

  // Get count for a category
  const getCategoryCount = (key: string) => {
    if (key === "total") return breakups.length;
    return breakups.filter((b) => CATEGORY_CONFIG[key]?.types.includes(b.service_type)).length;
  };

  // Get total amount for a category
  const getCategoryTotal = (key: string) => {
    const items =
      key === "total" ? breakups : breakups.filter((b) => CATEGORY_CONFIG[key]?.types.includes(b.service_type));
    return items.reduce((sum, b) => sum + (Number(b.final_cost) || Number(b.total_amount) || 0), 0);
  };

  // Calculate totals for current tab
  const tabTotals = useMemo(() => {
    return filteredBreakups.reduce(
      (acc, b) => ({
        base: acc.base + (Number(b.base_cost) || Number(b.original_cost) || 0),
        discount: acc.discount + (Number(b.discount_amount) || 0),
        markup: acc.markup + (Number(b.markup_amount) || 0),
        tax: acc.tax + (Number(b.tax_amount) || 0),
        final: acc.final + (Number(b.final_cost) || Number(b.total_amount) || 0),
      }),
      { base: 0, discount: 0, markup: 0, tax: 0, final: 0 },
    );
  }, [filteredBreakups]);

  const currency = breakups[0]?.currency || "USD";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (breakups.length === 0) {
    return (
      <div className="text-center py-12 space-y-2">
        <Receipt className="w-12 h-12 mx-auto text-muted-foreground/50" />
        <p className="text-muted-foreground">No service rates available yet</p>
        <p className="text-sm text-muted-foreground">Generate a quote to see detailed pricing</p>
      </div>
    );
  }

  return (
    <>
    <TooltipProvider delayDuration={100}>
      <div className="flex h-full gap-0">
        {/* Left Sidebar - Categories */}
        <div className="w-36 shrink-0 border-r bg-muted/20">
          <div className="px-2">
            <nav className="space-y-0.5">
              {availableCategories.map((category) => {
                const isActive = activeTab === category.key;
                const count = getCategoryCount(category.key);
                const total = getCategoryTotal(category.key);

                return (
                  <button
                    key={category.key}
                    onClick={() => setActiveTab(category.key)}
                    className={cn(
                      "w-full flex flex-col items-start gap-0.5 px-2 py-2 rounded-md text-left transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <span className="text-xs font-medium truncate">{category.label}</span>
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded-full ml-auto",
                          isActive ? "bg-primary-foreground/20" : "bg-muted",
                        )}
                      >
                        {count}
                      </span>
                    </div>
                    <span
                      className={cn(
                        "text-[10px] tabular-nums",
                        isActive ? "text-primary-foreground/80" : "text-muted-foreground",
                      )}
                    >
                      {currency} {formatCurrency(total)}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Right Content - Table */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-2 space-y-2">
              {/* Header with Add button and filters */}
              <div className="flex items-center justify-between">
                <div className="flex-1 flex gap-2 items-center">
                  <p className="text-xs font-medium">Service Rates</p>
                  {/* Active filters indicator */}
                  {hasActiveFilters && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">
                        (Showing {filteredBreakups.length} of {breakups.length} items)
                      </span>
                      <Button variant="secondary" size="sm" className="h-6 text-xs" onClick={clearAllFilters}>
                        <X className="size-3" />
                        Clear
                      </Button>
                    </div>
                  )}
                </div>
                {messageId && (
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setAddSheetOpen(true)}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                )}
              </div>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="w-16">
                        <ColumnFilter
                          title="Day"
                          options={filterOptions.days}
                          selected={dayFilter}
                          onSelect={(v) => toggleFilter(setDayFilter, v)}
                          onClear={() => setDayFilter(new Set())}
                        />
                      </TableHead>
                      <TableHead className="min-w-[150px]">Service</TableHead>
                      <TableHead className="w-24">
                        <ColumnFilter
                          title="Type"
                          options={filterOptions.types}
                          selected={typeFilter}
                          onSelect={(v) => toggleFilter(setTypeFilter, v)}
                          onClear={() => setTypeFilter(new Set())}
                        />
                      </TableHead>
                      <TableHead className="w-24">
                        <ColumnFilter
                          title="Unit"
                          options={filterOptions.units}
                          selected={unitFilter}
                          onSelect={(v) => toggleFilter(setUnitFilter, v)}
                          onClear={() => setUnitFilter(new Set())}
                        />
                      </TableHead>
                      <TableHead className="text-center w-12">Qty</TableHead>
                      <TableHead className="text-right w-20">Base</TableHead>
                      <TableHead className="text-right w-20">Discount</TableHead>
                      <TableHead className="text-right w-20">Markup</TableHead>
                      <TableHead className="text-right w-16">Tax</TableHead>
                      <TableHead className="text-right w-24">Total</TableHead>
                      <TableHead className="w-8"></TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBreakups.map((breakup) => {
                      const baseCost = Number(breakup.rate_per_unit) || 0;
                      const discountAmount = Number(breakup.discount_amount) || 0;
                      const markupAmount = Number(breakup.markup_amount) || 0;
                      const taxAmount = Number(breakup.tax_amount) || 0;
                      const finalCost = Number(breakup.final_cost) || Number(breakup.total_amount) || 0;
                      const qty = breakup.quantity || breakup.quantity_value || 1;
                      const hasNotes = breakup.calculation_notes && breakup.calculation_notes.length > 0;
                      const isIncluded = breakup.price_source === "included" || breakup.price_source === "combo";

                      return (
                        <TableRow key={breakup.id} className={cn("hover:bg-muted/30", isIncluded && "opacity-60")}>
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center">
                              <span className="font-medium text-xs">{breakup.day_number || "–"}</span>
                              {(breakup.service_date || breakup.date_range) && (
                                <span className="text-[10px] text-muted-foreground">
                                  {formatDate(breakup.service_date || breakup.date_range)}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-0.5">
                              <p className="font-medium text-xs leading-tight">
                                {breakup.service_name}{" "}
                                {/* {breakup.service_type === "transfer" &&
                                  (breakup.unit_type === "vehicle" ? "- PVT" : "- SIC")} */}
                              </p>
                              {isIncluded && breakup.included_in && (
                                <p className="text-[10px] text-muted-foreground italic">
                                  Included in {breakup.included_in}
                                </p>
                              )}
                              {breakup.service_context && (
                                <p className="text-[10px] text-muted-foreground italic">{breakup.service_context}</p>
                              )}
                              {breakup.discount_name && discountAmount > 0 && (
                                <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                                  {breakup.discount_name}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn("text-[10px] px-1.5", SERVICE_TYPE_COLORS[breakup.service_type])}
                            >
                              {CATEGORY_CONFIG[breakup.service_type]?.label || breakup.service_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center text-xs capitalize">{breakup.unit_type}</TableCell>
                          <TableCell className="text-center tabular-nums text-xs">{qty}</TableCell>
                          <TableCell className="text-right tabular-nums text-xs">
                            {baseCost > 0 ? formatCurrency(baseCost) : <span className="text-muted-foreground">–</span>}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-xs">
                            {discountAmount > 0 ? (
                              <span className="text-emerald-600 dark:text-emerald-400">
                                -{formatCurrency(discountAmount)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">–</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-xs">
                            {markupAmount > 0 ? (
                              <span>+{formatCurrency(markupAmount)}</span>
                            ) : (
                              <span className="text-muted-foreground">–</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-xs">
                            {taxAmount > 0 ? (
                              <span>+{formatCurrency(taxAmount)}</span>
                            ) : (
                              <span className="text-muted-foreground">–</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-xs font-semibold">
                            {formatCurrency(finalCost)}
                          </TableCell>
                          <TableCell className="text-center p-1">
                            {hasNotes && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button className="p-1 hover:bg-muted rounded">
                                    <Info className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="max-w-xs">
                                  <div className="space-y-1 text-xs">
                                    <p className="font-medium">Calculation Notes</p>
                                    <ul className="space-y-0.5">
                                      {breakup.calculation_notes?.map((note, idx) => (
                                        <li key={idx}>• {note}</li>
                                      ))}
                                    </ul>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </TableCell>
                          <TableCell className="p-1">
                            <DropdownMenu modal={false}>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <MoreHorizontal className="h-3.5 w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(breakup)}>
                                  <Pencil className="h-3.5 w-3.5 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDeleteClick(breakup)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {/* Totals Row */}
                    <TableRow className="bg-muted/50 font-semibold border-t-2">
                      <TableCell></TableCell>
                      <TableCell className="text-xs">Total ({filteredBreakups.length} items)</TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-right tabular-nums text-xs">
                        {formatCurrency(tabTotals.base)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-xs">
                        {tabTotals.discount > 0 ? (
                          <span className="text-primary">-{formatCurrency(tabTotals.discount)}</span>
                        ) : (
                          <span className="text-muted-foreground">–</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-xs">
                        {tabTotals.markup > 0 ? (
                          <span>+{formatCurrency(tabTotals.markup)}</span>
                        ) : (
                          <span className="text-muted-foreground">–</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-xs">
                        {tabTotals.tax > 0 ? (
                          <span>+{formatCurrency(tabTotals.tax)}</span>
                        ) : (
                          <span className="text-muted-foreground">–</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-xs">
                        {currency} {formatCurrency(tabTotals.final)}
                      </TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Add/Edit Breakup Sheet */}
      {messageId && (
        <AddBreakupSheet
          open={addSheetOpen}
          onOpenChange={handleSheetClose}
          chatId={chatId}
          messageId={messageId}
          optionNumber={optionNumber}
          dayDates={dayDates}
          days={days}
          defaultServiceType={activeTab as ServiceType | "total"}
          currency={currency}
          editingBreakup={editingBreakup}
          onSuccess={loadBreakups}
        />
      )}
    </TooltipProvider>

    {/* Delete Confirmation Dialog - Outside TooltipProvider to avoid focus issues */}
    {breakupToDelete && (
      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => {
        setDeleteDialogOpen(open);
        if (!open) {
          setBreakupToDelete(null);
          setDeleteMode("breakup");
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Breakup</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{breakupToDelete.service_name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Show options only if breakup is linked to an activity */}
          {breakupToDelete.activity_id && (
            <div className="py-4">
              <RadioGroup value={deleteMode} onValueChange={(v) => setDeleteMode(v as "breakup" | "both")}>
                <div className="flex items-start space-x-3 p-3 rounded-md border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="breakup" id="delete-breakup" className="mt-0.5" />
                  <div className="space-y-1">
                    <Label htmlFor="delete-breakup" className="font-medium cursor-pointer">
                      Delete rate only
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Remove from service rates but keep the activity in itinerary
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 rounded-md border hover:bg-muted/50 cursor-pointer mt-2">
                  <RadioGroupItem value="both" id="delete-both" className="mt-0.5" />
                  <div className="space-y-1">
                    <Label htmlFor="delete-both" className="font-medium cursor-pointer">
                      Delete rate and activity
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Remove from both service rates and itinerary
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )}
  </>
  );
}
