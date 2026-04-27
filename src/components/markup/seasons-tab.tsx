"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Pencil, Plus, Trash2 } from "lucide-react";
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
  useCreateSeason,
  useDeleteSeason,
  useSeasons,
  useUpdateSeason,
} from "@/hooks/markup/use-seasons";
import type { Season } from "@/types/markup";

type EditState = { mode: "new" } | { mode: "edit"; row: Season };

function fmt(iso: string): string {
  try {
    return format(parseISO(iso), "MMM d, yyyy");
  } catch {
    return iso;
  }
}

export function SeasonsTab() {
  const { data: seasons = [], isLoading } = useSeasons();
  const [editing, setEditing] = useState<EditState | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Season | null>(null);
  const deleteMut = useDeleteSeason();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Define date ranges (e.g., Peak, Off-season) for season-based markup.
        </p>
        <Button size="sm" onClick={() => setEditing({ mode: "new" })}>
          <Plus className="h-4 w-4" /> Add season
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-32" />
      ) : seasons.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No seasons yet. Click &quot;Add season&quot; to create one.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Date range</TableHead>
              <TableHead className="w-32 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {seasons.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell className="text-sm">
                  {fmt(s.date_from)} – {fmt(s.date_to)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditing({ mode: "edit", row: s })}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(s)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {editing && <SeasonFormDialog state={editing} onClose={() => setEditing(null)} />}

      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete season?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will remove the modifier rows referencing this season across all configs. Continue?
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

function SeasonFormDialog({ state, onClose }: { state: EditState; onClose: () => void }) {
  const isEdit = state.mode === "edit";
  const [name, setName] = useState(isEdit ? state.row.name : "");
  const [from, setFrom] = useState(isEdit ? state.row.date_from : "");
  const [to, setTo] = useState(isEdit ? state.row.date_to : "");
  const create = useCreateSeason();
  const update = useUpdateSeason();
  const pending = isEdit ? update.isPending : create.isPending;

  const valid = name.trim() && from && to && from <= to;

  const onSubmit = async () => {
    if (!valid) return;
    if (isEdit) {
      await update.mutateAsync({
        id: state.row.id,
        input: { name: name.trim(), date_from: from, date_to: to },
      });
    } else {
      await create.mutateAsync({ name: name.trim(), date_from: from, date_to: to });
    }
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit season" : "Add season"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="season-name">Name</Label>
            <Input
              id="season-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Peak 2026"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="season-from">From</Label>
              <Input
                id="season-from"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="season-to">To</Label>
              <Input
                id="season-to"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
          </div>
          {from && to && from > to && (
            <p className="text-xs text-destructive">From date must be before To date.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={!valid || pending} loading={pending}>
            {isEdit ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
