"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings2, Star, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

// Filter type definitions
export type FilterType =
  | "sort"
  | "button-group"
  | "select"
  | "multi-select"
  | "rating";

interface BaseFilter {
  id: string;
  label: string;
  type: FilterType;
  description?: string;
}

export interface SortFilter extends BaseFilter {
  type: "sort";
  options: Array<{
    label: string;
    value: string;
  }>;
}

export interface ButtonGroupFilter extends BaseFilter {
  type: "button-group";
  options: Array<{
    label: string;
    value: string;
    count?: number;
    icon?: React.ReactNode;
  }>;
  multiSelect?: boolean;
}

export interface SelectFilter extends BaseFilter {
  type: "select";
  options: Array<{
    label: string;
    value: string;
    icon?: React.ReactNode;
  }>;
  placeholder?: string;
}

export interface MultiSelectFilter extends BaseFilter {
  type: "multi-select";
  options: Array<{
    label: string;
    value: string;
    icon?: React.ReactNode;
  }>;
  placeholder?: string;
}

export interface RatingFilter extends BaseFilter {
  type: "rating";
  options: Array<{
    stars: number;
    count?: number;
  }>;
  includeUnrated?: boolean;
  includeBlocked?: boolean;
  unratedCount?: number;
  blockedCount?: number;
}

export type FilterConfig =
  | SortFilter
  | ButtonGroupFilter
  | SelectFilter
  | MultiSelectFilter
  | RatingFilter;

export interface FilterDropdownProps {
  filters: FilterConfig[];
  values: Record<string, any>;
  onChange: (id: string, value: any) => void;
  onReset: () => void;
  triggerClassName?: string;
  triggerLabel?: string;
  triggerIcon?: React.ReactNode;
  popoverWidth?: string;
  showActiveCount?: boolean;
  buttonHeight?: string;
}

