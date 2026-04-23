"use client";

import { cn } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Info, LucideIcon } from "lucide-react";

export type DetailDataListItem = {
  id: string;
  label: string | React.ReactNode;
  value: string | number | React.ReactNode;
  icon?: LucideIcon;
  description?: string;
};

interface DetailDataListProps {
  items: DetailDataListItem[];
  className?: string;
  accordion?: {
    title: string;
    value: string;
    defaultOpen?: boolean;
    action?: React.ReactNode;
  };
}

export function DetailDataList({ items, className, accordion }: DetailDataListProps) {
  const listContent = (
    <div className={cn("space-y-2.5 pb-2", className)}>
      {items.map((item) => (
        <div key={item.id} className="grid items-center grid-cols-3 gap-2">
          <p className="text-xs font-medium text-muted-foreground leading-tight flex items-center gap-1.5">
            {item.icon && <item.icon className="size-3.5 text-muted-foreground shrink-0" />}
            {item.label}
            {item.description && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-4 w-4 p-0 hover:bg-transparent">
                    <Info className="size-3 text-muted-foreground hover:text-muted-foreground transition-colors" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="max-w-sm" side="bottom" align="end">
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </p>
          <div className="capitalize text-xs col-span-2">
            {typeof item.value === "object" && item.value !== null ? item.value : item.value}
          </div>
        </div>
      ))}
    </div>
  );

  if (accordion) {
    return (
      <Accordion type="single" collapsible defaultValue={accordion.defaultOpen ? accordion.value : undefined}>
        <AccordionItem value={accordion.value} className="border-0">
          <AccordionTrigger className="hover:no-underline py-0 pb-2 cursor-pointer bg-transparent text-xs font-semibold">
            {accordion.title}
          </AccordionTrigger>
          <AccordionContent className="text-foreground font-normal pt-1.5">{listContent}</AccordionContent>
        </AccordionItem>
      </Accordion>
    );
  }

  return listContent;
}
