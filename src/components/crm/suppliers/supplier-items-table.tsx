"use client";

import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, EyeIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getSupplierItems, deleteSupplierItem } from "@/data-access/suppliers";
import { getServiceTypeConfig } from "@/lib/status-styles-config";
import { AlertModal } from "@/components/ui/alert-modal";
import type { ItemTypes, ISupplierTeamMemberData } from "@/types/suppliers";

const TABS: { key: ItemTypes; label: string }[] = [
  { key: "hotel", label: "Hotels" },
  { key: "tour", label: "Tours" },
  { key: "transfer", label: "Transfers" },
  { key: "meal", label: "Meals" },
  { key: "guide", label: "Guides" },
];

// ──────────────────────────────────────────────
// Grouped row — one row per unique parent service
// ──────────────────────────────────────────────
interface GroupedRow {
  key: string;
  item_type: ItemTypes;
  service_name: string;
  ids: string[];
  packages: { id: string; name: string }[];
  poc_ids: string[];
  primary_poc_id: string | null;
  created_at: string;
  updated_at: string;
}

function groupItems(items: any[]): GroupedRow[] {
  const map = new Map<string, GroupedRow>();

  items.forEach((item: any) => {
    let key: string;
    if (item.item_type === "tour") {
      key = `tour-${item.tour_id}`;
    } else if (item.item_type === "transfer") {
      key = `transfer-${item.transfer_id}`;
    } else {
      key = `${item.item_type}-${item.id}`;
    }

    const itemPocIds: string[] = item.pocs || [];
    const itemPrimaryPoc: string | null = item.primary_poc || null;

    const existing = map.get(key);
    if (existing) {
      existing.ids.push(item.id);
      if (item.package_name) existing.packages.push({ id: item.id, name: item.package_name });
      itemPocIds.forEach((id: string) => {
        if (!existing.poc_ids.includes(id)) existing.poc_ids.push(id);
      });
      if (!existing.primary_poc_id && itemPrimaryPoc) existing.primary_poc_id = itemPrimaryPoc;
      if (item.created_at < existing.created_at) existing.created_at = item.created_at;
      if (item.updated_at > existing.updated_at) existing.updated_at = item.updated_at;
    } else {
      map.set(key, {
        key,
        item_type: item.item_type,
        service_name: item.service_name || item.item_type,
        ids: [item.id],
        packages: item.package_name ? [{ id: item.id, name: item.package_name }] : [],
        poc_ids: itemPocIds,
        primary_poc_id: itemPrimaryPoc,
        created_at: item.created_at,
        updated_at: item.updated_at,
      });
    }
  });

  return Array.from(map.values());
}

interface SupplierItemsTableProps {
  supplierId: string;
  teamMembers?: ISupplierTeamMemberData[];
  readOnly?: boolean;
}

