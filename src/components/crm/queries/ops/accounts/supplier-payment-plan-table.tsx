"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronRight,
  Filter,
  Check,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Plus,
  Pencil,
  Dot,
  RefreshCw,
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandGroup, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import { getServicesWithPaymentPlans } from "@/data-access/ops-accounts";
import { groupServicesByPaymentPlan } from "@/lib/utils/ops-suppliers-utils";
import { PaymentPlanGroupedRow } from "@/types/ops-accounts";
import { getServiceTypeConfig, getPaymentStatusConfig } from "@/lib/status-styles-config";
import PaymentConfigurationForm from "@/components/forms/ops-forms/payment-configuration-form";
import PaymentPlanInstallments from "./payment-plan-installments";
import { TooltipButton } from "@/components/ui/tooltip-button";
import { EyePopover } from "@/components/ui/table/eye-popover";

type Props = {
  queryId: string;
  onEditPlan?: (paymentPlanId: string) => void;
  onRefresh?: () => void;
  isFetching?: boolean;
};

// Column filter component
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
            "h-8 data-[state=open]:bg-accent flex gap-2 [&_svg:not([class*='size-'])]:size-3",
            hasSelection && "text-primary"
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
                        isSelected ? "bg-primary border-primary text-primary-foreground" : "opacity-50"
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

// Sort button component
interface SortButtonProps {
  title: string;
  sortKey: string;
  currentSort: { key: string; direction: "asc" | "desc" } | null;
  onSort: (key: string) => void;
}

function SortButton({ title, sortKey, currentSort, onSort }: SortButtonProps) {
  const isActive = currentSort?.key === sortKey;
  const Icon = !isActive ? ArrowUpDown : currentSort.direction === "asc" ? ArrowUp : ArrowDown;

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("h-8 flex items-center gap-2 [&_svg:not([class*='size-'])]:size-3", isActive && "text-primary")}
      onClick={() => onSort(sortKey)}
    >
      {title}
      <Icon className={cn(isActive ? "text-primary" : "text-muted-foreground")} />
    </Button>
  );
}

