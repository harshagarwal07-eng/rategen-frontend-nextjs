"use client";

import { useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronsUpDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { IOption } from "@/types/common";

/** Flat list or grouped list. Grouped: [{ group: string, options: IOption[] }]. */
type OptionsProp = IOption[] | string[] | Array<{ group: string; options: IOption[] | string[] }>;

function normalizeOptions(options: OptionsProp): {
  groups: Array<{ group: string; options: IOption[] }>;
  allOptions: IOption[];
} {
  if (options.length === 0) {
    return { groups: [], allOptions: [] };
  }

  const first = options[0];
  const isGrouped = typeof first === "object" && "group" in first && "options" in first;

  if (isGrouped) {
    const groups = (options as Array<{ group: string; options: IOption[] | string[] }>).map((g) => ({
      group: g.group,
      options: g.options.map((o) =>
        typeof o === "string" ? { value: o, label: o } : { value: o.value, label: o.label }
      ),
    }));
    const allOptions = groups.flatMap((g) => g.options);
    return { groups, allOptions };
  }

  const flat = options as (string | IOption)[];
  const opts: IOption[] = flat.map((o) =>
    typeof o === "string" ? { value: o, label: o } : { value: o.value, label: o.label }
  );
  return { groups: [{ group: "", options: opts }], allOptions: opts };
}

/** Compact multi-select for grid cells: single-line trigger + popover dropdown (same pattern as Autocomplete). */
export function MultiSelectEditor({
  values,
  onValuesChange,
  disabled,
  onClose,
  options: optionsProp,
  placeholder = "Select...",
}: {
  values: string[];
  onValuesChange: (v: string[]) => void;
  disabled: boolean;
  onClose?: () => void;
  /** Flat array (IOption[] or string[]), or grouped array [{ group, options }]. */
  options: OptionsProp;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const { groups, allOptions } = useMemo(() => normalizeOptions(optionsProp), [optionsProp]);

  const labels = values.map((v) => allOptions.find((o) => o.value === v)?.label ?? v);
  const displayText =
    labels.length === 0 ? placeholder : labels.length <= 2 ? labels.join(", ") : `${labels.length} selected`;

  const toggle = (value: string) => {
    if (values.includes(value)) {
      onValuesChange(values.filter((x) => x !== value));
    } else {
      onValuesChange([...values, value]);
    }
  };

  return (
    <Popover
      open={open && !disabled}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          onClose?.();
        }
      }}
      modal
    >
      <PopoverTrigger asChild>
        <Button
          disabled={disabled}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between h-10 border-2",
            open && "border-ring ring-ring/50 ring-[3px]",
            !values?.length && "text-muted-foreground/40"
          )}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        >
          <span className="truncate">{displayText}</span>
          <ChevronsUpDown className="opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="max-h-[280px] overflow-auto p-2">
          {groups.map((group, groupIndex) => (
            <div key={group.group || `group-${groupIndex}`}>
              {groupIndex > 0 && <div className="h-px bg-border my-2" />}
              {group.group ? (
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {group.group}
                </div>
              ) : null}
              {group.options.map((option) => {
                const isSelected = values.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={cn(
                      "w-full flex items-center justify-between rounded-md px-2 py-1.5 text-sm cursor-pointer text-left hover:bg-accent",
                      isSelected && "bg-accent/50"
                    )}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => toggle(option.value)}
                  >
                    {option.label}
                    <Check className={cn("h-4 w-4 shrink-0", isSelected ? "opacity-100" : "opacity-0")} />
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
