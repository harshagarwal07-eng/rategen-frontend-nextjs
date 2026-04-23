"use client";

import { useState, useTransition } from "react";
import { ColumnDef, Column } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertModal } from "@/components/ui/alert-modal";
import { format } from "date-fns";
import { Doc } from "@/types/docs";
import { IOption } from "@/types/common";
import { DocsDataTable } from "./docs-data-table";
import { DataTableColumnHeader } from "@/components/ui/table/data-table-column-header";
import { DocsDataTableToolbar } from "./docs-data-table-toolbar";
import EditDocSheet from "./actions/edit-doc-sheet";
import ViewDocSheet from "./actions/view-doc-sheet";
import { SERVICE_TYPES } from "@/constants/data";
import { useDataTable } from "@/hooks/use-data-table";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MoreHorizontal, Pencil, Copy, Trash2, Loader2 } from "lucide-react";
import { createDoc, deleteDoc } from "@/data-access/docs";
import { toast } from "sonner";

function DocRowActions({
  doc,
  docType,
  title,
  showNights,
  allowMultiplePerCountry,
  docs,
  countries,
}: {
  doc: Doc;
  docType: string;
  title: string;
  showNights: boolean;
  allowMultiplePerCountry: boolean;
  docs: Doc[];
  countries: IOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  const handleDelete = () => {
    startTransition(async () => {
      const { error } = await deleteDoc(Number(doc.id));
      if (error) {
        toast.error(error);
        return;
      }
      setDeleteOpen(false);
      toast.success(`${title} deleted successfully`);
      router.refresh();
    });
  };

  const handleDuplicate = async () => {
    setDuplicating(true);
    try {
      const { error } = await createDoc({
        type: docType,
        country: doc.country,
        content: doc.content,
        nights: doc.nights,
        service_type: doc.service_type,
        state: doc.state || undefined,
      });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success(`${title} duplicated`);
      router.refresh();
    } catch {
      toast.error("Failed to duplicate");
    } finally {
      setDuplicating(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            {duplicating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MoreHorizontal className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {showNights ? (
            <DropdownMenuItem asChild>
              <Link href={`/docs/itineraries/${doc.id}/edit`}>
                <Pencil className="h-3.5 w-3.5 mr-2" />
                Edit
              </Link>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => setEditOpen(true)}>
              <Pencil className="h-3.5 w-3.5 mr-2" />
              Edit
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={handleDuplicate} disabled={duplicating}>
            <Copy className="h-3.5 w-3.5 mr-2" />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => setDeleteOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        loading={isPending}
      />

      {editOpen && !showNights && (
        <EditDocSheet
          allowMultiplePerCountry={allowMultiplePerCountry}
          docs={docs}
          title={title}
          showNights={showNights}
          countries={countries}
          doc={doc}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      )}
    </>
  );
}

interface Props {
  docType: string;
  title: string;
  showNights: boolean;
  allowMultiplePerCountry: boolean;
  initialDocs: Doc[];
  countries: IOption[];
}

export default function DocsDataTableWrapper({
  docType,
  title,
  showNights,
  allowMultiplePerCountry,
  initialDocs: docs,
  countries,
}: Props) {
  // Define columns
  const columns: ColumnDef<Doc>[] = [
    {
      accessorKey: "country_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Country" />
      ),
      cell: ({ row }) => {
        const country = row.getValue("country_name") as string;
        return <span>{country}</span>;
      },
      enableSorting: true,
    },
    {
      accessorKey: "state_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="State" />
      ),
      cell: ({ row }) => {
        const state = row.getValue("state_name") as string;
        return <span>{state || "-"}</span>;
      },
      enableSorting: true,
    },
    // Conditionally include service_type column only for knowledgebase
    ...(docType === "knowledgebase"
      ? [
          {
            accessorKey: "service_type" as keyof Doc,
            header: ({ column }: { column: Column<Doc, unknown> }) => (
              <DataTableColumnHeader column={column} title="Service Type" />
            ),
            cell: ({ row }: { row: any }) => {
              const serviceType = row.getValue("service_type") as string;
              if (!serviceType) return "-";
              const serviceTypeLabel =
                SERVICE_TYPES.find((type) => type.value === serviceType)
                  ?.label || serviceType;
              return (
                <Badge variant="outline" className="capitalize">
                  {serviceTypeLabel}
                </Badge>
              );
            },
            enableSorting: true,
          },
        ]
      : []),
    {
      id: "content",
      header: "Content",
      cell: ({ row }) => {
        const doc = row.original;
        return <ViewDocSheet title={title} showNights={showNights} doc={doc} docType={docType} />;
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "is_active",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        const isActive = row.getValue("is_active") as boolean;
        return (
          <Badge variant={isActive ? "default" : "destructive"}>
            {isActive ? "Active" : "Inactive"}
          </Badge>
        );
      },
      enableSorting: true,
      enableHiding: false,
    },
    // Conditionally include nights + theme columns for itineraries
    ...(showNights
      ? [
          {
            accessorKey: "nights" as keyof Doc,
            header: ({ column }: { column: Column<Doc, unknown> }) => (
              <DataTableColumnHeader column={column} title="Nights" />
            ),
            cell: ({ row }: { row: any }) => {
              const nights = row.getValue("nights") as number;
              if (!nights) return "-";
              return <Badge variant="secondary">{nights} nights</Badge>;
            },
            enableSorting: true,
          },
          {
            id: "theme",
            header: "Theme",
            cell: ({ row }: { row: any }) => {
              try {
                const parsed = JSON.parse(row.original.content || "{}");
                if (!parsed.theme) return <span className="text-muted-foreground">-</span>;
                return <Badge variant="outline" className="capitalize">{parsed.theme.replace(/_/g, " ")}</Badge>;
              } catch {
                return <span className="text-muted-foreground">-</span>;
              }
            },
            enableSorting: false,
          },
        ]
      : []),
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Created" />
      ),
      cell: ({ row }) => {
        const date = row.getValue("created_at") as string;
        return (
          <span className="text-xs text-muted-foreground">
            {format(new Date(date), "PP")}
          </span>
        );
      },
      enableSorting: true,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <DocRowActions
          doc={row.original}
          docType={docType}
          title={title}
          showNights={showNights}
          allowMultiplePerCountry={allowMultiplePerCountry}
          docs={docs}
          countries={countries}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ];

  const { table } = useDataTable({
    data: docs,
    columns,
    pageCount: Math.ceil(docs.length / 100), // Default page size
    shallow: false,
    debounceMs: 500,
  });

  return (
    <DocsDataTable table={table} title={title} showNights={showNights}>
      <DocsDataTableToolbar
        table={table}
        title={title}
        docType={docType}
        showNights={showNights}
        allowMultiplePerCountry={allowMultiplePerCountry}
        docs={docs}
        countries={countries}
      />
    </DocsDataTable>
  );
}
