"use client";

import { useEffect, useState } from "react";
import isEqual from "lodash/isEqual";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdateMarkupConfig } from "@/hooks/markup/use-markup-configs";
import type { MarkupBounds } from "@/types/markup";

type Props = {
  configId: string;
  initial: MarkupBounds | undefined;
};

type LocalBounds = {
  min: string;
  max: string;
  per: "pax" | "total";
};

function toLocal(b: MarkupBounds | undefined): LocalBounds {
  return {
    min: b?.min != null ? String(b.min) : "",
    max: b?.max != null ? String(b.max) : "",
    per: b?.per ?? "pax",
  };
}

function toBounds(l: LocalBounds): MarkupBounds | null {
  const min = l.min === "" ? undefined : Number.parseFloat(l.min);
  const max = l.max === "" ? undefined : Number.parseFloat(l.max);
  if (min == null && max == null) return null;
  return { min, max, per: l.per };
}

export function BoundsEditor({ configId, initial }: Props) {
  const [local, setLocal] = useState<LocalBounds>(toLocal(initial));
  const update = useUpdateMarkupConfig(configId);

  useEffect(() => {
    setLocal(toLocal(initial));
  }, [initial]);

  const next = toBounds(local);
  const dirty = !isEqual(next, initial ?? null);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Limits (optional)</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Min</Label>
            <Input
              type="number"
              step="0.01"
              value={local.min}
              onChange={(e) => setLocal((p) => ({ ...p, min: e.target.value }))}
              placeholder="—"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Max</Label>
            <Input
              type="number"
              step="0.01"
              value={local.max}
              onChange={(e) => setLocal((p) => ({ ...p, max: e.target.value }))}
              placeholder="—"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Per</Label>
            <Select
              value={local.per}
              onValueChange={(v) => setLocal((p) => ({ ...p, per: v as "pax" | "total" }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pax">pax</SelectItem>
                <SelectItem value="total">total</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Final markup will never go below the minimum or above the maximum.
        </p>
        <div className="flex justify-end">
          <Button
            size="sm"
            disabled={!dirty || update.isPending}
            loading={update.isPending}
            onClick={() => update.mutate({ bounds: next })}
          >
            Save limits
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
