"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  MoreHorizontal,
  Search,
  ChevronUp,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ParserSessionsList } from "@/components/rates/fixed-departures/parser/parser-sessions-list";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  fdListPackages,
  fdGetCountries,
  fdDeletePackage,
} from "@/data-access/fixed-departures";
import type { FDPackageListRow } from "@/types/fixed-departures";
import { FDFullscreenForm } from "@/components/forms/fd-fullscreen-form";
import { DataTableSkeleton } from "@/components/ui/table/data-table-skeleton";

const PAGE_SIZE = 25;

export function FDList() {
  const qc = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [nameSort, setNameSort] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedPackageId, setExpandedPackageId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FDPackageListRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Handoff from the FD parser save flow: /rates/fixed-departures?edit=<id>
  // auto-opens the edit overlay for that package. We strip ?edit= from the
  // URL with router.replace so refreshing doesn't re-open the overlay.
  useEffect(() => {
    const editId = searchParams.get("edit");
    if (!editId) return;
    setEditingId(editId);
    setOverlayOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete("edit");
    const qs = next.toString();
    router.replace(qs ? `/rates/fixed-departures?${qs}` : "/rates/fixed-departures", {
      scroll: false,
    });
  }, [searchParams, router]);

  const { data: packages = [], isLoading } = useQuery({
    queryKey: ["fd-packages"],
    queryFn: fdListPackages,
  });

  const { data: countries = [] } = useQuery({
    queryKey: ["fd-meta-countries"],
    queryFn: fdGetCountries,
  });

  const cityOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of packages) for (const c of p.city_names ?? []) set.add(c);
    return Array.from(set).sort();
  }, [packages]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (packages as FDPackageListRow[])
      .filter((p) => {
        if (q && !p.name.toLowerCase().includes(q)) return false;
        if (countryFilter !== "all" && !(p.country_names ?? []).includes(countryFilter)) return false;
        if (cityFilter !== "all" && !(p.city_names ?? []).includes(cityFilter)) return false;
        if (statusFilter !== "all" && p.status !== statusFilter) return false;
        return true;
      })
      .sort((a, b) => {
        const cmp = a.name.localeCompare(b.name);
        return nameSort === "asc" ? cmp : -cmp;
      });
  }, [packages, search, countryFilter, cityFilter, statusFilter, nameSort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const allPageSelected = pageRows.length > 0 && pageRows.every((r) => selectedIds.has(r.id));
  const somePageSelected = pageRows.some((r) => selectedIds.has(r.id)) && !allPageSelected;
  const selectedPackages = (packages as FDPackageListRow[]).filter((p) => selectedIds.has(p.id));

  const openCreate = () => {
    setEditingId(null);
    setOverlayOpen(true);
  };
  const openEdit = (id: string) => {
    setEditingId(id);
    setOverlayOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fdDeletePackage(deleteTarget.id);
      toast.success("Package deactivated");
      qc.invalidateQueries({ queryKey: ["fd-packages"] });
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
      if (checked) pageRows.forEach((r) => next.add(r.id));
      else pageRows.forEach((r) => next.delete(r.id));
      return next;
    });
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      const results = await Promise.allSettled(
        selectedPackages.map((p) => fdDeletePackage(p.id))
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed > 0) throw new Error(`Failed to deactivate ${failed} package(s)`);
      toast.success(`Deactivated ${selectedPackages.length} package${selectedPackages.length === 1 ? "" : "s"}`);
      setSelectedIds(new Set());
      qc.invalidateQueries({ queryKey: ["fd-packages"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Bulk deactivate failed");
    } finally {
      setBulkDeleting(false);
      setShowBulkDeleteDialog(false);
    }
  };

  if (isLoading) return <DataTableSkeleton columnCount={8} rowCount={10} />;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {selectedIds.size > 0 ? (
          <>
            <span className="text-sm text-muted-foreground">
              {selectedIds.size} package{selectedIds.size !== 1 ? "s" : ""} selected
            </span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowBulkDeleteDialog(true)}
              disabled={bulkDeleting}
            >
              Deactivate Selected
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
                placeholder="Search packages..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-8 h-9"
              />
            </div>

            <Select value={countryFilter} onValueChange={(v) => { setCountryFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All countries</SelectItem>
                {countries.map((c) => (
                  <SelectItem key={c.id} value={c.country_name}>{c.country_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={cityFilter} onValueChange={(v) => { setCityFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="City" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All cities</SelectItem>
                {cityOptions.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <div className="ml-auto flex items-center gap-2">
              <Button asChild size="sm" variant="outline">
                <Link href="/rates/fixed-departures/parser">
                  <Sparkles className="h-4 w-4" />
                  Add Using AI
                </Link>
              </Button>
              <Button onClick={openCreate} size="sm">
                <Plus className="h-4 w-4" />
                New Package
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
                  Package Name
                  {nameSort === "asc" ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </span>
              </TableHead>
              <TableHead>Countries</TableHead>
              <TableHead>Cities</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Next Departure</TableHead>
              <TableHead>Departures</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                  No packages found.
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((pkg) => {
                const isExpanded = expandedPackageId === pkg.id;
                return (
                  <Fragment key={pkg.id}>
                    <TableRow
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => openEdit(pkg.id)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(pkg.id)}
                          onCheckedChange={() => toggleSelect(pkg.id)}
                          aria-label="Select row"
                        />
                      </TableCell>
                      <TableCell className="font-medium">{pkg.name}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {(pkg.country_names ?? []).join(", ") || "—"}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {(pkg.city_names ?? []).join(", ") || "—"}
                      </TableCell>
                      <TableCell>{pkg.duration_nights ? `${pkg.duration_nights} nights` : "—"}</TableCell>
                      <TableCell>{pkg.next_departure ?? "—"}</TableCell>
                      <TableCell>{pkg.departure_count ?? 0}</TableCell>
                      <TableCell>
                        <Badge variant={pkg.status === "active" ? "default" : "secondary"}>
                          {pkg.status ?? "—"}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className="w-[100px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 ${isExpanded ? "bg-blue-100 text-blue-700" : ""}`}
                            onClick={() =>
                              setExpandedPackageId((curr) =>
                                curr === pkg.id ? null : pkg.id,
                              )
                            }
                            aria-label="View AI parse sessions"
                            title="View AI parse sessions"
                          >
                            <Sparkles className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(pkg.id)}>Edit</DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setDeleteTarget(pkg)}
                                className="text-destructive"
                              >
                                Deactivate
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow className="bg-blue-50/50 hover:bg-blue-50/50">
                        <TableCell colSpan={9} className="p-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              <Sparkles className="h-3.5 w-3.5 text-primary" />
                              AI Parse Sessions
                            </div>
                            <ParserSessionsList
                              packageId={pkg.id}
                              limit={50}
                              emptyMessage="No parse sessions for this package."
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>
          {filtered.length} package{filtered.length === 1 ? "" : "s"}
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
        title="Deactivate package?"
        description={`"${deleteTarget?.name ?? ""}" will be marked inactive. This is reversible.`}
      />

      <Dialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm bulk deactivate</DialogTitle>
            <DialogDescription>
              Deactivate {selectedPackages.length} package{selectedPackages.length === 1 ? "" : "s"}? This is reversible.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-60 overflow-y-auto">
            <ul className="space-y-1">
              {selectedPackages.map((p) => (
                <li key={p.id} className="text-sm text-muted-foreground">
                  • {p.name}
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
                ? "Deactivating..."
                : `Deactivate ${selectedPackages.length} package${selectedPackages.length === 1 ? "" : "s"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FDFullscreenForm
        open={overlayOpen}
        onOpenChange={(o) => {
          setOverlayOpen(o);
          if (!o) setEditingId(null);
        }}
        packageId={editingId}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["fd-packages"] });
        }}
      />
    </div>
  );
}
