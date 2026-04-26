"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Star,
  MoreHorizontal,
  ChevronRight,
} from "lucide-react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTableSkeleton } from "@/components/ui/table/data-table-skeleton";
import {
  listTours,
  listTourCountries,
  listTourCurrencies,
} from "@/data-access/tours-api";
import {
  TourListRow,
  TourCountryOption,
  TourCurrencyOption,
} from "@/types/tours";
import TourCreateWizard from "@/components/forms/tour-create-wizard";

export default function ToursClient() {
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<TourListRow | null>(null);

  const { data: tours = [], isLoading } = useQuery({
    queryKey: ["tours"],
    queryFn: async () => {
      const result = await listTours();
      if (result.error) {
        toast.error(result.error);
        return [] as TourListRow[];
      }
      return result.data ?? [];
    },
  });

  const { data: countries = [] } = useQuery({
    queryKey: ["tours", "countries"],
    queryFn: async () => {
      const result = await listTourCountries();
      if (result.error) {
        toast.error(`Couldn't load countries: ${result.error}`);
        return [] as TourCountryOption[];
      }
      return result.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: currencies = [] } = useQuery({
    queryKey: ["tours", "currencies"],
    queryFn: async () => {
      const result = await listTourCurrencies();
      if (result.error) {
        toast.error(`Couldn't load currencies: ${result.error}`);
        return [] as TourCurrencyOption[];
      }
      return result.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const countryName = useMemo(() => {
    const m = new Map<string, string>();
    countries.forEach((c) => m.set(c.id, c.country_name));
    return m;
  }, [countries]);

  const currencyCode = useMemo(() => {
    const m = new Map<string, string>();
    currencies.forEach((c) => m.set(c.id, c.code));
    return m;
  }, [currencies]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tours;
    return tours.filter((t) => t.name.toLowerCase().includes(q));
  }, [tours, search]);

  if (isLoading) return <DataTableSkeleton columnCount={6} rowCount={10} />;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-64">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tours..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Add New
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[280px]">Tour Name</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Currency</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Preferred</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  {search
                    ? "No tours match your search."
                    : 'No tours yet. Click "Add New" to get started.'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((t) => (
                <TableRow
                  key={t.id}
                  className="cursor-pointer hover:bg-muted/40"
                  onClick={() => setEditingRow(t)}
                >
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {t.country_id ? countryName.get(t.country_id) ?? "—" : "—"}
                  </TableCell>
                  <TableCell>
                    {t.currency_id ? (
                      <Badge variant="outline" className="font-mono text-xs">
                        {currencyCode.get(t.currency_id) ?? "—"}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        t.status === "active" || t.status === "published"
                          ? "default"
                          : "secondary"
                      }
                      className="text-xs"
                    >
                      {t.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {t.is_preferred ? (
                      <Star className="mx-auto h-4 w-4 fill-amber-400 text-amber-400" />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingRow(t)}>
                          <ChevronRight className="mr-2 h-4 w-4" />
                          Open
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

      <div className="text-sm text-muted-foreground">
        {filtered.length} tour{filtered.length === 1 ? "" : "s"}
      </div>

      <TourCreateWizard
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        initialData={null}
        countries={countries}
        currencies={currencies}
      />

      {editingRow && (
        <TourCreateWizard
          isOpen={!!editingRow}
          onClose={() => setEditingRow(null)}
          initialData={editingRow}
          countries={countries}
          currencies={currencies}
        />
      )}
    </div>
  );
}
