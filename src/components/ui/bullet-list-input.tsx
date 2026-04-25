"use client";

import { useCallback, useRef } from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BulletListInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  minRows?: number;
  className?: string;
}

export function BulletListInput({
  value,
  onChange,
  placeholder,
  minRows = 1,
  className,
}: BulletListInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const focusOnMount = useRef<number | null>(null);

  const items = value.length === 0 ? Array.from({ length: minRows }, () => "") : value;

  const setItems = useCallback(
    (next: string[]) => {
      onChange(next);
    },
    [onChange],
  );

  const handleChange = (idx: number, next: string) => {
    const arr = [...items];
    arr[idx] = next;
    setItems(arr);
  };

  const focusRow = (idx: number) => {
    requestAnimationFrame(() => inputRefs.current[idx]?.focus());
  };

  const addRowAt = (idx: number) => {
    const arr = [...items];
    arr.splice(idx + 1, 0, "");
    setItems(arr);
    focusOnMount.current = idx + 1;
    focusRow(idx + 1);
  };

  const removeRowAt = (idx: number) => {
    if (items.length <= 1) {
      setItems([""]);
      focusRow(0);
      return;
    }
    const arr = items.filter((_, i) => i !== idx);
    setItems(arr);
    focusRow(Math.max(0, idx - 1));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addRowAt(idx);
      return;
    }
    if (e.key === "Backspace" && items[idx] === "") {
      e.preventDefault();
      removeRowAt(idx);
    }
  };

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-1.5">
          <span aria-hidden className="w-3 text-center text-muted-foreground select-none leading-none">
            •
          </span>
          <Input
            ref={(el) => {
              inputRefs.current[idx] = el;
            }}
            value={item}
            onChange={(e) => handleChange(idx, e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            placeholder={placeholder}
            className="h-8 text-sm"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
            onClick={() => removeRowAt(idx)}
            aria-label="Remove item"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 self-start text-xs text-muted-foreground hover:text-foreground -ml-1"
        onClick={() => addRowAt(items.length - 1)}
      >
        <Plus className="h-3.5 w-3.5" />
        Add item
      </Button>
    </div>
  );
}
