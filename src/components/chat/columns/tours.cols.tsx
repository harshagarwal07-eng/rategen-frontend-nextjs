import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { EyePopover } from "@/components/ui/table/eye-popover";
import MarkdownRenderer from "@/components/ui/markdown-renderer";

export const columns: ColumnDef<any>[] = [
  {
    id: "tour_details",
    accessorKey: "tour_details",
    header: "Tour Details",
    cell: ({ cell }) => (
      <MarkdownRenderer>{cell.getValue<string>()}</MarkdownRenderer>
    ),
    size: 300,
  },
  {
    id: "type",
    accessorKey: "type",
    header: "Type",
  },
  {
    id: "currency",
    accessorKey: "currency_code",
    header: "Currency",
  },
  {
    id: "date",
    accessorKey: "tour_date",
    header: "Date",
  },
  {
    id: "rate_group",
    header: () => <div className="text-center font-semibold">Rate</div>,
    columns: [
      {
        id: "rate_adult",
        header: () => "Adult",
        cell: ({ row }) => {
          try {
            const rate = row.original.rate;
            return rate.adult.toLocaleString() || "-";
          } catch {
            return "-";
          }
        },
      },
      {
        id: "rate_child",
        header: () => "Child",
        cell: ({ row }) => {
          try {
            const rate = row.original.rate;
            return rate.child.toLocaleString() || "-";
          } catch {
            return "-";
          }
        },
      },
      {
        id: "rate_total",
        header: () => "Total",
        cell: ({ row }) => {
          try {
            const rate = row.original.rate;
            return rate.total.toLocaleString() || "-";
          } catch {
            return "-";
          }
        },
      },
    ],
  },
  {
    id: "calculation",
    accessorKey: "calculation",
    header: "Calculation",
    cell: ({ cell }) => (
      <EyePopover
        title="Calculation"
        description={cell.getValue<string>() || "-"}
      />
    ),
  },
  {
    id: "assumption",
    accessorKey: "assumption",
    header: "Assumption",
    cell: ({ cell }) => (
      <EyePopover
        title="Assumption"
        description={cell.getValue<string>() || "-"}
      />
    ),
  },
  {
    id: "status",
    accessorKey: "inclusion",
    header: "Status",
    cell: ({ cell }) => (
      <Badge
        className="capitalize"
        variant={
          cell.getValue<string>() === "included"
            ? "default"
            : cell.getValue<string>() === "excluded"
            ? "destructive"
            : "secondary"
        }
      >
        {cell.getValue<string>() || "-"}
      </Badge>
    ),
  },
  {
    id: "remarks",
    accessorKey: "remarks",
    header: "Remarks",
    cell: ({ cell }) => (
      <EyePopover
        title="Remarks"
        description={cell.getValue<string>() || "-"}
      />
    ),
  },
];
