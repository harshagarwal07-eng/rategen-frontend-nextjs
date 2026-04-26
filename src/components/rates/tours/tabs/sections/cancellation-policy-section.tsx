"use client";

// Cancellation policy editor for tour packages.
// Forked from transfers' cancellation-policy-section because that file
// imports `upsertCancellationPolicy` and `replaceCancellationRules` from
// the transfers data-access module. Tours have parallel endpoints.
// Structure and field set are identical to transfers.

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  upsertCancellationPolicy,
  replaceCancellationRules,
} from "@/data-access/tours-api";
import {
  TourCancellationPolicy,
  TourCancellationRule,
} from "@/types/tours";

interface RuleRow {
  _key: string;
  days_from: number;
  days_to: number;
  anchor: string;
  charge_type: string;
  charge_value: number;
  is_no_show: boolean;
}

interface CancellationPolicySectionProps {
  packageId?: string;
  initialPolicy?:
    | (TourCancellationPolicy & {
        tour_cancellation_rules?: TourCancellationRule[];
      })
    | null;
}

export default function CancellationPolicySection({
  packageId,
  initialPolicy,
}: CancellationPolicySectionProps) {
  const [isNonRefundable, setIsNonRefundable] = useState(
    initialPolicy?.is_non_refundable ?? false,
  );
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (
      initialPolicy?.tour_cancellation_rules &&
      initialPolicy.tour_cancellation_rules.length > 0
    ) {
      setRules(
        initialPolicy.tour_cancellation_rules.map((r, i) => ({
          _key: `rule-${i}`,
          days_from: r.days_from || 0,
          days_to: r.days_to || 0,
          anchor: r.anchor || "before_service",
          charge_type: r.charge_type || "percentage",
          charge_value: r.charge_value || 0,
          is_no_show: r.is_no_show || false,
        })),
      );
    } else {
      setRules([]);
    }
  }, [initialPolicy]);

  const handleAddRule = () => {
    setRules((prev) => [
      ...prev,
      {
        _key: `rule-${Date.now()}`,
        days_from: 0,
        days_to: 0,
        anchor: "before_service",
        charge_type: "percentage",
        charge_value: 0,
        is_no_show: false,
      },
    ]);
  };

  const handleRemoveRule = (key: string) => {
    setRules((prev) => prev.filter((r) => r._key !== key));
  };

  const handleRuleChange = (
    key: string,
    field: keyof RuleRow,
    value: string | number | boolean,
  ) => {
    setRules((prev) =>
      prev.map((r) =>
        r._key === key
          ? {
              ...r,
              [field]:
                field === "days_from" ||
                field === "days_to" ||
                field === "charge_value"
                  ? Number(value)
                  : value,
            }
          : r,
      ),
    );
  };

  const handleSave = async () => {
    if (!packageId || packageId.startsWith("pending")) {
      toast.info("Save the package first");
      return;
    }

    setSaving(true);
    try {
      const policyRes = await upsertCancellationPolicy(packageId, {
        is_non_refundable: isNonRefundable,
      });
      if (policyRes.error) throw new Error(policyRes.error);

      const rulesPayload: TourCancellationRule[] = isNonRefundable
        ? []
        : rules.map((r) => ({
            days_from: r.days_from,
            days_to: r.days_to,
            anchor: r.anchor,
            charge_type: r.charge_type,
            charge_value: r.charge_value,
            is_no_show: r.is_no_show,
          }));

      const rulesRes = await replaceCancellationRules(packageId, rulesPayload);
      if (rulesRes.error) throw new Error(rulesRes.error);

      toast.success("Cancellation policy saved");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save policy",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-md border bg-muted/20 p-3 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Cancellation Policy
        </h3>
        <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
          Save Policy
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Switch
          checked={isNonRefundable}
          onCheckedChange={(checked) => {
            setIsNonRefundable(checked);
            if (checked) setRules([]);
          }}
        />
        <span className="text-sm">Non-Refundable (100% charge applies)</span>
      </div>

      {!isNonRefundable && (
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Cancellation Rules
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddRule}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Rule
            </Button>
          </div>

          {rules.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              No rules yet. Add rules to define cancellation penalties.
            </p>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <div className="grid grid-cols-[80px_80px_160px_130px_90px_70px_40px] gap-0 border-b bg-muted/50 min-w-[660px]">
                <div className="px-2 py-1.5 text-xs font-semibold">From</div>
                <div className="px-2 py-1.5 text-xs font-semibold">To</div>
                <div className="px-2 py-1.5 text-xs font-semibold">Anchor</div>
                <div className="px-2 py-1.5 text-xs font-semibold">Type</div>
                <div className="px-2 py-1.5 text-xs font-semibold">Value</div>
                <div className="px-2 py-1.5 text-xs font-semibold">No-Show</div>
                <div />
              </div>

              {rules.map((rule) => (
                <div
                  key={rule._key}
                  className="grid grid-cols-[80px_80px_160px_130px_90px_70px_40px] gap-0 border-b last:border-b-0 items-center min-w-[660px]"
                >
                  <div className="px-2 py-1">
                    <Input
                      type="number"
                      className="h-6 text-xs"
                      value={rule.days_from}
                      onChange={(e) =>
                        handleRuleChange(rule._key, "days_from", e.target.value)
                      }
                    />
                  </div>
                  <div className="px-2 py-1">
                    <Input
                      type="number"
                      className="h-6 text-xs"
                      value={rule.days_to}
                      onChange={(e) =>
                        handleRuleChange(rule._key, "days_to", e.target.value)
                      }
                    />
                  </div>
                  <div className="px-2 py-1">
                    <Select
                      value={rule.anchor}
                      onValueChange={(val) =>
                        handleRuleChange(rule._key, "anchor", val)
                      }
                    >
                      <SelectTrigger className="h-6 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="before_service">
                          Before Service
                        </SelectItem>
                        <SelectItem value="after_booking">
                          After Booking
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="px-2 py-1">
                    <Select
                      value={rule.charge_type}
                      onValueChange={(val) =>
                        handleRuleChange(rule._key, "charge_type", val)
                      }
                    >
                      <SelectTrigger className="h-6 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage</SelectItem>
                        <SelectItem value="fixed">Fixed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="px-2 py-1">
                    <Input
                      type="number"
                      className="h-6 text-xs"
                      value={rule.charge_value}
                      onChange={(e) =>
                        handleRuleChange(
                          rule._key,
                          "charge_value",
                          e.target.value,
                        )
                      }
                    />
                  </div>
                  <div className="px-2 py-1">
                    <Switch
                      checked={rule.is_no_show}
                      onCheckedChange={(checked) =>
                        handleRuleChange(rule._key, "is_no_show", checked)
                      }
                    />
                  </div>
                  <div className="px-2 py-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveRule(rule._key)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
