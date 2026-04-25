"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Sparkles,
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
  listTransfers,
  listTransferCountries,
  listTransferCurrencies,
} from "@/data-access/transfers-api";
import {
  TransferListRow,
  TransferCountryOption,
  TransferCurrencyOption,
} from "@/types/transfers";
import TransferFullscreenForm from "@/components/forms/transfer-create-wizard";

const MODE_LABELS: Record<string, string> = {
  vehicle_p2p: "Vehicle (P2P)",
  vehicle_disposal: "Vehicle on Disposal",
};

export default function TransfersClient() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<TransferListRow | null>(null);

  const { data: transfers = [], isLoading } = useQuery({
    queryKey: ["transfers"],
    queryFn: async () => {
      const result = await listTransfers();
      if (result.error) {
        toast.error(result.error);
        return [] as TransferListRow[];
      }
      return result.data ?? [];
    },
  });

  const { data: countries = [] } = useQuery({
    queryKey: ["transfers", "countries"],
    queryFn: async () => {
      const result = await listTransferCountries();
      if (result.error) {
        toast.error(`Couldn't load countries: ${result.error}`);
        return [] as TransferCountryOption[];
      }
      return result.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: currencies = [] } = useQuery({
    queryKey: ["transfers", "currencies"],
    queryFn: async () => {
      const result = await listTransferCurrencies();
      if (result.error) {
        toast.error(`Couldn't load currencies: ${result.error}`);
        return [] as TransferCurrencyOption[];
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
    if (!q) return transfers;
    return transfers.filter((t) => t.name.toLowerCase().includes(q));
  }, [transfers, search]);

  if (isLoading) return <DataTableSkeleton columnCount={7} rowCount={10} />;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-64">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search transfers..."
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
          <Button
            size="sm"
            className="bg-blue-600 text-white hover:bg-blue-700"
            onClick={() => router.push("/tt-parser")}
          >
            <Sparkles className="h-4 w-4" />
            Add Using AI
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[280px]">Transfer Name</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Currency</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Preferred</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  {search
                    ? "No transfers match your search."
                    : 'No transfers yet. Click "Add New" to get started.'}
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
                  <TableCell className="text-muted-foreground">
                    {t.mode_of_transport
                      ? MODE_LABELS[t.mode_of_transport] ?? t.mode_of_transport
                      : "—"}
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
        {filtered.length} transfer{filtered.length === 1 ? "" : "s"}
      </div>

      <TransferFullscreenForm
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        initialData={null}
        countries={countries}
        currencies={currencies}
      />

      {editingRow && (
        <TransferFullscreenForm
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
