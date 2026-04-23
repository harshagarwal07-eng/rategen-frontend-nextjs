"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getLibraryItemsBySupplier, deleteLibraryItem } from "@/data-access/docs";
import { getLibraryStatusConfig } from "@/lib/status-styles-config";
import { AlertModal } from "@/components/ui/alert-modal";
import type { LibraryType } from "@/types/docs";

const TABS: { key: LibraryType; label: string }[] = [
  { key: "vehicles", label: "Vehicles" },
  { key: "drivers", label: "Drivers" },
  { key: "guides", label: "Guides" },
  { key: "restaurants", label: "Restaurants" },
];

function VehicleRow({ item, onDelete, readOnly }: { item: any; onDelete: () => void; readOnly: boolean }) {
  const statusConfig = getLibraryStatusConfig(item.status);
  return (
    <TableRow className="hover:bg-muted/30">
      <TableCell>
        <p className="font-medium text-xs">{item.v_number || "-"}</p>
      </TableCell>
      <TableCell>
        <p className="text-xs">{item.brand || "-"}</p>
      </TableCell>
      <TableCell>
        <p className="text-xs capitalize">{item.v_type || "-"}</p>
      </TableCell>
      <TableCell>
        <p className="text-xs capitalize">{item.category || "-"}</p>
      </TableCell>
      <TableCell>
        <p className="text-xs">{item.yr_of_reg || "-"}</p>
      </TableCell>
      <TableCell>
        <p className="text-xs">{item.country_name || "-"}</p>
      </TableCell>
      <TableCell>
        <p className="text-xs">{item.state_name || "-"}</p>
      </TableCell>
      <TableCell>
        <p className="text-xs">{item.city_name || "-"}</p>
      </TableCell>
      <TableCell>
        <Badge variant="secondary" className={cn("text-[10px] px-1.5", statusConfig.color, statusConfig.bgColor)}>
          {statusConfig.label}
        </Badge>
      </TableCell>
      {!readOnly && (
        <TableCell className="p-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </TableCell>
      )}
    </TableRow>
  );
}

function PersonRow({ item, onDelete, readOnly }: { item: any; onDelete: () => void; readOnly: boolean }) {
  const statusConfig = getLibraryStatusConfig(item.status);
  return (
    <TableRow className="hover:bg-muted/30">
      <TableCell>
        <p className="font-medium text-xs">{item.name || "-"}</p>
      </TableCell>
      <TableCell>
        <p className="text-xs">{item.phone || "-"}</p>
      </TableCell>
      <TableCell>
        <p className="text-xs">{item.whatsapp_number || "-"}</p>
      </TableCell>
      <TableCell>
        <p className="text-xs capitalize">{item.gender || "-"}</p>
      </TableCell>
      <TableCell>
        <p className="text-xs">{(item.languages_known || []).length > 0 ? item.languages_known.join(", ") : "-"}</p>
      </TableCell>
      <TableCell>
        <p className="text-xs">{item.country_name || "-"}</p>
      </TableCell>
      <TableCell>
        <p className="text-xs">{item.state_name || "-"}</p>
      </TableCell>
      <TableCell>
        <p className="text-xs">{item.city_name || "-"}</p>
      </TableCell>
      <TableCell>
        <Badge variant="secondary" className={cn("text-[10px] px-1.5", statusConfig.color, statusConfig.bgColor)}>
          {statusConfig.label}
        </Badge>
      </TableCell>
      {!readOnly && (
        <TableCell className="p-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </TableCell>
      )}
    </TableRow>
  );
}

function RestaurantRow({ item, onDelete, readOnly }: { item: any; onDelete: () => void; readOnly: boolean }) {
  const statusConfig = getLibraryStatusConfig(item.status);
  return (
    <TableRow className="hover:bg-muted/30">
      <TableCell>
        <p className="font-medium text-xs">{item.name || "-"}</p>
      </TableCell>
      <TableCell>
        <p className="text-xs">{item.phone || "-"}</p>
      </TableCell>
      <TableCell>
        <p className="text-xs">{item.whatsapp || "-"}</p>
      </TableCell>
      <TableCell>
        <p className="text-xs">{item.poc_name || "-"}</p>
      </TableCell>
      <TableCell>
        <p className="text-xs">{item.country_name || "-"}</p>
      </TableCell>
      <TableCell>
        <p className="text-xs">{item.state_name || "-"}</p>
      </TableCell>
      <TableCell>
        <p className="text-xs">{item.city_name || "-"}</p>
      </TableCell>
      <TableCell>
        <p className="text-xs max-w-[200px] truncate">{item.address || "-"}</p>
      </TableCell>
      <TableCell>
        <Badge variant="secondary" className={cn("text-[10px] px-1.5", statusConfig.color, statusConfig.bgColor)}>
          {statusConfig.label}
        </Badge>
      </TableCell>
      {!readOnly && (
        <TableCell className="p-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </TableCell>
      )}
    </TableRow>
  );
}