// Sort Filter Renderer
function SortFilterRenderer({
  filter,
  value,
  onChange,
}: {
  filter: SortFilter;
  value: any;
  onChange: (value: any) => void;
}) {
  return (
    <div className="space-y-2.5">
      <div className="space-y-1">
        <label className="text-sm font-semibold text-foreground">
          {filter.label}
        </label>
        {filter.description && (
          <p className="text-xs text-muted-foreground">{filter.description}</p>
        )}
      </div>
      <Select value={value || ""} onValueChange={onChange}>
        <SelectTrigger className="w-full h-9 bg-background hover:bg-accent transition-colors">
          <SelectValue placeholder="Select sorting..." />
        </SelectTrigger>
        <SelectContent>
          {filter.options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// Button Group Filter Renderer
function ButtonGroupRenderer({
  filter,
  value,
  onChange,
}: {
  filter: ButtonGroupFilter;
  value: any;
  onChange: (value: any) => void;
}) {
  const handleClick = (optionValue: string) => {
    if (filter.multiSelect) {
      const currentValues = Array.isArray(value) ? value : [];
      const newValues = currentValues.includes(optionValue)
        ? currentValues.filter((v) => v !== optionValue)
        : [...currentValues, optionValue];
      onChange(newValues);
    } else {
      onChange(optionValue);
    }
  };

  const isSelected = (optionValue: string) => {
    if (filter.multiSelect) {
      return Array.isArray(value) && value.includes(optionValue);
    }
    return value === optionValue;
  };

  return (
    <div className="space-y-2.5">
      <div className="space-y-1">
        <label className="text-sm font-semibold text-foreground">
          {filter.label}
        </label>
        {filter.description && (
          <p className="text-xs text-muted-foreground">{filter.description}</p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {filter.options.map((option) => {
          const selected = isSelected(option.value);
          return (
            <Button
              key={option.value}
              variant={selected ? "default" : "outline"}
              size="sm"
              className={cn(
                "h-8 px-3 text-xs font-medium transition-all",
                selected
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                  : "bg-background hover:bg-accent hover:text-accent-foreground"
              )}
              onClick={() => handleClick(option.value)}
            >
              {option.icon && <span className="mr-1.5">{option.icon}</span>}
              {option.label}
              {option.count !== undefined && (
                <Badge
                  variant="secondary"
                  className={cn(
                    "ml-1.5 h-5 px-1.5 text-[10px] font-semibold",
                    selected
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  {option.count}
                </Badge>
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

// Select Filter Renderer
function SelectFilterRenderer({
  filter,
  value,
  onChange,
}: {
  filter: SelectFilter;
  value: any;
  onChange: (value: any) => void;
}) {
  return (
    <div className="space-y-2.5">
      <div className="space-y-1">
        <label className="text-sm font-semibold text-foreground">
          {filter.label}
        </label>
        {filter.description && (
          <p className="text-xs text-muted-foreground">{filter.description}</p>
        )}
      </div>
      <Select value={value || ""} onValueChange={onChange}>
        <SelectTrigger className="w-full h-9 bg-background hover:bg-accent transition-colors">
          <SelectValue placeholder={filter.placeholder || "Select..."} />
        </SelectTrigger>
        <SelectContent>
          {filter.options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex items-center gap-2">
                {option.icon && (
                  <span className="text-muted-foreground">{option.icon}</span>
                )}
                <span>{option.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// Rating Filter Renderer
function RatingFilterRenderer({
  filter,
  value,
  onChange,
}: {
  filter: RatingFilter;
  value: any;
  onChange: (value: any) => void;
}) {
  const renderStars = (count: number) => {
    return Array.from({ length: count }, (_, i) => (
      <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
    ));
  };

  const totalCount =
    filter.options.reduce((acc, opt) => acc + (opt.count || 0), 0) +
    (filter.unratedCount || 0) +
    (filter.blockedCount || 0);

  return (
    <div className="space-y-2.5">
      <div className="space-y-1">
        <label className="text-sm font-semibold text-foreground">
          {filter.label}
        </label>
        {filter.description && (
          <p className="text-xs text-muted-foreground">{filter.description}</p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant={value === "all" ? "default" : "outline"}
          size="sm"
          className={cn(
            "h-8 px-3 text-xs font-medium transition-all",
            value === "all"
              ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
              : "bg-background hover:bg-accent hover:text-accent-foreground"
          )}
          onClick={() => onChange("all")}
        >
          All
          {totalCount > 0 && (
            <Badge
              variant="secondary"
              className={cn(
                "ml-1.5 h-5 px-1.5 text-[10px] font-semibold",
                value === "all"
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-muted"
              )}
            >
              {totalCount}
            </Badge>
          )}
        </Button>
        {filter.options.map((option) => {
          const selected = value === option.stars;
          return (
            <Button
              key={option.stars}
              variant={selected ? "default" : "outline"}
              size="sm"
              className={cn(
                "h-8 px-3 text-xs font-medium transition-all",
                selected
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                  : "bg-background hover:bg-accent hover:text-accent-foreground"
              )}
              onClick={() => onChange(option.stars)}
            >
              <div className="flex items-center gap-1">
                {renderStars(option.stars)}
              </div>
              {option.count !== undefined && (
                <Badge
                  variant="secondary"
                  className={cn(
                    "ml-1.5 h-5 px-1.5 text-[10px] font-semibold",
                    selected
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  {option.count}
                </Badge>
              )}
            </Button>
          );
        })}
        {filter.includeUnrated && (
          <Button
            variant={value === "unrated" ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-8 px-3 text-xs font-medium transition-all",
              value === "unrated"
                ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                : "bg-background hover:bg-accent hover:text-accent-foreground"
            )}
            onClick={() => onChange("unrated")}
          >
            Unrated
            {filter.unratedCount !== undefined && (
              <Badge
                variant="secondary"
                className={cn(
                  "ml-1.5 h-5 px-1.5 text-[10px] font-semibold",
                  value === "unrated"
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted"
                )}
              >
                {filter.unratedCount}
              </Badge>
            )}
          </Button>
        )}
        {filter.includeBlocked && (
          <Button
            variant={value === "blocked" ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-8 px-3 text-xs font-medium transition-all",
              value === "blocked"
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm"
                : "bg-background hover:bg-destructive/10 hover:text-destructive"
            )}
            onClick={() => onChange("blocked")}
          >
            Blocked
            {filter.blockedCount !== undefined && (
              <Badge
                variant="secondary"
                className={cn(
                  "ml-1.5 h-5 px-1.5 text-[10px] font-semibold",
                  value === "blocked"
                    ? "bg-destructive-foreground/20 text-destructive-foreground"
                    : "bg-muted"
                )}
              >
                {filter.blockedCount}
              </Badge>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

// Main Filter Dropdown Component
export function FilterDropdown({
  filters,
  values,
  onChange,
  onReset,
  triggerClassName,
  triggerLabel,
  triggerIcon,
  popoverWidth = "w-80",
  showActiveCount = true,
  buttonHeight = "h-9",
}: FilterDropdownProps) {
  const [open, setOpen] = React.useState(false);

  // Calculate number of active filters
  const activeFilterCount = React.useMemo(() => {
    return Object.entries(values).filter(([, value]) => {
      if (value === undefined || value === null || value === "") return false;
      if (Array.isArray(value)) return value.length > 0;
      return true;
    }).length;
  }, [values]);

  const renderFilter = (filter: FilterConfig, index: number) => {
    const value = values[filter.id];
    const isLast = index === filters.length - 1;

    let renderedFilter = null;

    switch (filter.type) {
      case "sort":
        renderedFilter = (
          <SortFilterRenderer
            filter={filter as SortFilter}
            value={value}
            onChange={(newValue) => onChange(filter.id, newValue)}
          />
        );
        break;
      case "button-group":
        renderedFilter = (
          <ButtonGroupRenderer
            filter={filter as ButtonGroupFilter}
            value={value}
            onChange={(newValue) => onChange(filter.id, newValue)}
          />
        );
        break;
      case "select":
        renderedFilter = (
          <SelectFilterRenderer
            filter={filter as SelectFilter}
            value={value}
            onChange={(newValue) => onChange(filter.id, newValue)}
          />
        );
        break;
      case "rating":
        renderedFilter = (
          <RatingFilterRenderer
            filter={filter as RatingFilter}
            value={value}
            onChange={(newValue) => onChange(filter.id, newValue)}
          />
        );
        break;
      default:
        return null;
    }

    return (
      <React.Fragment key={filter.id}>
        {renderedFilter}
        {!isLast && <Separator className="my-4" />}
      </React.Fragment>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {triggerLabel ? (
          <Button
            variant="outline"
            className={cn(
              buttonHeight,
              "gap-2 bg-background hover:bg-accent transition-colors relative",
              triggerClassName
            )}
          >
            {triggerIcon || <Settings2 className="h-4 w-4" />}
            <span className="text-sm font-medium">{triggerLabel}</span>
            {showActiveCount && activeFilterCount > 0 && (
              <Badge
                variant="default"
                className="h-5 px-1.5 text-[10px] font-bold bg-primary"
              >
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        ) : (
          <Button
            size="icon"
            variant="outline"
            disabled
            className={cn(
              buttonHeight,
              buttonHeight.replace("h-", "w-"),
              "bg-background hover:bg-accent transition-colors relative",
              activeFilterCount > 0 && "border-primary",
              triggerClassName
            )}
          >
            {triggerIcon || <Settings2 className="h-3.5 w-3.5" />}
            {showActiveCount && activeFilterCount > 0 && (
              <Badge
                variant="default"
                className="absolute -top-1.5 -right-1.5 h-5 w-5 p-0 flex items-center justify-center text-[10px] font-bold"
              >
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        className={cn(popoverWidth, "p-0")}
        align="end"
        sideOffset={8}
      >
        <div className="flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Filters & Sort</h3>
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                  {activeFilterCount} active
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs hover:bg-destructive/10 hover:text-destructive transition-colors"
              onClick={() => {
                onReset();
              }}
              disabled={activeFilterCount === 0}
            >
              <RotateCcw className="h-3 w-3 mr-1.5" />
              Reset
            </Button>
          </div>

          {/* Filters */}
          <ScrollArea className="h-[500px]">
            <div className="px-4 py-4">
              <div className="space-y-4">{filters.map(renderFilter)}</div>
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}