export default function SupplierPaymentPlanTable({ queryId, onEditPlan, onRefresh, isFetching }: Props) {
  const queryClient = useQueryClient();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  // Filter states
  const [itemTypeFilter, setItemTypeFilter] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());

  // Sort state
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  // Payment configuration form state
  const [paymentFormOpen, setPaymentFormOpen] = useState(false);
  const [formSupplierInfo, setFormSupplierInfo] = useState<{
    supplierId: string;
    supplierName: string;
    serviceIds: string[];
  } | null>(null);

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["services-with-payment-plans", queryId],
    queryFn: () => getServicesWithPaymentPlans(queryId),
    enabled: !!queryId,
    staleTime: 0,
    gcTime: 0,
  });

  const groupedRows = useMemo(() => {
    return groupServicesByPaymentPlan(services);
  }, [services]);

  // Get unique filter options
  const filterOptions = useMemo(() => {
    const itemTypes = new Set<string>();
    const statuses = new Set<string>();

    groupedRows.forEach((row) => {
      row.services.forEach((service) => {
        itemTypes.add(service.service_type);
      });
      statuses.add(row.status);
    });

    return {
      itemTypes: Array.from(itemTypes).map((type) => ({
        label: getServiceTypeConfig(type).label,
        value: type,
      })),
      statuses: Array.from(statuses).map((status) => ({
        label: getPaymentStatusConfig(status).label,
        value: status,
      })),
    };
  }, [groupedRows]);

  // Toggle filter
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

  // Handle sorting
  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        return prev.direction === "asc" ? { key, direction: "desc" } : null;
      }
      return { key, direction: "asc" };
    });
  };

  // Check if any filter is active
  const hasActiveFilters = itemTypeFilter.size > 0 || statusFilter.size > 0;

  // Clear all filters
  const clearAllFilters = () => {
    setItemTypeFilter(new Set());
    setStatusFilter(new Set());
  };

  // Apply filters and sorting
  const filteredAndSortedRows = useMemo(() => {
    let filtered = [...groupedRows];

    // Apply item type filter
    if (itemTypeFilter.size > 0) {
      filtered = filtered.filter((row) => row.services.some((service) => itemTypeFilter.has(service.service_type)));
    }

    // Apply status filter
    if (statusFilter.size > 0) {
      filtered = filtered.filter((row) => statusFilter.has(row.status));
    }

    // Apply sorting
    if (sortConfig) {
      filtered.sort((a, b) => {
        let aValue: number | string = 0;
        let bValue: number | string = 0;

        if (sortConfig.key === "amount") {
          aValue = a.total_amount;
          bValue = b.total_amount;
        } else if (sortConfig.key === "due_date") {
          aValue = a.due_date ? new Date(a.due_date).getTime() : 0;
          bValue = b.due_date ? new Date(b.due_date).getTime() : 0;
        }

        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [groupedRows, itemTypeFilter, statusFilter, sortConfig]);

  const selectableRows = useMemo(() => {
    return filteredAndSortedRows.filter((row) => row.is_selectable);
  }, [filteredAndSortedRows]);

  const toggleExpand = (rowKey: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowKey)) {
        next.delete(rowKey);
      } else {
        next.add(rowKey);
      }
      return next;
    });
  };

  const toggleRowSelection = (rowKey: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowKey)) {
        next.delete(rowKey);
      } else {
        next.add(rowKey);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedRows.size === selectableRows.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(selectableRows.map((row) => row.services[0].service_id)));
    }
  };

  const handleCreatePaymentPlan = () => {
    // Get selected services and their supplier info
    const selectedServices = filteredAndSortedRows
      .filter((row) => row.is_selectable && selectedRows.has(getRowKey(row)))
      .flatMap((row) => row.services);

    if (selectedServices.length === 0) {
      return;
    }

    // Validate that all selected services are from the same supplier
    const uniqueSuppliers = new Set(selectedServices.map((s) => s.supplier_id));
    if (uniqueSuppliers.size > 1) {
      toast.error("Cannot create payment plan", {
        description: "Selected items must be from the same supplier",
      });
      return;
    }

    // All selected services should be from the same supplier
    const supplierId = selectedServices[0].supplier_id;
    const supplierName = selectedServices[0].supplier_name;

    setFormSupplierInfo({
      supplierId,
      supplierName,
      serviceIds: selectedServices.map((s) => s.service_id),
    });
    setPaymentFormOpen(true);
  };

  const handlePaymentFormSuccess = async () => {
    // Refresh the table data and wait for it to complete
    await queryClient.invalidateQueries({
      queryKey: ["services-with-payment-plans", queryId],
    });
    // Clear selection
    setSelectedRows(new Set());
    // Close form
    setPaymentFormOpen(false);
    setFormSupplierInfo(null);
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "-";
    try {
      return format(new Date(dateString), "MMM d, yyyy");
    } catch {
      return dateString;
    }
  };

  const getRowKey = (row: PaymentPlanGroupedRow): string => {
    // Use payment_plan_id if available, otherwise use service_id
    return row.payment_plan_id || row.services[0].service_id;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex-1 flex gap-0.5 items-center">
          <h3 className="text-sm font-medium">Supplier Payment Details</h3>
          {hasActiveFilters && (
            <div className="flex items-center gap-0.5 text-xs">
              <Dot className="size-5 text-muted-foreground" />
              <span className="text-muted-foreground">
                Showing {filteredAndSortedRows.length} of {groupedRows.length} items
              </span>
              <Button variant="secondary" size="sm" className="h-6 text-xs ml-2" onClick={clearAllFilters}>
                <X className="size-3" />
                Clear
              </Button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectedRows.size > 0 && (
            <>
              <span className="text-xs text-muted-foreground">
                {selectedRows.size} service{selectedRows.size > 1 ? "s" : ""} selected
              </span>
              <Button size="sm" className="h-7 text-xs" onClick={handleCreatePaymentPlan}>
                <Plus />
                Create Plan
              </Button>
            </>
          )}
          {onRefresh && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={onRefresh}
              disabled={isFetching}
            >
              <RefreshCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={selectableRows.length > 0 && selectedRows.size === selectableRows.length}
                  onCheckedChange={toggleSelectAll}
                  disabled={selectableRows.length === 0}
                />
              </TableHead>
              <TableHead className="min-w-[250px]">Services</TableHead>
              <TableHead className="w-32">Booking ID</TableHead>
              <TableHead className="w-32">
                <ColumnFilter
                  title="Type"
                  options={filterOptions.itemTypes}
                  selected={itemTypeFilter}
                  onSelect={(v) => toggleFilter(setItemTypeFilter, v)}
                  onClear={() => setItemTypeFilter(new Set())}
                />
              </TableHead>
              <TableHead className="min-w-[180px]">Supplier</TableHead>
              <TableHead className="text-right w-[100px]">
                <SortButton title="Amount" sortKey="amount" currentSort={sortConfig} onSort={handleSort} />
              </TableHead>
              <TableHead className="text-right w-[100px]">Remaining</TableHead>
              <TableHead className="w-[120px]">
                <SortButton title="Due Date" sortKey="due_date" currentSort={sortConfig} onSort={handleSort} />
              </TableHead>
              <TableHead className="w-[150px]">
                <ColumnFilter
                  title="Payment Status"
                  options={filterOptions.statuses}
                  selected={statusFilter}
                  onSelect={(v) => toggleFilter(setStatusFilter, v)}
                  onClear={() => setStatusFilter(new Set())}
                />
              </TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <>
                {Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-5 w-5" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-full max-w-[200px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-full max-w-[150px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-20" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-5 w-16 ml-auto" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-5 w-16 ml-auto" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-28" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-6" />
                    </TableCell>
                  </TableRow>
                ))}
              </>
            ) : groupedRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8">
                  <p className="text-sm text-muted-foreground">No supplier services added yet</p>
                </TableCell>
              </TableRow>
            ) : filteredAndSortedRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8">
                  <p className="text-sm text-muted-foreground">No items match the selected filters</p>
                </TableCell>
              </TableRow>
            ) : (
              <>
                {filteredAndSortedRows.map((row) => {
                  const rowKey = getRowKey(row);
                  const isExpanded = expandedRows.has(rowKey);
                  const isSelected = selectedRows.has(rowKey);

                  return (
                    <React.Fragment key={rowKey}>
                      <TableRow className={cn(isSelected && "bg-muted/50")}>
                        {/* Merged Expand/Checkbox Column */}
                        <TableCell>
                          {row.is_expandable ? (
                            <button
                              onClick={() => toggleExpand(rowKey)}
                              className="hover:bg-muted p-1 rounded transition-colors"
                            >
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </button>
                          ) : row.is_selectable ? (
                            <Checkbox checked={isSelected} onCheckedChange={() => toggleRowSelection(rowKey)} />
                          ) : null}
                        </TableCell>

                        {/* Service Names - Stack multiple services */}
                        <TableCell className="px-0">
                          <div className="divide-y">
                            {row.services.map((service, idx) => (
                              <div
                                key={service.service_id}
                                className={cn("text-sm font-medium px-4 py-2", idx === 0 && "pt-0")}
                              >
                                {service.service_name}
                                {service.package_name && (
                                  <span className="text-xs text-muted-foreground"> ({service.package_name})</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </TableCell>

                        {/* Booking ID */}
                        <TableCell>
                          {row.payment_plan_id && (
                            <span className="text-xs font-mono text-muted-foreground">
                              {row.payment_plan_id.slice(0, 8)}
                            </span>
                          )}
                        </TableCell>

                        {/* Service Types - Stack multiple types */}
                        <TableCell>
                          <div className="flex flex-col gap-1 items-center">
                            {row.services.map((service) => {
                              const config = getServiceTypeConfig(service.service_type);
                              return (
                                <Badge
                                  key={service.service_id}
                                  variant="secondary"
                                  className={cn("text-[10px] px-1.5", config.color, config.bgColor)}
                                >
                                  {config.label}
                                </Badge>
                              );
                            })}
                          </div>
                        </TableCell>

                        {/* Supplier */}
                        <TableCell className="font-medium">{row.supplier_name}</TableCell>

                        {/* Total Amount */}
                        <TableCell className="text-right">
                          <span className="font-mono text-xs">{row.total_amount.toFixed(2)}</span>
                        </TableCell>

                        {/* Remaining */}
                        <TableCell className="text-right">
                          <span
                            className={cn(
                              "font-mono text-xs",
                              row.remaining_amount === 0
                                ? "text-green-600"
                                : row.status === "overdue"
                                  ? "text-red-600"
                                  : "text-orange-600"
                            )}
                          >
                            {row.remaining_amount.toFixed(2)}
                          </span>
                        </TableCell>

                        {/* Due Date */}
                        <TableCell>{formatDate(row.due_date)}</TableCell>

                        {/* Status */}
                        <TableCell>
                          {(() => {
                            const config = getPaymentStatusConfig(row.status);
                            return (
                              <Badge
                                variant="secondary"
                                className={cn("text-[10px] px-1.5", config.color, config.bgColor)}
                              >
                                {config.label}
                              </Badge>
                            );
                          })()}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          {row.payment_plan_id && (
                            <TooltipButton
                              tooltip="Edit payment configuration"
                              tooltipSide="left"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => onEditPlan?.(row.payment_plan_id!)}
                            >
                              <Pencil className="h-4 w-4" />
                            </TooltipButton>
                          )}
                        </TableCell>
                      </TableRow>

                      {/* Expanded Row - Show for all payment plans */}
                      {isExpanded && row.is_expandable && row.payment_plan_id && (
                        <TableRow>
                          <TableCell colSpan={10} className="p-0 bg-muted/20">
                            {row.has_installments ? (
                              <PaymentPlanInstallments installments={row.installments} />
                            ) : (
                              <div className="p-4">
                                <div className="rounded-md border bg-background">
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="bg-muted/30">
                                        <TableHead className="w-[150px]">Type</TableHead>
                                        <TableHead className="text-right w-[120px]">Amount</TableHead>
                                        <TableHead className="text-right w-[120px]">Remaining</TableHead>
                                        <TableHead className="w-[120px]">Due Date</TableHead>
                                        <TableHead className="w-16">Notes</TableHead>
                                        <TableHead className="w-[130px]">Payment Status</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      <TableRow>
                                        <TableCell className="font-medium">Total Amount</TableCell>
                                        <TableCell className="text-right font-mono text-xs">
                                          {row.total_amount.toFixed(2)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                          <span
                                            className={cn(
                                              "font-mono text-xs",
                                              row.remaining_amount === 0
                                                ? "text-green-600"
                                                : row.status === "overdue"
                                                  ? "text-red-600"
                                                  : "text-orange-600"
                                            )}
                                          >
                                            {row.remaining_amount.toFixed(2)}
                                          </span>
                                        </TableCell>
                                        <TableCell className="text-xs">{formatDate(row.due_date)}</TableCell>
                                        <TableCell className="p-1">
                                          {row.plan_notes ? (
                                            <EyePopover title="Payment Plan Notes" description={row.plan_notes} />
                                          ) : (
                                            <span className="text-xs text-muted-foreground">-</span>
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          {(() => {
                                            const config = getPaymentStatusConfig(row.status);
                                            return (
                                              <Badge
                                                variant="secondary"
                                                className={cn("text-[10px] px-1.5", config.color, config.bgColor)}
                                              >
                                                {config.label}
                                              </Badge>
                                            );
                                          })()}
                                        </TableCell>
                                      </TableRow>
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Payment Configuration Form */}
      {formSupplierInfo && (
        <PaymentConfigurationForm
          queryId={queryId}
          planType="supplier_payable"
          supplierId={formSupplierInfo.supplierId}
          supplierName={formSupplierInfo.supplierName}
          bookingIds={formSupplierInfo.serviceIds}
          availableBookings={
            // Get available bookings with their details (service_id is actually booking_id)
            filteredAndSortedRows
              .filter((row) => row.is_selectable && selectedRows.has(getRowKey(row)))
              .flatMap((row) =>
                row.services.map((s) => ({
                  id: s.service_id, // This is actually booking_id from the function
                  name: s.service_name,
                  cost_price: s.cost_price,
                  type: s.service_type,
                }))
              )
          }
          open={paymentFormOpen}
          onOpenChange={setPaymentFormOpen}
          onSuccess={handlePaymentFormSuccess}
        />
      )}
    </div>
  );
}
