"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface DurationEditorProps {
  value: { days?: number; hours?: number; minutes?: number } | null | undefined;
  onSave: (value: { days?: number; hours?: number; minutes?: number } | null) => void;
  onClose: () => void;
  disabled?: boolean;
}

type DurationField = "days" | "hours" | "minutes";

interface DurationFieldConfig {
  field: DurationField;
  label: string;
  max: number;
}

const DURATION_FIELDS: DurationFieldConfig[] = [
  { field: "days", label: "Days", max: 999 },
  { field: "hours", label: "Hours", max: 23 },
  { field: "minutes", label: "Minutes", max: 59 },
];

export function DurationEditor({ value, onSave, onClose, disabled }: DurationEditorProps) {
  const [values, setValues] = useState({
    days: value?.days?.toString() || "",
    hours: value?.hours?.toString() || "",
    minutes: value?.minutes?.toString() || "",
  });

  const inputRefs = {
    days: useRef<HTMLInputElement>(null),
    hours: useRef<HTMLInputElement>(null),
    minutes: useRef<HTMLInputElement>(null),
  };

  // Update state when value prop changes
  useEffect(() => {
    setValues({
      days: value?.days?.toString() || "",
      hours: value?.hours?.toString() || "",
      minutes: value?.minutes?.toString() || "",
    });
  }, [value]);

  // Focus first input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRefs.days.current?.focus();
      inputRefs.days.current?.select();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleFieldChange = useCallback((field: DurationField, max: number) => {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value.trim();
      if (val === "" || /^\d+$/.test(val)) {
        const numVal = parseInt(val);
        if (val === "" || (!isNaN(numVal) && numVal >= 0 && numVal <= max)) {
          setValues((prev) => ({ ...prev, [field]: val }));
        }
      }
    };
  }, []);

  const handleSave = useCallback(() => {
    const duration: { days?: number; hours?: number; minutes?: number } = {};

    Object.entries(values).forEach(([field, val]) => {
      if (val) {
        const numVal = parseInt(val);
        if (!isNaN(numVal) && numVal >= 0) {
          duration[field as DurationField] = numVal;
        }
      }
    });

    const hasValue = Object.keys(duration).length > 0;
    onSave(hasValue ? duration : null);
    onClose();
  }, [values, onSave, onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (!disabled && e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSave();
      }
    },
    [onClose, handleSave, disabled]
  );

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      <Popover open modal={false}>
        <PopoverTrigger asChild>
          <div className="w-full h-full" />
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0"
          align="start"
          sideOffset={-28}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            // Focus will be handled by useEffect
          }}
          onCloseAutoFocus={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onFocusOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onKeyDown={handleKeyDown}
        >
          <div className="p-3 w-full" onKeyDown={handleKeyDown}>
            <div className="flex items-center gap-3 mb-3">
              {DURATION_FIELDS.map(({ field, label, max }) => (
                <div key={field} className="flex flex-col items-center gap-1">
                  <Input
                    ref={inputRefs[field]}
                    type="text"
                    placeholder="00"
                    value={values[field]}
                    onChange={handleFieldChange(field, max)}
                    onKeyDown={handleKeyDown}
                    disabled={disabled}
                    className="text-sm w-16 h-8 text-center px-2"
                  />
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>

            <Separator />

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-muted-foreground pr-2">
                {disabled ? "Read-only, Esc to close" : "Ctrl+Enter to save, Esc to cancel"}
              </span>
              <div className="flex gap-2">
                {disabled ? (
                  <Button type="button" variant="outline" size="sm" onClick={onClose} onKeyDown={handleKeyDown}>
                    Close
                  </Button>
                ) : (
                  <>
                    <Button type="button" variant="outline" size="sm" onClick={onClose} onKeyDown={handleKeyDown}>
                      Cancel
                    </Button>
                    <Button type="button" size="sm" onClick={handleSave} onKeyDown={handleKeyDown}>
                      Done
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
