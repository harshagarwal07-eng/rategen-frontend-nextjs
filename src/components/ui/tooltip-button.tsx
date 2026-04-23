"use client";

import * as React from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { type VariantProps } from "class-variance-authority";

interface TooltipButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  tooltip: string;
  tooltipSide?: "top" | "right" | "bottom" | "left";
  asChild?: boolean;
  loading?: boolean;
  loadingText?: string;
}

export function TooltipButton({
  tooltip,
  tooltipSide = "top",
  ...props
}: TooltipButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button {...props} />
      </TooltipTrigger>
      <TooltipContent side={tooltipSide}>
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}
