import * as React from "react";
import { cn } from "@/lib/utils";

/* ---------------------------------- Types --------------------------------- */

type TextareaProps = React.ComponentProps<"textarea"> & {
  rightIcon?: React.ReactNode;
};

/* --------------------------------- Textarea -------------------------------- */

function Textarea({ className, rightIcon, disabled, ...props }: TextareaProps) {
  return (
    <div className={cn("relative w-full")}>
      <textarea
        data-slot="textarea"
        disabled={disabled}
        className={cn(
          "border-2 placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md bg-transparent px-3 py-2 text-base transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          rightIcon && "pr-10",
          className
        )}
        {...props}
      />

      {rightIcon && (
        <div
          className={cn("pointer-events-none absolute top-2.5 right-3 text-muted-foreground", disabled && "opacity-50")}
        >
          {rightIcon}
        </div>
      )}
    </div>
  );
}

export { Textarea };
