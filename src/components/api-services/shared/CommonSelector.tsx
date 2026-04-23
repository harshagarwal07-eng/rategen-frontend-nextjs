"use client";

import { CheckSquare, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import Show from "@/components/ui/show";
import { IOption } from "@/types/common";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

type Props = {
  label?: string;
  selected: string[];
  onChange: (val: string[]) => void;
  options: IOption[];
  defaultOpen?: boolean;
};

const CommonSelector = ({ label, selected, onChange, options, defaultOpen = false }: Props) => {
  const handleChange = (optionValue: string) => {
    let newOptions: string[] = [];
    if (selected.includes(optionValue)) {
      newOptions = selected.filter((r) => r !== optionValue);
    } else {
      newOptions = [...selected, optionValue];
    }
    onChange(newOptions);
  };

  return (
    <div className="[&_.bg-popover\/40]:bg-transparent!">
      <Accordion type="single" collapsible defaultValue={defaultOpen ? "item-1" : undefined}>
        <AccordionItem value="item-1" className="border-none">
          <AccordionTrigger className="py-2 px-0 hover:no-underline bg-transparent">
            <div className="flex items-center justify-between w-full pr-2">
              <p className="text-sm font-medium">{label}</p>
              {selected.length > 0 && (
                <span className="text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5">
                  {selected.length}
                </span>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2 space-y-1 rounded-lg">
            {options.map((option) => (
              <p
                key={option.value}
                onClick={() => handleChange(option.value)}
                className={cn(
                  "flex items-center gap-2 py-1 px-2 text-sm rounded-sm transition-colors cursor-pointer hover:bg-popover/40",
                  selected.includes(option.value) && "font-semibold text-primary"
                )}
              >
                <Show when={selected.includes(option.value)}>
                  <CheckSquare className="size-4" />
                </Show>
                <Show when={!selected.includes(option.value)}>
                  <Square className="size-4 text-muted-foreground" />
                </Show>
                {option.label}
              </p>
            ))}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default CommonSelector;
