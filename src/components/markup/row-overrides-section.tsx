"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useCreateOverride,
  useDeleteOverride,
  useUpdateOverride,
} from "@/hooks/markup/use-markup-overrides";
import type { MarkupOverride, MarkupValue } from "@/types/markup";
import { emptyMarkupValue, formatMarkupValue } from "./format";
import { MarkupValueEditor } from "./markup-value-editor";

type Props = {
  configId: string;
  overrides: MarkupOverride[];
};

export function RowOverridesSection({ configId, overrides }: Props) {
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [newProductId, setNewProductId] = useState("");
  const [newValue, setNewValue] = useState<MarkupValue>(emptyMarkupValue());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<MarkupValue>(emptyMarkupValue());

  const createMut = useCreateOverride(configId);
  const updateMut = useUpdateOverride(configId);
  const deleteMut = useDeleteOverride(configId);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return overrides;
    return overrides.filter((o) => o.product_id.toLowerCase().includes(q));
  }, [overrides, search]);

  const onCreate = async () => {
    if (!newProductId.trim()) return;
    await createMut.mutateAsync({ product_id: newProductId.trim(), base_markup: newValue });
    setNewProductId("");
    setNewValue(emptyMarkupValue());
    setAdding(false);
  };

  const startEdit = (o: MarkupOverride) => {
    setEditingId(o.id);
    setEditValue(o.base_markup);
  };

  const onUpdate = async (id: string) => {
    await updateMut.mutateAsync({ overrideId: id, input: { base_markup: editValue } });
    setEditingId(null);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0">
        <CardTitle className="text-base">
          Product overrides ({overrides.length})
        </CardTitle>
        <Button size="sm" variant="outline" onClick={() => setAdding((p) => !p)}>
          <Plus className="h-4 w-4" /> Add override
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Input
          placeholder="Search by product id…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />

        {adding && (
          <div className="rounded-md border bg-muted/30 p-3 flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Product ID</label>
                <Input
                  value={newProductId}
                  onChange={(e) => setNewProductId(e.target.value)}
                  placeholder="UUID of the product"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Base markup</label>
                <MarkupValueEditor value={newValue} onChange={setNewValue} compact showPaxBreakdown={false} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={onCreate}
                disabled={!newProductId.trim() || createMut.isPending}
                loading={createMut.isPending}
              >
                Add
              </Button>
            </div>
          </div>
        )}

        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            No overrides{search ? " match your search" : " yet"}.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Base markup</TableHead>
                <TableHead className="w-32 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs truncate max-w-xs">
                    {o.product_id}
                  </TableCell>
                  <TableCell>
                    {editingId === o.id ? (
                      <MarkupValueEditor
                        value={editValue}
                        onChange={setEditValue}
                        compact
                        showPaxBreakdown={false}
                      />
                    ) : (
                      <span className="text-sm">{formatMarkupValue(o.base_markup)}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {editingId === o.id ? (
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => onUpdate(o.id)}
                          loading={updateMut.isPending}
                        >
                          Save
                        </Button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => startEdit(o)}>
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteMut.mutate(o.id)}
                          disabled={deleteMut.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <p className="text-xs text-muted-foreground">
          Overrides replace the base markup for specific products. Modifiers still apply on top.
        </p>
      </CardContent>
    </Card>
  );
}
