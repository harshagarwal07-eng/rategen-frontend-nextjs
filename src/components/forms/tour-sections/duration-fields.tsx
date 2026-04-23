"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DurationFieldsProps {
  pkg: any;
  updatePackageField: (index: number, field: any, value: any) => void;
  packageIndex: number;
}

// Helper function for duration fields with max validation
const handleDurationChange = (
  setter: (value: any) => void,
  value: string,
  maxValue: number = 60
) => {
  const trimmedValue = value.trim();
  if (trimmedValue === "") {
    setter(undefined);
    return;
  }
  // Allow only integers
  if (/^\d+$/.test(trimmedValue)) {
    let numValue = parseInt(trimmedValue);
    if (!isNaN(numValue)) {
      // Cap at maxValue
      if (numValue > maxValue) {
        numValue = maxValue;
      }
      setter(numValue);
    }
  }
};

export default function DurationFields({ pkg, updatePackageField, packageIndex }: DurationFieldsProps) {
  // Helper to update duration JSONB field
  const updateDuration = (field: 'days' | 'hours' | 'minutes', value: any) => {
    const currentDuration = pkg.duration || {};
    const newDuration = { ...currentDuration, [field]: value };
    // Remove undefined values to keep JSONB clean
    Object.keys(newDuration).forEach(key => {
      if (newDuration[key] === undefined || newDuration[key] === null) {
        delete newDuration[key];
      }
    });
    updatePackageField(packageIndex, "duration", newDuration);
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Duration</Label>
      <div className="flex gap-2 items-center">
        <div className="flex flex-col items-center gap-1">
          <Input
            type="text"
            placeholder="00"
            value={pkg.duration?.days || ""}
            onChange={(e) =>
              handleDurationChange(
                (val) => updateDuration('days', val),
                e.target.value,
                999
              )
            }
            className="text-sm w-16 text-center"
          />
          <span className="text-xs text-muted-foreground">Days</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Input
            type="text"
            placeholder="00"
            value={pkg.duration?.hours || ""}
            onChange={(e) =>
              handleDurationChange(
                (val) => updateDuration('hours', val),
                e.target.value,
                60
              )
            }
            className="text-sm w-16 text-center"
          />
          <span className="text-xs text-muted-foreground">Hours</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Input
            type="text"
            placeholder="00"
            value={pkg.duration?.minutes || ""}
            onChange={(e) =>
              handleDurationChange(
                (val) => updateDuration('minutes', val),
                e.target.value,
                60
              )
            }
            className="text-sm w-16 text-center"
          />
          <span className="text-xs text-muted-foreground">Minutes</span>
        </div>
      </div>
    </div>
  );
}