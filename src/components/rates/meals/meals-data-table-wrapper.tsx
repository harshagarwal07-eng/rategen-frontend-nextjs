"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, MoreHorizontal, Search, ChevronUp, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertModal } from "@/components/ui/alert-modal";
import { listMeals, getMealById, deleteMeal } from "@/data-access/meals";
import { MealProduct } from "@/types/meals";
import { CURRENCY_OPTIONS_LABEL } from "@/constants/data";
import { DataTableSkeleton } from "@/components/ui/table/data-table-skeleton";
import MealFullscreenForm from "@/components/forms/meal-fullscreen-form";

const PAGE_SIZE = 25;

export function MealsDataTableWrapper() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [nameSort, setNameSort] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [editingData, setEditingData] = useState<MealProduct | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MealProduct | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [newFormOpen, setNewFormOpen] = useState(false);

  const { data: meals = [], isLoading } = useQuery({
    queryKey: ["meals"],
    queryFn: async () => {
      const result = await listMeals();
      if (result.error) {
        toast.error(result.error);
        return [] as MealProduct[];
      }
      return result.data ?? [];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (meals as MealProduct[])
      .filter((m) => {
        if (q && !m.name.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => {
        const cmp = a.name.localeCompare(b.name);
        return nameSort === "asc" ? cmp : -cmp;
      });
  }, [meals, search, nameSort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const allPageSelected = pageRows.length > 0 && pageRows.every((r) => selectedIds.has(r.id!));
  const somePageSelected = pageRows.some((r) => selectedIds.has(r.id!)) && !allPageSelected;
  const selectedMeals = (meals as MealProduct[]).filter((m) => selectedIds.has(m.id!));

  const openEdit = async (id: string) => {
    setLoadingId(id);
    try {
      const result = await getMealById(id);
      if (result.error) {
        toast.error("Failed to load meal details");
        return;
      }
      setEditingData(result.data!);
      setOverlayOpen(true);
    } catch {
      toast.error("Failed to load meal details");
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await deleteMeal(deleteTarget.id!);
      if (error) throw new Error(error);
      toast.success("Meal deleted.");
      qc.invalidateQueries({ queryKey: ["meals"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) pageRows.forEach((r) => next.add(r.id!));
      else pageRows.forEach((r) => next.delete(r.id!));
      return next;
    });
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      const results = await Promise.all(selectedMeals.map((m) => deleteMeal(m.id!)));
      const errors = results.filter((r) => r.error);
      if (errors.length > 0) throw new Error(`Failed to delete ${errors.length} meal(s)`);
      toast.success(`Deleted ${selectedMeals.length} meal(s)`);
      setSelectedIds(new Set());
      qc.invalidateQueries({ queryKey: ["meals"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete meals");
    } finally {
      setBulkDeleting(false);
      setShowBulkDeleteDialog(false);
    }
  };

  if (isLoading) return <DataTableSkeleton columnCount={6} rowCount={10} />;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {selectedIds.size > 0 ? (
          <>
            <span className="text-sm text-muted-foreground">
              {selectedIds.size} meal{selectedIds.size !== 1 ? "s" : ""} selected
            </span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowBulkDeleteDialog(true)}
              disabled={bulkDeleting}
            >
              Delete Selected
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
              disabled={bulkDeleting}
            >
              Cancel
            </Button>
          </>
        ) : (
          <>
            <div className="relative w-64">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search meals..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-8 h-9"
              />
            </div>
            <div className="ml-auto">
              <Button onClick={() => setNewFormOpen(true)} size="sm">
                <Plus className="h-4 w-4" />
                New Meal
              </Button>
            </div>
          </>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={allPageSelected || (somePageSelected ? "indeterminate" : false)}
                  onCheckedChange={(v) => toggleSelectAll(!!v)}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => setNameSort((s) => (s === "asc" ? "desc" : "asc"))}
              >
                <span className="flex items-center gap-1">
                  Name
                  {nameSort === "asc" ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </span>
              </TableHead>
              <TableHead>Country</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Currency</TableHead>
              <TableHead>Packages</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  No meals found.
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((meal) => (
                <TableRow
                  key={meal.id}
                  className={`cursor-pointer hover:bg-muted/40${loadingId === meal.id ? " opacity-60" : ""}`}
                  onClick={() => openEdit(meal.id!)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(meal.id!)}
                      onCheckedChange={() => toggleSelect(meal.id!)}
                      aria-label="Select row"
                    />
                  </TableCell>
                  <TableCell className="font-medium">{meal.name}</TableCell>
                  <TableCell>{meal.country?.country_name || "—"}</TableCell>
                  <TableCell>{meal.location?.city_name || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {CURRENCY_OPTIONS_LABEL(meal.currency)}
                    </Badge>
                  </TableCell>
                  <TableCell>{meal.package_count ?? 0}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(meal.id!)}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteTarget(meal)}
                          className="text-destructive"
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>
          {filtered.length} meal{filtered.length === 1 ? "" : "s"}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={safePage <= 1}
            onClick={() => setPage(safePage - 1)}
          >
            Previous
          </Button>
          <span>
            Page {safePage} of {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={safePage >= pageCount}
            onClick={() => setPage(safePage + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      <AlertModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
      />

      <Dialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Bulk Delete</DialogTitle>
            <DialogDescription>
              Delete {selectedMeals.length} meal{selectedMeals.length !== 1 ? "s" : ""}? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-60 overflow-y-auto">
            <ul className="space-y-1">
              {selectedMeals.map((m) => (
                <li key={m.id} className="text-sm text-muted-foreground">
                  • {m.name}
                </li>
              ))}
            </ul>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBulkDeleteDialog(false)}
              disabled={bulkDeleting}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={bulkDeleting}>
              {bulkDeleting
                ? "Deleting..."
                : `Delete ${selectedMeals.length} Meal${selectedMeals.length !== 1 ? "s" : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MealFullscreenForm
        isOpen={overlayOpen}
        onClose={() => {
          setOverlayOpen(false);
          setEditingData(null);
        }}
        initialData={editingData}
        onSuccess={() => {
          setOverlayOpen(false);
          setEditingData(null);
          qc.invalidateQueries({ queryKey: ["meals"] });
        }}
      />
      <MealFullscreenForm
        isOpen={newFormOpen}
        onClose={() => setNewFormOpen(false)}
        initialData={null}
        onSuccess={() => {
          setNewFormOpen(false);
          qc.invalidateQueries({ queryKey: ["meals"] });
        }}
      />
    </div>
  );
}
