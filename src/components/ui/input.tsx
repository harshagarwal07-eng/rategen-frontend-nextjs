import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/* ---------------- VARIANTS ---------------- */

const inputVariants = cva(
  "flex w-full min-w-0 text-base transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
  {
    variants: {
      variant: {
        default:
          "h-10 rounded-md border-2 px-3 py-1 text-foreground dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        cell: "h-auto bg-transparent border-0 p-0 focus:outline-none focus:ring-0 rounded-none text-xs",
      },
      align: {
        left: "text-left",
        center: "text-center",
        right: "text-right",
      },
    },
    defaultVariants: {
      variant: "default",
      align: "left",
    },
  }
);

/* ---------------- TYPES ---------------- */

type InputProps = React.ComponentProps<"input"> &
  VariantProps<typeof inputVariants> & {
    rightIcon?: React.ReactNode;
  };

/* ---------------- COMPONENT ---------------- */

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant, align, rightIcon, onWheel, ...props }, ref) => {
    const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => {
      if (type === "number") {
        e.currentTarget.blur(); // stops scroll value change
        return;
      }
      onWheel?.(e);
    };

    const inputEl = (
      <input
        ref={ref}
        type={type}
        data-slot="input"
        className={cn(inputVariants({ variant, align }), rightIcon && "pr-10", className)}
        onWheel={handleWheel}
        {...props}
      />
    );

    if (!rightIcon) return inputEl;

    return (
      <div className="relative w-full">
        {inputEl}
        <div
          className={cn(
            "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 flex h-4 w-4 items-center text-primary",
            props.disabled && "opacity-50"
          )}
        >
          {rightIcon}
        </div>
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input, inputVariants };