const VEHICLE_HEADS = ["Vehicle No.", "Brand", "Type", "Category", "Year", "Country", "State", "City", "Status", ""];
const PERSON_HEADS = ["Name", "Phone", "WhatsApp", "Gender", "Languages", "Country", "State", "City", "Status", ""];
const RESTAURANT_HEADS = ["Name", "Phone", "WhatsApp", "Contact Person", "Country", "State", "City", "Address", "Status", ""];

interface SupplierLibraryItemsTableProps {
  supplierId: string;
  readOnly?: boolean;
}

export default function SupplierLibraryItemsTable({ supplierId, readOnly = false }: SupplierLibraryItemsTableProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<LibraryType>("vehicles");

  // Fetch only the active tab's data — re-fires when activeTab changes
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["supplier-library-items", supplierId, activeTab],
    queryFn: () => getLibraryItemsBySupplier(activeTab, supplierId),
    enabled: !!supplierId,
    select: (res) => res.data,
  });

  // ── delete state ──
  const [deleteTarget, setDeleteTarget] = useState<{ type: LibraryType; id: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const result = await deleteLibraryItem(deleteTarget.type, deleteTarget.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Item removed successfully");
      queryClient.invalidateQueries({ queryKey: ["supplier-library-items", supplierId] });
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  // Determine which table to render based on activeTab
  const renderTable = () => {
    if (activeTab === "vehicles") {
      const heads = readOnly ? VEHICLE_HEADS.slice(0, -1) : VEHICLE_HEADS;
      return (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                {heads.map((h, i) => (
                  <TableHead key={i} className={!readOnly && i === heads.length - 1 ? "w-10" : ""}>
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-12" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </TableCell>
                    {!readOnly && <TableCell />}
                  </TableRow>
                ))
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={readOnly ? 9 : 10} className="text-center py-12">
                    <p className="text-muted-foreground">No vehicles added yet</p>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item: any) => (
                  <VehicleRow
                    key={item.id}
                    item={item}
                    readOnly={readOnly}
                    onDelete={() => setDeleteTarget({ type: "vehicles", id: item.id })}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      );
    } else if (activeTab === "restaurants") {
      // restaurants
      const heads = readOnly ? RESTAURANT_HEADS.slice(0, -1) : RESTAURANT_HEADS;
      return (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                {heads.map((h, i) => (
                  <TableHead key={i} className={!readOnly && i === heads.length - 1 ? "w-10" : ""}>
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-28" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </TableCell>
                    {!readOnly && <TableCell />}
                  </TableRow>
                ))
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={readOnly ? 9 : 10} className="text-center py-12">
                    <p className="text-muted-foreground">No restaurants added yet</p>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item: any) => (
                  <RestaurantRow
                    key={item.id}
                    item={item}
                    readOnly={readOnly}
                    onDelete={() => setDeleteTarget({ type: "restaurants", id: item.id })}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      );
    } else {
      // drivers or guides
      const heads = readOnly ? PERSON_HEADS.slice(0, -1) : PERSON_HEADS;
      return (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                {heads.map((h, i) => (
                  <TableHead key={i} className={!readOnly && i === heads.length - 1 ? "w-10" : ""}>
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-28" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </TableCell>
                    {!readOnly && <TableCell />}
                  </TableRow>
                ))
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={readOnly ? 9 : 10} className="text-center py-12">
                    <p className="text-muted-foreground">No {activeTab} added yet</p>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item: any) => (
                  <PersonRow
                    key={item.id}
                    item={item}
                    readOnly={readOnly}
                    onDelete={() => setDeleteTarget({ type: activeTab, id: item.id })}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      );
    }
  };

  return (
    <div className="space-y-3">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as LibraryType)}>
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
          {renderTable()}
          {items.length > 0 && (
            <div className="mt-2 text-xs text-muted-foreground">
              Total: {items.length} {items.length === 1 ? 'item' : 'items'}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {!readOnly && (
        <AlertModal
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          loading={isDeleting}
          title="Remove library item?"
          description="This item will be permanently deleted from the library. This action cannot be undone."
        />
      )}
    </div>
  );
}
