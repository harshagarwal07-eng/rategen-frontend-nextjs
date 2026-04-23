"use client";

import { useMemo, useState } from "react";
import { ITeam } from "@/types/user";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PenLine, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { DESIGNATION_OPTIONS } from "@/constants/dmc";
import EditTeamDialog from "./edit-team-dialog";
import { Button } from "../ui/button";
import { ColumnFilter } from "@/components/crm/queries/ops/bookings/column-filter";
import useUser from "@/hooks/use-user";

type SortField = "name" | "email";
type SortDir = "asc" | "desc";

type Props = {
  membersData: ITeam[];
  isLoading?: boolean;
};

function SortButton({
  label,
  field,
  sortField,
  sortDir,
  onSort,
}: {
  label: string;
  field: SortField;
  sortField: SortField | null;
  sortDir: SortDir;
  onSort: (field: SortField) => void;
}) {
  const isActive = sortField === field;
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 flex items-center gap-1 [&_svg:not([class*='size-'])]:size-3"
      onClick={() => onSort(field)}
    >
      {label}
      {isActive ? (
        sortDir === "asc" ? <ArrowUp className="text-primary" /> : <ArrowDown className="text-primary" />
      ) : (
        <ArrowUpDown className="text-muted-foreground" />
      )}
    </Button>
  );
}

export default function TeamTable({ membersData, isLoading }: Props) {
  const { user } = useUser();

  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [designationFilter, setDesignationFilter] = useState<Set<string>>(new Set());

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const designationOptions = DESIGNATION_OPTIONS.map((d) => ({
    label: d.name,
    value: d.value,
  }));

  const processedMembers = useMemo(() => {
    let result = [...membersData];

    if (designationFilter.size > 0) {
      result = result.filter((m) => designationFilter.has(m.designation));
    }

    if (sortField) {
      result.sort((a, b) => {
        const aVal = a[sortField]?.toLowerCase() ?? "";
        const bVal = b[sortField]?.toLowerCase() ?? "";
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      });
    }

    return result;
  }, [membersData, designationFilter, sortField, sortDir]);

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="min-w-[160px]">
              <SortButton label="Name" field="name" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
            </TableHead>
            <TableHead className="min-w-[200px]">
              <SortButton label="Email" field="email" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
            </TableHead>
            <TableHead className="min-w-[140px]">Phone</TableHead>
            <TableHead className="min-w-[160px]">
              <ColumnFilter
                title="Designation"
                options={designationOptions}
                selected={designationFilter}
                onSelect={(v) =>
                  setDesignationFilter((prev) => {
                    const next = new Set(prev);
                    next.has(v) ? next.delete(v) : next.add(v);
                    return next;
                  })
                }
                onClear={() => setDesignationFilter(new Set())}
              />
            </TableHead>
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <>
              {Array.from({ length: 3 }).map((_, index) => (
                <TableRow key={index}>
                  {Array.from({ length: 5 }).map((_, colIndex) => (
                    <TableCell key={`${index}-${colIndex}`}>
                      <div className="bg-muted rounded w-full h-4 animate-pulse" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </>
          ) : processedMembers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-xs text-muted-foreground">
                {membersData.length === 0 ? "No team members found" : "No members match the selected filters"}
              </TableCell>
            </TableRow>
          ) : (
            processedMembers.map((member) => (
              <TableRow key={member.email} className="hover:bg-muted/30">
                <TableCell>
                  <p className="font-medium text-xs leading-tight">
                    {member.name}
                    {user?.email === member.email && (
                      <span className="font-normal text-muted-foreground"> (You)</span>
                    )}
                  </p>
                </TableCell>
                <TableCell className="text-xs">{member.email}</TableCell>
                <TableCell className="text-xs">{member.phone || "-"}</TableCell>
                <TableCell className="text-xs">
                  {DESIGNATION_OPTIONS.find((v) => v.value === member.designation)?.name ?? "-"}
                </TableCell>
                <TableCell className="p-1">
                  <EditTeamDialog data={member}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={user?.role !== "dmc_admin"}
                    >
                      <PenLine className="h-3.5 w-3.5" />
                    </Button>
                  </EditTeamDialog>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
