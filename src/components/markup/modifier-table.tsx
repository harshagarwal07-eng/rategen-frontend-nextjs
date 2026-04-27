"use client";

import { useEffect, useMemo, useState } from "react";
import isEqual from "lodash/isEqual";
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useUpsertModifiers } from "@/hooks/markup/use-markup-modifiers";
import {
  type MarkupModifier,
  type MarkupValue,
  type ModifierType,
  MODIFIER_LABELS,
} from "@/types/markup";
import { emptyMarkupValue } from "./format";
import { MarkupValueEditor } from "./markup-value-editor";

export type ModifierRowDef = {
  /** Stable key sent as modifier_value (tier literal or entity id). */
  key: string;
  /** Display label. */
  label: string;
};

type Props = {
  configId: string;
  modifierType: ModifierType;
  /** Canonical set of rows for this modifier type. */
  rows: ModifierRowDef[];
  /** Current saved modifiers from the config. */
  saved: MarkupModifier[];
  /** Optional handler when DMC clicks the "view dimension" link. */
  onOpenDrawer?: () => void;
  /** When rows is empty, show this prompt instead of an empty table. */
  emptyHint?: React.ReactNode;
};

export function ModifierTable({
  configId,
  modifierType,
  rows,
  saved,
  onOpenDrawer,
  emptyHint,
}: Props) {
  const [open, setOpen] = useState(true);
  const upsert = useUpsertModifiers(configId);

  // Build initial map keyed by modifier_value.
  const initialMap = useMemo(() => {
    const m = new Map<string, MarkupValue>();
    saved
      .filter((mod) => mod.modifier_type === modifierType)
      .forEach((mod) => m.set(mod.modifier_value, mod.adjustment));
    return m;
  }, [saved, modifierType]);

  // Local edit state, seeded from initial + 0% defaults for missing rows.
  const [local, setLocal] = useState<Map<string, MarkupValue>>(new Map());

  useEffect(() => {
    const next = new Map<string, MarkupValue>();
    rows.forEach((r) => {
      next.set(r.key, initialMap.get(r.key) ?? emptyMarkupValue());
    });
    setLocal(next);
  }, [rows, initialMap]);

  const dirty = useMemo(() => {
    if (rows.length === 0) return false;
    for (const r of rows) {
      const cur = local.get(r.key);
      const orig = initialMap.get(r.key) ?? emptyMarkupValue();
      if (!isEqual(cur, orig)) return true;
    }
    return false;
  }, [local, initialMap, rows]);

  const setRow = (key: string, val: MarkupValue) => {
    setLocal((prev) => {
      const next = new Map(prev);
      next.set(key, val);
      return next;
    });
  };

  const onSave = () => {
    upsert.mutate({
      modifier_type: modifierType,
      rows: rows.map((r) => ({
        modifier_value: r.key,
        adjustment: local.get(r.key) ?? emptyMarkupValue(),
      })),
    });
  };

  const configuredCount = rows.filter((r) => initialMap.has(r.key)).length;
  const label = MODIFIER_LABELS[modifierType];

  return (
    <Card>
      <CardHeader className="py-3">
        <div className="flex items-center justify-between gap-2">
          <button
            className="flex items-center gap-2 text-left flex-1"
            onClick={() => setOpen((p) => !p)}
            type="button"
          >
            {open ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="font-medium text-sm">{label}</span>
            <span className="text-xs text-muted-foreground">
              {rows.length === 0
                ? "no entities defined"
                : `${configuredCount} / ${rows.length} configured`}
            </span>
          </button>
          {onOpenDrawer && rows.length > 0 && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={onOpenDrawer}
            >
              <ExternalLink className="h-3 w-3" /> Manage
            </Button>
          )}
        </div>
      </CardHeader>

      {open && (
        <CardContent className="pt-0">
          {rows.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              {emptyHint ?? `No ${label.toLowerCase()} entities defined yet.`}
              {onOpenDrawer && (
                <Button
                  variant="link"
                  size="sm"
                  className="ml-1 h-auto p-0 text-sm"
                  onClick={onOpenDrawer}
                  type="button"
                >
                  Create one →
                </Button>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/3">{label}</TableHead>
                    <TableHead>Adjustment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.key}>
                      <TableCell className="font-medium align-middle">{r.label}</TableCell>
                      <TableCell>
                        <MarkupValueEditor
                          value={local.get(r.key) ?? emptyMarkupValue()}
                          onChange={(v) => setRow(r.key, v)}
                          showPaxBreakdown={false}
                          compact
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-end pt-3">
                <Button
                  size="sm"
                  disabled={!dirty || upsert.isPending}
                  loading={upsert.isPending}
                  onClick={onSave}
                >
                  Save {label.toLowerCase()}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}
