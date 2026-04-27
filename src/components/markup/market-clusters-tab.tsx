"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useCreateMarketCluster,
  useDeleteMarketCluster,
  useMarketClusters,
  useUpdateMarketCluster,
} from "@/hooks/markup/use-market-clusters";
import type { MarketCluster } from "@/types/markup";
import { CountryMultiSelect } from "./country-multi-select";

type EditState = { mode: "new" } | { mode: "edit"; row: MarketCluster };

export function MarketClustersTab() {
  const { data: clusters = [], isLoading } = useMarketClusters();
  const [editing, setEditing] = useState<EditState | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<MarketCluster | null>(null);
  const deleteMut = useDeleteMarketCluster();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Group countries into market clusters for region-based markup.
        </p>
        <Button size="sm" onClick={() => setEditing({ mode: "new" })}>
          <Plus className="h-4 w-4" /> Add cluster
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-32" />
      ) : clusters.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No market clusters yet. Click &quot;Add cluster&quot; to create one.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Countries</TableHead>
              <TableHead className="w-32 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clusters.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {c.country_codes.slice(0, 6).map((code) => (
                      <Badge key={code} variant="outline" className="text-xs">
                        {code}
                      </Badge>
                    ))}
                    {c.country_codes.length > 6 && (
                      <Badge variant="outline" className="text-xs">
                        +{c.country_codes.length - 6}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditing({ mode: "edit", row: c })}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(c)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {editing && (
        <ClusterFormDialog
          state={editing}
          onClose={() => setEditing(null)}
        />
      )}

      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete market cluster?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will remove the modifier rows referencing this cluster across all configs. Continue?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              loading={deleteMut.isPending}
              onClick={async () => {
                if (!confirmDelete) return;
                await deleteMut.mutateAsync(confirmDelete.id);
                setConfirmDelete(null);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ClusterFormDialog({ state, onClose }: { state: EditState; onClose: () => void }) {
  const [name, setName] = useState(state.mode === "edit" ? state.row.name : "");
  const [codes, setCodes] = useState<string[]>(
    state.mode === "edit" ? state.row.country_codes : [],
  );
  const create = useCreateMarketCluster();
  const update = useUpdateMarketCluster();
  const isEdit = state.mode === "edit";
  const pending = isEdit ? update.isPending : create.isPending;

  const onSubmit = async () => {
    if (!name.trim() || codes.length === 0) return;
    if (isEdit) {
      await update.mutateAsync({
        id: state.row.id,
        input: { name: name.trim(), country_codes: codes },
      });
    } else {
      await create.mutateAsync({ name: name.trim(), country_codes: codes });
    }
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit cluster" : "Add market cluster"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cluster-name">Name</Label>
            <Input
              id="cluster-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Europe"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Countries</Label>
            <CountryMultiSelect value={codes} onChange={setCodes} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={!name.trim() || codes.length === 0 || pending}
            loading={pending}
          >
            {isEdit ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
