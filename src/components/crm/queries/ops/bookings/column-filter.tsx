"use client";

import { Filter, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Command, CommandGroup, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface ColumnFilterProps {
  title: string;
  options: { label: string; value: string }[];
  selected: Set<string>;
  onSelect: (value: string) => void;
  onClear: () => void;
}

export function ColumnFilter({ title, options, selected, onSelect, onClear }: ColumnFilterProps) {
  const hasSelection = selected.size > 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 data-[state=open]:bg-accent flex items-center gap-2 [&_svg:not([class*='size-'])]:size-3",
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
