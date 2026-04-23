"use client";

import { memo } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Step = {
  value: string;
  label: string;
};

type StepIndicatorProps = {
  steps: Step[];
  completedSteps: string[];
};

function StepIndicator({ steps, completedSteps }: StepIndicatorProps) {
  return (
    <div className="grid grid-cols-5 gap-6">
      {steps.map((step, index) => {
        const isCompleted = completedSteps.includes(step.value);
        const isLastStep = index === steps.length - 1;

        return (
          <div className={cn("flex gap-3 items-center", isLastStep ? "col-span-1" : "col-span-2")} key={step.value}>
            {/* Step Circle */}
            <div
              className={cn(
                "size-10 flex justify-center items-center font-semibold rounded-full",
                isCompleted
                  ? "bg-primary text-primary-foreground"
                  : "border border-muted-foreground/50 text-muted-foreground/50"
              )}
            >
              {isCompleted ? <Check className="size-5" /> : index + 1}
            </div>

            {/* Step Label */}
            <p className={cn(isCompleted ? "font-medium" : "text-muted-foreground/50")}>{step.label}</p>

            {/* Connecting Line */}
            {!isLastStep && <div className={cn("flex-1 h-1", isCompleted ? "bg-primary" : "bg-muted-foreground/50")} />}
          </div>
        );
      })}
    </div>
  );
}

export default memo(StepIndicator);
