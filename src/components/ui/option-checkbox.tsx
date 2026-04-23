"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

type OptionCheckboxProps = {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id: string;
};

export default function OptionCheckbox({
  label,
  description,
  checked,
  onCheckedChange,
  id,
}: OptionCheckboxProps) {
  return (
    <div className="w-full">
      <Label className="hover:bg-accent/50 flex items-start gap-3 rounded-lg border-2 p-3 has-[[aria-checked=true]]:border-primary has-[[aria-checked=true]]:bg-primary/10 dark:has-[[aria-checked=true]]:border-primary dark:has-[[aria-checked=true]]:bg-primary/10">
        <Checkbox
          id={id}
          checked={checked}
          onCheckedChange={onCheckedChange}
          className="data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-white dark:data-[state=checked]:border-primary dark:data-[state=checked]:bg-primary"
        />
        <div className="grid gap-1.5 font-normal">
          <p className="text-sm leading-none font-medium">{label}</p>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
      </Label>
    </div>
  );
}
