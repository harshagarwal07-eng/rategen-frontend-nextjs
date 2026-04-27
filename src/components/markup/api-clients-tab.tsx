"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  useApiClients,
  useCreateApiClient,
  useDeleteApiClient,
  useUpdateApiClient,
} from "@/hooks/markup/use-api-clients";
import type { ApiClient } from "@/types/markup";

type EditState = { mode: "new" } | { mode: "edit"; row: ApiClient };

export function ApiClientsTab() {
  const { data: clients = [], isLoading } = useApiClients();
  const [editing, setEditing] = useState<EditState | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ApiClient | null>(null);
  const deleteMut = useDeleteApiClient();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Identify API consumers (channel = api) for per-client markup.
        </p>
        <Button size="sm" onClick={() => setEditing({ mode: "new" })}>
          <Plus className="h-4 w-4" /> Add API client
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-32" />
      ) : clients.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No API clients yet. Click &quot;Add API client&quot; to create one.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-32 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>
                  <Badge variant={c.is_active ? "default" : "secondary"}>
                    {c.is_active ? "Active" : "Inactive"}
                  </Badge>
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

      {editing && <ClientFormDialog state={editing} onClose={() => setEditing(null)} />}

      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete API client?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will remove the modifier rows referencing this client across all configs. Continue?
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

function ClientFormDialog({ state, onClose }: { state: EditState; onClose: () => void }) {
  const isEdit = state.mode === "edit";
  const [name, setName] = useState(isEdit ? state.row.name : "");
  const [active, setActive] = useState(isEdit ? state.row.is_active : true);
  const create = useCreateApiClient();
  const update = useUpdateApiClient();
  const pending = isEdit ? update.isPending : create.isPending;

  const onSubmit = async () => {
    if (!name.trim()) return;
    if (isEdit) {
      await update.mutateAsync({
        id: state.row.id,
        input: { name: name.trim(), is_active: active },
      });
    } else {
      await create.mutateAsync({ name: name.trim(), is_active: active });
    }
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit API client" : "Add API client"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="client-name">Name</Label>
            <Input
              id="client-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Partner OTA A"
            />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={active} onCheckedChange={(v) => setActive(!!v)} />
            <span>Active</span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={!name.trim() || pending} loading={pending}>
            {isEdit ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
