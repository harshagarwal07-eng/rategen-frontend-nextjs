"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, MoreHorizontal, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

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
    return (packages as FDPackageListRow[]).filter((p) => {
      if (q && !p.name.toLowerCase().includes(q)) return false;
      if (countryFilter !== "all" && !(p.country_names ?? []).includes(countryFilter)) return false;
      if (cityFilter !== "all" && !(p.city_names ?? []).includes(cityFilter)) return false;
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      return true;
    });
  }, [packages, search, countryFilter, cityFilter, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const openCreate = () => {
    setEditingId(null);
    setOverlayOpen(true);
  };
  const openEdit = (id: string) => {
    setEditingId(id);
    setOverlayOpen(true);
  };
  const handleDelete = async (id: string) => {
    try {
      await fdDeletePackage(id);
      toast.success("Package deactivated");
      qc.invalidateQueries({ queryKey: ["fd-packages"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  if (isLoading) return <DataTableSkeleton columnCount={7} rowCount={10} />;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center gap-2">
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

        <div className="ml-auto">
          <Button onClick={openCreate} size="sm">
            <Plus className="h-4 w-4" />
            Add New
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Package Name</TableHead>
              <TableHead>Countries</TableHead>
              <TableHead>Cities</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Next Departure</TableHead>
              <TableHead>Departures</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  No packages found.
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((pkg) => (
                <TableRow
                  key={pkg.id}
                  className="cursor-pointer hover:bg-muted/40"
                  onClick={() => openEdit(pkg.id)}
                >
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
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(pkg.id)}>Edit</DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(pkg.id)}
                          className="text-destructive"
                        >
                          Deactivate
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
