/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo } from "react";
import { useQueryStates, parseAsString, parseAsInteger, parseAsArrayOf } from "nuqs";
import { Filter, Eraser, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import CommonSelector from "./CommonSelector";
import { format } from "date-fns";
import { IFilterConfig } from "@/types/api-service";

type UnifiedFilterContainerProps = {
  filters: IFilterConfig[];
  onApply: () => void;
  isLoading?: boolean;
};

function useFilterState(filters: IFilterConfig[]) {
  const parsers = useMemo(() => {
    const result: Record<string, any> = {};

    filters.forEach((filter) => {
      switch (filter.type) {
        case "search":
          result[filter.key] = parseAsString.withDefault(filter.defaultValue || "");
          break;
        case "slider":
          result[filter.key] = parseAsInteger.withDefault(filter.defaultValue || 0);
          break;
        case "multi-select":
          result[filter.key] = parseAsArrayOf(parseAsString).withDefault(filter.defaultValue || []);
          break;
        case "star-rating":
          result[filter.key] = parseAsArrayOf(parseAsString).withDefault(
            Array.isArray(filter.defaultValue) ? filter.defaultValue.map(String) : []
          );
          break;
        case "radio-group":
          result[filter.key] = parseAsString.withDefault(filter.defaultValue || "");
          break;
        case "date-range":
          result[`${filter.key}_from`] = parseAsString.withDefault("");
          result[`${filter.key}_to`] = parseAsString.withDefault("");
          break;
      }
    });

    return result;
  }, [filters]);

  const [queryStates, setQueryStates] = useQueryStates(parsers);

  const handleFilterChange = <K extends keyof typeof queryStates>(key: K, value: (typeof queryStates)[K]) => {
    setQueryStates((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const clearFilters = () => {
    const defaults: Record<string, any> = {};

    filters.forEach((filter) => {
      switch (filter.type) {
        case "search":
          defaults[filter.key] = "";
          break;
        case "slider":
          defaults[filter.key] = filter.defaultValue || 0;
          break;
        case "multi-select":
        case "star-rating":
          defaults[filter.key] = [];
          break;
        case "radio-group":
          defaults[filter.key] = filter.defaultValue || "";
          break;
        case "date-range":
          defaults[`${filter.key}_from`] = "";
          defaults[`${filter.key}_to`] = "";
          break;
      }
    });

    setQueryStates(defaults);
  };

  const hasActiveFilters = useMemo(() => {
    return filters.some((filter) => {
      const value = queryStates[filter.key];

      switch (filter.type) {
        case "search":
          return value !== "" && value !== filter.defaultValue;
        case "slider":
          return value > (filter.defaultValue || 0);
        case "multi-select":
        case "star-rating":
          return Array.isArray(value) && value.length > 0;
        case "radio-group":
          return value !== "" && value !== filter.defaultValue;
        case "date-range":
          return queryStates[`${filter.key}_from`] !== "" || queryStates[`${filter.key}_to`] !== "";
        default:
          return false;
      }
    });
  }, [queryStates, filters]);

  return { queryStates, handleFilterChange, clearFilters, hasActiveFilters };
}

function SearchFilter({
  config,
  value,
  onChange,
}: {
  config: IFilterConfig & { type: "search" };
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      {config.label && <p className="text-sm font-medium">{config.label}</p>}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder={config.placeholder || "Search..."}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-9"
        />
      </div>
    </div>
  );
}

function SliderFilter({
  config,
  value,
  onChange,
}: {
  config: IFilterConfig & { type: "slider" };
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      {config.label && <p className="text-sm font-medium">{config.label}</p>}
      <Slider
        min={config.min || 0}
        max={config.max || 100}
        value={[value]}
        onValueChange={(val) => onChange(val[0])}
        showValue={config.showValue}
      />
      <div className="flex justify-between text-xs">
        <p>₹ {config.min || 0}</p>
        <p>₹ {value}</p>
      </div>
    </div>
  );
}

function MultiSelectFilter({
  config,
  value,
  onChange,
}: {
  config: IFilterConfig & { type: "multi-select" };
  value: string[];
  onChange: (value: string[]) => void;
}) {
  return (
    <CommonSelector
      label={config.label}
      selected={value}
      onChange={onChange}
      options={config.options}
      defaultOpen={config.defaultOpen}
    />
  );
}

function RadioGroupFilter({
  config,
  value,
  onChange,
}: {
  config: IFilterConfig & { type: "radio-group" };
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      {config.label && <p className="text-sm font-medium">{config.label}</p>}
      <RadioGroup value={value} onValueChange={onChange}>
        {config.options.map((option) => (
          <div key={option.value} className="flex items-center space-x-2">
            <RadioGroupItem value={option.value} id={`${config.key}-${option.value}`} />
            <Label htmlFor={`${config.key}-${option.value}`} className="cursor-pointer">
              {option.label}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}

function DateRangeFilter({
  config,
  fromValue,
  toValue,
  onFromChange,
  onToChange,
}: {
  config: IFilterConfig & { type: "date-range" };
  fromValue: string;
  toValue: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
}) {
  const fromDate = fromValue ? new Date(fromValue) : undefined;
  const toDate = toValue ? new Date(toValue) : undefined;

  return (
    <div className="space-y-2">
      {config.label && <p className="text-sm font-medium">{config.label}</p>}
      <div className="flex gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="flex-1 justify-start text-left font-normal">
              {fromDate ? format(fromDate, "PPP") : "From date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={fromDate}
              onSelect={(date) => onFromChange(date ? date.toISOString() : "")}
            />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="flex-1 justify-start text-left font-normal">
              {toDate ? format(toDate, "PPP") : "To date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar mode="single" selected={toDate} onSelect={(date) => onToChange(date ? date.toISOString() : "")} />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

function StarRatingFilter({
  config,
  value,
  onChange,
}: {
  config: IFilterConfig & { type: "star-rating" };
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const handleToggle = (ratingValue: string) => {
    if (value.includes(ratingValue)) {
      onChange(value.filter((r) => r !== ratingValue));
    } else {
      onChange([...value, ratingValue]);
    }
  };

  return (
    <div className="space-y-2">
      {config.label && <p className="text-sm font-medium">{config.label}</p>}
      <div className="flex gap-2 items-center flex-wrap">
        {Array.from({ length: 5 }).map((_, index) => {
          const ratingValue = `${index + 1}`;
          const isSelected = value.includes(ratingValue);

          return (
            <Badge
              key={index}
              variant="outline"
              className={cn(
                "justify-center rounded-full py-1 min-w-12 cursor-pointer transition-colors text-xs",
                isSelected && "bg-primary text-primary-foreground"
              )}
              onClick={() => handleToggle(ratingValue)}
            >
              {index + 1} ★
            </Badge>
          );
        })}
      </div>
    </div>
  );
}

function FilterRenderer({
  config,
  queryStates,
  handleFilterChange,
}: {
  config: IFilterConfig;
  queryStates: Record<string, any>;
  handleFilterChange: (key: string, value: any) => void;
}) {
  switch (config.type) {
    case "search":
      return (
        <SearchFilter
          config={config}
          value={queryStates[config.key] || ""}
          onChange={(val) => handleFilterChange(config.key, val)}
        />
      );

    case "slider":
      return (
        <SliderFilter
          config={config}
          value={queryStates[config.key] || 0}
          onChange={(val) => handleFilterChange(config.key, val)}
        />
      );

    case "multi-select":
      return (
        <MultiSelectFilter
          config={config}
          value={queryStates[config.key] || []}
          onChange={(val) => handleFilterChange(config.key, val)}
        />
      );

    case "radio-group":
      return (
        <RadioGroupFilter
          config={config}
          value={queryStates[config.key] || ""}
          onChange={(val) => handleFilterChange(config.key, val)}
        />
      );

    case "date-range":
      return (
        <DateRangeFilter
          config={config}
          fromValue={queryStates[`${config.key}_from`] || ""}
          toValue={queryStates[`${config.key}_to`] || ""}
          onFromChange={(val) => handleFilterChange(`${config.key}_from`, val)}
          onToChange={(val) => handleFilterChange(`${config.key}_to`, val)}
        />
      );

    case "star-rating":
      return (
        <StarRatingFilter
          config={config}
          value={queryStates[config.key] || []}
          onChange={(val) => handleFilterChange(config.key, val)}
        />
      );

    default:
      return null;
  }
}

export default function UnifiedFilterContainer({ filters, onApply, isLoading = false }: UnifiedFilterContainerProps) {
  const { queryStates, handleFilterChange, clearFilters, hasActiveFilters } = useFilterState(filters);

  const handleClearFilters = () => {
    clearFilters();
    onApply();
  };

  return (
    <div className="border bg-popover/20 backdrop-blur-md rounded-xl flex flex-col w-full">
      <div className="flex justify-between items-center p-3 border-b shrink-0">
        <p className="text-sm font-semibold flex gap-2 items-center">
          <Filter className="size-4" /> Filters
        </p>
        <div className="flex gap-2">
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={handleClearFilters} loading={isLoading} disabled={isLoading}>
              <Eraser /> Clear
            </Button>
          )}
          <Button size="sm" onClick={onApply} loading={isLoading} disabled={isLoading}>
            Apply
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 space-y-4 pr-3">
          {filters.map((filter) => (
            <FilterRenderer
              key={filter.key}
              config={filter}
              queryStates={queryStates}
              handleFilterChange={handleFilterChange}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
