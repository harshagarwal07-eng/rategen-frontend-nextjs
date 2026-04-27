"use client";

import { Plus, Trash2 } from "lucide-react";
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
import { cn } from "@/lib/utils";
import {
  LocalCancellationRule,
  newRuleLocalId,
} from "./offers-shared";

interface Props {
  isNonRefundable: boolean;
  rules: LocalCancellationRule[];
  onIsNonRefundableChange: (v: boolean) => void;
  onRulesChange: (rules: LocalCancellationRule[]) => void;
  disabled?: boolean;
}

export function CancellationPolicyEditor({
  isNonRefundable,
  rules,
  onIsNonRefundableChange,
  onRulesChange,
  disabled,
}: Props) {
  function updateRule(index: number, patch: Partial<LocalCancellationRule>) {
    const next = [...rules];
    next[index] = { ...next[index], ...patch };
    onRulesChange(next);
  }

  function addRule() {
    onRulesChange([
      ...rules,
      {
        _localId: newRuleLocalId(),
        id: null,
        days_from: 0,
        days_to: 30,
        anchor: "checkin_date",
        is_no_show: false,
        charge_type: "percentage",
        charge_value: 100,
      },
    ]);
  }

  function removeRule(index: number) {
    onRulesChange(rules.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Non-Refundable
        </span>
        <Switch
          checked={isNonRefundable}
          onCheckedChange={(v) => {
            onIsNonRefundableChange(!!v);
            if (v) onRulesChange([]);
          }}
          disabled={disabled}
        />
        {isNonRefundable && (
          <span className="text-xs text-muted-foreground">
            100% charge applies from booking date — no rules needed.
          </span>
        )}
      </div>

      {!isNonRefundable && (
        <>
          {rules.length > 0 && (
            <div className="rounded-md border overflow-x-auto">
              <div className="grid grid-cols-[80px_80px_140px_120px_80px_60px_32px] gap-2 border-b bg-muted/40 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground min-w-[600px]">
                <span>Days From</span>
                <span>Days To</span>
                <span>Anchor</span>
                <span>Charge Type</span>
                <span>Value</span>
                <span>No-Show</span>
                <span />
              </div>
              {rules.map((rule, i) => (
                <div key={rule._localId} className="border-b last:border-b-0">
                  <div
                    className={cn(
                      "grid grid-cols-[80px_80px_140px_120px_80px_60px_32px] items-center gap-2 px-3 py-1.5 min-w-[600px]",
                      rule.is_no_show && "bg-amber-50"
                    )}
                  >
                    <Input
                      type="number"
                      className={cn(
                        "h-7 text-xs",
                        rule.is_no_show && "bg-muted/50 text-muted-foreground"
                      )}
                      value={rule.days_from ?? 0}
                      readOnly={rule.is_no_show}
                      disabled={disabled}
                      onChange={(e) =>
                        updateRule(i, {
                          days_from: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                    <Input
                      type="number"
                      className={cn(
                        "h-7 text-xs",
                        rule.is_no_show && "bg-muted/50 text-muted-foreground"
                      )}
                      value={rule.days_to ?? 0}
                      readOnly={rule.is_no_show}
                      disabled={disabled}
                      onChange={(e) =>
                        updateRule(i, {
                          days_to: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                    <Select
                      value={rule.anchor}
                      onValueChange={(v) =>
                        updateRule(i, {
                          anchor:
                            v === "booking_date"
                              ? "booking_date"
                              : "checkin_date",
                        })
                      }
                      disabled={disabled}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="checkin_date">
                          Before check-in
                        </SelectItem>
                        <SelectItem value="booking_date">
                          From booking date
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex h-7 rounded border p-0.5">
                      {(["percentage", "nights"] as const).map((ct) => (
                        <button
                          key={ct}
                          type="button"
                          onClick={() => updateRule(i, { charge_type: ct })}
                          disabled={disabled}
                          className={cn(
                            "flex-1 rounded px-1 py-0.5 text-[10px] font-medium transition-colors",
                            rule.charge_type === ct
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-muted/40"
                          )}
                        >
                          {ct === "percentage" ? "%" : "Nights"}
                        </button>
                      ))}
                    </div>
                    <Input
                      type="number"
                      className="h-7 text-xs"
                      value={rule.charge_value}
                      disabled={disabled}
                      onChange={(e) =>
                        updateRule(i, {
                          charge_value: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                    <div className="flex items-center justify-center">
                      <Switch
                        checked={rule.is_no_show}
                        onCheckedChange={(v) =>
                          updateRule(i, {
                            is_no_show: !!v,
                            days_from: v ? 0 : 1,
                            days_to: v ? 0 : 30,
                          })
                        }
                        disabled={disabled}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeRule(i)}
                      disabled={disabled}
                      aria-label="Remove rule"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {rule.is_no_show && (
                    <p className="px-3 pb-1.5 text-[10px] text-amber-700 bg-amber-50">
                      No-show rules always apply on check-in day (day 0).
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={addRule}
            disabled={disabled}
          >
            <Plus className="h-3.5 w-3.5" /> Add Rule
          </Button>
        </>
      )}
    </div>
  );
}