export default function SupplierItemsTable({
  supplierId,
  teamMembers = [],
  readOnly = false,
}: SupplierItemsTableProps) {
  const memberMap = useMemo(() => {
    const m = new Map<string, ISupplierTeamMemberData>();
    teamMembers.forEach((tm) => {
      if (tm.id) m.set(tm.id, tm);
    });
    return m;
  }, [teamMembers]);

  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ItemTypes>("hotel");
  const [deleteIds, setDeleteIds] = useState<string[] | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetches only the active tab's type — re-fires when activeTab changes
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["supplier-items", supplierId, activeTab],
    queryFn: () => getSupplierItems(supplierId, activeTab),
    enabled: !!supplierId,
    select: (res) => res.data,
  });

  // ── delete handler ──
  const handleDelete = async () => {
    if (!deleteIds) return;
    setIsDeleting(true);
    try {
      for (const id of deleteIds) {
        const result = await deleteSupplierItem(supplierId, id);
        if (result.error) {
          toast.error(result.error);
          return;
        }
      }
      toast.success("Product removed successfully");
      queryClient.invalidateQueries({ queryKey: ["supplier-items", supplierId] });
    } finally {
      setIsDeleting(false);
      setDeleteIds(null);
    }
  };

  const grouped = groupItems(items);

  return (
    <div className="space-y-3">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ItemTypes)}>
        <TabsList className="bg-transparent p-0 gap-2 my-2">
          {TABS.map((tab) => (
            <TabsTrigger
              key={tab.key}
              value={tab.key}
              className={cn(
                "h-9 rounded-md px-2.5 py-1.5 gap-0.5 min-w-20",
                "data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none",
                "text-muted-foreground hover:text-foreground hover:bg-muted font-normal"
              )}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-0">
          {isLoading ? (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="min-w-[200px]">Service Name</TableHead>
                    <TableHead className="w-28">Type</TableHead>
                    <TableHead className="min-w-[180px]">Packages</TableHead>
                    <TableHead className="w-40">Point of Contact</TableHead>
                    <TableHead className="w-32">Created At</TableHead>
                    <TableHead className="w-32">Updated At</TableHead>
                    {!readOnly && <TableHead className="w-10" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-40" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-7 rounded" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-28" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      {!readOnly && <TableCell />}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : grouped.length === 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="min-w-[200px]">Service Name</TableHead>
                    <TableHead className="w-28">Type</TableHead>
                    <TableHead className="min-w-[180px]">Packages</TableHead>
                    <TableHead className="w-40">Point of Contact</TableHead>
                    <TableHead className="w-32">Created At</TableHead>
                    <TableHead className="w-32">Updated At</TableHead>
                    {!readOnly && <TableHead className="w-10" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={readOnly ? 6 : 7} className="text-center py-12">
                      <p className="text-muted-foreground">No {activeTab}s added yet</p>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="min-w-[200px]">Service Name</TableHead>
                    <TableHead className="w-28">Type</TableHead>
                    <TableHead className="w-32">Packages</TableHead>
                    <TableHead className="w-40">Point of Contact</TableHead>
                    <TableHead className="w-32">Created At</TableHead>
                    <TableHead className="w-32">Updated At</TableHead>
                    {!readOnly && <TableHead className="w-10" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grouped.map((row) => {
                    const config = getServiceTypeConfig(row.item_type);
                    const primaryMember = row.primary_poc_id ? memberMap.get(row.primary_poc_id) : undefined;
                    const otherMembers = row.poc_ids
                      .filter((id) => id !== row.primary_poc_id)
                      .map((id) => memberMap.get(id))
                      .filter(Boolean) as ISupplierTeamMemberData[];

                    return (
                      <TableRow key={row.key} className="hover:bg-muted/30">
                        <TableCell>
                          <p className="font-medium text-xs leading-tight">{row.service_name}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={cn("text-[10px] px-1.5", config.color, config.bgColor)}>
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {row.packages.length > 0 ? (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <EyeIcon className="h-3.5 w-3.5" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-64" align="start">
                                <div className="space-y-1.5">
                                  <p className="text-xs font-semibold text-muted-foreground">
                                    Packages ({row.packages.length})
                                  </p>
                                  {row.packages.map((pkg) => (
                                    <div
                                      key={pkg.id}
                                      className="text-xs text-muted-foreground pl-2 border-l-2 border-muted"
                                    >
                                      {pkg.name}
                                    </div>
                                  ))}
                                </div>
                              </PopoverContent>
                            </Popover>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>

                        {/* ── Point of Contact ── */}
                        <TableCell>
                          {primaryMember || otherMembers.length > 0 ? (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <EyeIcon className="h-3.5 w-3.5" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-64" align="start">
                                <div className="space-y-3">
                                  <p className="text-xs font-semibold text-muted-foreground">
                                    Contacts ({row.poc_ids.length})
                                  </p>
                                  <div className="space-y-2">
                                    {[...(primaryMember ? [primaryMember] : []), ...otherMembers].map((m) => (
                                      <div key={m.id} className="border-b pb-2 last:border-0">
                                        <p className="font-medium text-sm flex items-center capitalize">
                                          {m.name}
                                          {m.id === row.primary_poc_id && (
                                            <span className=" ml-2 bg-primary/10 py-0.5 px-1.5 rounded text-primary text-xs">
                                              {" "}
                                              ★{" "}
                                            </span>
                                          )}
                                        </p>
                                        {m.email && <div className="text-xs text-muted-foreground">{m.email}</div>}
                                        {m.phone && <div className="text-xs text-muted-foreground">{m.phone}</div>}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>

                        <TableCell className="text-xs text-muted-foreground">
                          {row.created_at ? format(new Date(row.created_at), "MMM d, yyyy") : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {row.updated_at ? format(new Date(row.updated_at), "MMM d, yyyy") : "—"}
                        </TableCell>
                        {!readOnly && (
                          <TableCell className="p-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => setDeleteIds(row.ids)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          {grouped.length > 0 && (
            <div className="mt-2 text-xs text-muted-foreground">
              Total: {grouped.length} {grouped.length === 1 ? 'item' : 'items'}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {!readOnly && (
        <AlertModal
          isOpen={!!deleteIds}
          onClose={() => setDeleteIds(null)}
          onConfirm={handleDelete}
          loading={isDeleting}
          title="Remove product?"
          description="This product will be removed from this supplier. This action cannot be undone."
        />
      )}
    </div>
  );
}
