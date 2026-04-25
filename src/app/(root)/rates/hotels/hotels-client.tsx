"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search, ChevronUp, ChevronDown, Eye, MoreVertical } from "lucide-react";
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
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertModal } from "@/components/ui/alert-modal";
import { DataTableSkeleton } from "@/components/ui/table/data-table-skeleton";
import { useCountryOptions, useCityOptions } from "@/hooks/use-country-city-options";
import { listHotels, deleteHotel, ListHotelsParams } from "@/data-access/dmc-hotels";
import { DmcHotel } from "@/types/hotels";
import { CURRENCY_OPTIONS_LABEL } from "@/constants/data";
import { HOTEL_COLUMNS, HotelSortKey } from "./columns";
import { HotelOverlay } from "./hotel-overlay";

const PAGE_SIZE = 25;

export default function HotelsClient() {
  const qc = useQueryClient();

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [countryId, setCountryId] = useState<string | undefined>(undefined);
  const [cityId, setCityId] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [preferredFilter, setPreferredFilter] = useState<"all" | "yes" | "no">("all");
  const [sort, setSort] = useState<HotelSortKey>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [deleteTarget, setDeleteTarget] = useState<DmcHotel | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [overlayHotelId, setOverlayHotelId] = useState<string | null>(null);
  const [overlayOpen, setOverlayOpen] = useState(false);

  const openOverlay = (id: string) => {
    setOverlayHotelId(id);
    setOverlayOpen(true);
  };

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const queryParams: ListHotelsParams = {
    page,
    perPage: PAGE_SIZE,
    ...(debouncedSearch ? { name: debouncedSearch } : {}),
    ...(countryId ? { country_id: countryId } : {}),
    ...(cityId ? { city_id: cityId } : {}),
    ...(statusFilter !== "all" ? { status: statusFilter } : {}),
    ...(preferredFilter !== "all" ? { is_preferred: preferredFilter === "yes" } : {}),
    sort,
    sortDir,
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["dmc-hotels", queryParams],
    queryFn: async () => {
      const result = await listHotels(queryParams);
      if (result.error) {
        toast.error(result.error);
        return { data: [] as DmcHotel[], total: 0 };
      }
      return result.data ?? { data: [], total: 0 };
    },
    placeholderData: (prev) => prev,
  });

  const hotels = data?.data ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const { data: countryOptions = [] } = useCountryOptions();
  const { data: cityOptions = [] } = useCityOptions({ countryId });

  const handleSort = (key: HotelSortKey) => {
    if (sort === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSort(key);
      setSortDir("asc");
    }
    setPage(1);
  };

  const handleCountryChange = (v: string) => {
    setCountryId(v === "all" ? undefined : v);
    setCityId(undefined);
    setPage(1);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await deleteHotel(deleteTarget.id);
      if (error) throw new Error(error);
      toast.success(`Deleted "${deleteTarget.name}".`);
      qc.invalidateQueries({ queryKey: ["dmc-hotels"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const SortIcon = ({ col }: { col: HotelSortKey }) =>
    sort === col ? (
      sortDir === "asc" ? (
        <ChevronUp className="h-3 w-3" />
      ) : (
        <ChevronDown className="h-3 w-3" />
      )
    ) : (
      <ChevronUp className="h-3 w-3 opacity-20" />
    );

  if (isLoading) return <DataTableSkeleton columnCount={HOTEL_COLUMNS.length} rowCount={10} />;

  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-64">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search hotels..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-8 h-9"
          />
        </div>

        <Select value={countryId ?? "all"} onValueChange={handleCountryChange}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Country" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All countries</SelectItem>
            {countryOptions.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={cityId ?? "all"}
          onValueChange={(v) => {
            setCityId(v === "all" ? undefined : v);
            setPage(1);
          }}
          disabled={!countryId}
        >
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="City" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All cities</SelectItem>
            {cityOptions.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v as "all" | "active" | "inactive");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={preferredFilter}
          onValueChange={(v) => {
            setPreferredFilter(v as "all" | "yes" | "no");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[130px] h-9">
            <SelectValue placeholder="Preferred" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="yes">Preferred</SelectItem>
            <SelectItem value="no">Not preferred</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto">
          <Button size="sm" onClick={() => console.log("open create hotel overlay")}>
            <Plus className="h-4 w-4" />
            Add New
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className={`rounded-md border${isFetching && !isLoading ? " opacity-70" : ""}`}>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {HOTEL_COLUMNS.map((col) => (
                <TableHead
                  key={col.key}
                  className={`${col.className ?? ""}${col.sortKey ? " cursor-pointer select-none" : ""}`}
                  onClick={col.sortKey ? () => handleSort(col.sortKey!) : undefined}
                >
                  {col.sortKey ? (
                    <span className="flex items-center gap-1">
                      {col.label}
                      <SortIcon col={col.sortKey} />
                    </span>
                  ) : (
                    col.label
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {hotels.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={HOTEL_COLUMNS.length}
                  className="h-32 text-center text-muted-foreground"
                >
                  No hotels found.
                </TableCell>
              </TableRow>
            ) : (
              hotels.map((hotel) => (
                <TableRow
                  key={hotel.id}
                  className="cursor-pointer hover:bg-muted/40"
                  onClick={() => openOverlay(hotel.id)}
                >
                  <TableCell className="font-medium">{hotel.name}</TableCell>
                  <TableCell>{hotel.country_name || "—"}</TableCell>
                  <TableCell>{hotel.city_name || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {CURRENCY_OPTIONS_LABEL(hotel.currency)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {hotel.star_rating ? "★".repeat(hotel.star_rating) : "—"}
                  </TableCell>
                  <TableCell>
                    {hotel.is_preferred ? (
                      <Badge>Preferred</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={hotel.status === "active" ? "default" : "secondary"}>
                      {hotel.status === "active" ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>{hotel.contract_count}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => openOverlay(hotel.id)}
                      >
                        <span className="sr-only">View</span>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => openOverlay(hotel.id)}
                          >
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openOverlay(hotel.id)}
                          >
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleteTarget(hotel)}
                            className="text-destructive focus:text-destructive"
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>
          {total} hotel{total === 1 ? "" : "s"}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span>
            Page {page} of {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pageCount}
            onClick={() => setPage(page + 1)}
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
        title="Delete Hotel?"
        description={
          deleteTarget
            ? `This will permanently delete "${deleteTarget.name}" and all its contracts. This cannot be undone.`
            : ""
        }
      />

      <HotelOverlay
        hotelId={overlayHotelId}
        isOpen={overlayOpen}
        onClose={() => {
          setOverlayOpen(false);
          setOverlayHotelId(null);
        }}
      />
    </div>
  );
}
