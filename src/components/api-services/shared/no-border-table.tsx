import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Props = {
  columns: {
    header: string;
    accessorKey: string;
  }[];
  tableData: {
    [key: string]: string;
  }[];
};

export default function NoBorderTable({ columns, tableData }: Props) {
  return (
    <Table>
      <TableHeader className="bg-muted dark:bg-input">
        <TableRow className="border-none">
          {columns.map(({ header }) => (
            <TableHead key={header} className=" text-foreground">
              {header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {tableData.map((row, index) => (
          <TableRow key={index} className="border-none">
            {columns.map(({ accessorKey }) => (
              <TableCell key={accessorKey} className="max-w-64">
                {row[accessorKey] ?? ""}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
