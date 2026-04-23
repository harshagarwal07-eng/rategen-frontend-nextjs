"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { BorderedCard } from "@/components/ui/bordered-card";

interface AgePolicySectionProps {
  pkg: any;
  updatePackageField: (index: number, field: any, value: any) => void;
  packageIndex: number;
  onRemoveBracket?: (packageIndex: number, bracket: "adult" | "teenager" | "child" | "infant") => void;
}

// Helper function for numeric input handling
const handleNumericChange = (
  setter: (value: any) => void,
  value: string,
  isInteger = false
) => {
  const trimmedValue = value.trim();
  if (trimmedValue === "") {
    setter(undefined);
    return;
  }
  // Allow numbers and decimal point
  if (/^\d*\.?\d*$/.test(trimmedValue)) {
    const numValue = isInteger
      ? parseInt(trimmedValue)
      : parseFloat(trimmedValue);
    if (!isNaN(numValue)) {
      setter(numValue);
    }
  }
};

export default function AgePolicySection({ pkg, updatePackageField, packageIndex, onRemoveBracket }: AgePolicySectionProps) {
  const updateAgeBracket = (bracket: string, field: string, value: any) => {
    updatePackageField(packageIndex, "age_policy", {
      ...pkg.age_policy,
      [bracket]: {
        ...pkg.age_policy?.[bracket as keyof typeof pkg.age_policy],
        [field]: value,
      },
    });
  };

  const handleRemoveBracket = (bracket: "adult" | "teenager" | "child" | "infant") => {
    if (onRemoveBracket) {
      // Use callback to also clear rate values
      onRemoveBracket(packageIndex, bracket);
    } else {
      // Fallback: just remove from age_policy
      const updated = { ...pkg.age_policy };
      delete updated[bracket];
      updatePackageField(packageIndex, "age_policy", updated);
    }
  };

  return (
    <BorderedCard title="Age Policy" collapsible>
      <div className="space-y-3">
        <div className="gap-4 grid lg:grid-cols-2">
          {/* Adult */}
          {pkg.age_policy?.adult ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Adult</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveBracket("adult")}
                  className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-0.5">
                  <Label className="text-xs text-muted-foreground">Min Age</Label>
                  <Input
                    type="text"
                    placeholder="From"
                    value={pkg.age_policy?.adult?.min_age ?? ""}
                    onChange={(e) => {
                      handleNumericChange(
                        (val) => updateAgeBracket("adult", "min_age", val ?? 0),
                        e.target.value,
                        true
                      );
                    }}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-0.5">
                  <Label className="text-xs text-muted-foreground">Max Age</Label>
                  <Input
                    type="text"
                    placeholder="To"
                    value={pkg.age_policy?.adult?.max_age ?? ""}
                    onChange={(e) => {
                      handleNumericChange(
                        (val) => updateAgeBracket("adult", "max_age", val ?? 99),
                        e.target.value,
                        true
                      );
                    }}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </div>
          ) : null}

          {/* Teenager */}
          {pkg.age_policy?.teenager ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Teenager</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveBracket("teenager")}
                  className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-0.5">
                  <Label className="text-xs text-muted-foreground">Min Age</Label>
                  <Input
                    type="text"
                    placeholder="From"
                    value={pkg.age_policy?.teenager?.min_age ?? ""}
                    onChange={(e) => {
                      handleNumericChange(
                        (val) => updateAgeBracket("teenager", "min_age", val ?? 0),
                        e.target.value,
                        true
                      );
                    }}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-0.5">
                  <Label className="text-xs text-muted-foreground">Max Age</Label>
                  <Input
                    type="text"
                    placeholder="To"
                    value={pkg.age_policy?.teenager?.max_age ?? ""}
                    onChange={(e) => {
                      handleNumericChange(
                        (val) => updateAgeBracket("teenager", "max_age", val ?? 0),
                        e.target.value,
                        true
                      );
                    }}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </div>
          ) : null}

          {/* Child */}
          {pkg.age_policy?.child ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Child</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveBracket("child")}
                  className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-0.5">
                  <Label className="text-xs text-muted-foreground">Min Age</Label>
                  <Input
                    type="text"
                    placeholder="From"
                    value={pkg.age_policy?.child?.min_age ?? ""}
                    onChange={(e) => {
                      handleNumericChange(
                        (val) => updateAgeBracket("child", "min_age", val ?? 0),
                        e.target.value,
                        true
                      );
                    }}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-0.5">
                  <Label className="text-xs text-muted-foreground">Max Age</Label>
                  <Input
                    type="text"
                    placeholder="To"
                    value={pkg.age_policy?.child?.max_age ?? ""}
                    onChange={(e) => {
                      handleNumericChange(
                        (val) => updateAgeBracket("child", "max_age", val ?? 0),
                        e.target.value,
                        true
                      );
                    }}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </div>
          ) : null}

          {/* Infant */}
          {pkg.age_policy?.infant ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Infant</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveBracket("infant")}
                  className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-0.5">
                  <Label className="text-xs text-muted-foreground">Min Age</Label>
                  <Input
                    type="text"
                    placeholder="From"
                    value={pkg.age_policy?.infant?.min_age ?? ""}
                    onChange={(e) => {
                      handleNumericChange(
                        (val) => updateAgeBracket("infant", "min_age", val ?? 0),
                        e.target.value,
                        true
                      );
                    }}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-0.5">
                  <Label className="text-xs text-muted-foreground">Max Age</Label>
                  <Input
                    type="text"
                    placeholder="To"
                    value={pkg.age_policy?.infant?.max_age ?? ""}
                    onChange={(e) => {
                      handleNumericChange(
                        (val) => updateAgeBracket("infant", "max_age", val ?? 0),
                        e.target.value,
                        true
                      );
                    }}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Add Age Bracket Buttons */}
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          {!pkg.age_policy?.adult && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                updateAgeBracket("adult", "min_age", 18);
                updateAgeBracket("adult", "max_age", 99);
              }}
              className="h-8"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Adult
            </Button>
          )}
          {!pkg.age_policy?.teenager && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                updateAgeBracket("teenager", "min_age", 13);
                updateAgeBracket("teenager", "max_age", 17);
              }}
              className="h-8"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Teenager
            </Button>
          )}
          {!pkg.age_policy?.child && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                updateAgeBracket("child", "min_age", 2);
                updateAgeBracket("child", "max_age", 12);
              }}
              className="h-8"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Child
            </Button>
          )}
          {!pkg.age_policy?.infant && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                updateAgeBracket("infant", "min_age", 0);
                updateAgeBracket("infant", "max_age", 1);
              }}
              className="h-8"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Infant
            </Button>
          )}
        </div>
      </div>
    </BorderedCard>
  );
}