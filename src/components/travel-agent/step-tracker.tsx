"use client";

import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Circle,
  Loader2,
  XCircle,
  Clock,
} from "lucide-react";
import type { AgentStep } from "@/types/agent";
import { Card } from "@/components/ui/card";

interface StepTrackerProps {
  steps: AgentStep[];
  className?: string;
}

export function StepTracker({ steps, className }: StepTrackerProps) {
  return (
    <Card className={cn("p-4", className)}>
      <div className="space-y-2">
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          Agent Progress
        </h3>

        {steps.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Initializing agent...</span>
          </div>
        ) : (
          <div className="space-y-3">
            {steps.map((step, index) => (
            <div key={step.id} className="flex items-start gap-3">
              {/* Status Icon */}
              <div className="flex-shrink-0 mt-0.5">
                {step.status === "completed" && (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                )}
                {step.status === "running" && (
                  <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                )}
                {step.status === "failed" && (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                {step.status === "pending" && (
                  <Circle className="w-5 h-5 text-muted-foreground" />
                )}
                {step.status === "skipped" && (
                  <Clock className="w-5 h-5 text-muted-foreground" />
                )}
              </div>

              {/* Step Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{step.step_name}</p>
                  {step.duration_ms && (
                    <span className="text-xs text-muted-foreground">
                      {(step.duration_ms / 1000).toFixed(1)}s
                    </span>
                  )}
                </div>

                {step.error && (
                  <p className="text-xs text-red-500 mt-1">{step.error}</p>
                )}

                {step.status === "running" && (
                  <div className="w-full bg-muted rounded-full h-1 mt-2">
                    <div className="bg-blue-500 h-1 rounded-full animate-pulse w-1/2" />
                  </div>
                )}
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="absolute left-[10px] top-8 w-0.5 h-6 bg-border" />
              )}
            </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
