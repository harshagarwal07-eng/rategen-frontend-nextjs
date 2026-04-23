import { useCallback, useRef } from "react";
import { SelectionBounds, ColumnDef } from "./types";

interface UseClipboardProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  getSelectionBounds: () => SelectionBounds | null;
  onCellChange: (rowId: string, field: keyof T, value: any) => void;
  getRowId: (row: T) => string;
}

interface ClipboardData {
  values: any[][];
  bounds: SelectionBounds;
}

export function useClipboard<T extends { id: string }>({
  data,
  columns,
  getSelectionBounds,
  onCellChange,
  getRowId,
}: UseClipboardProps<T>) {
  const clipboardRef = useRef<ClipboardData | null>(null);

  // Copy selected cells to clipboard
  const copy = useCallback(async () => {
    const bounds = getSelectionBounds();
    if (!bounds) return;

    const values: any[][] = [];
    const textRows: string[] = [];

    for (let r = bounds.minRow; r <= bounds.maxRow; r++) {
      const rowValues: any[] = [];
      const textCells: string[] = [];

      for (let c = bounds.minCol; c <= bounds.maxCol; c++) {
        const row = data[r];
        const col = columns[c];
        if (row && col) {
          const value = row[col.accessorKey];
          rowValues.push(value);
          textCells.push(value?.toString() ?? "");
        }
      }

      values.push(rowValues);
      textRows.push(textCells.join("\t"));
    }

    // Store for internal paste
    clipboardRef.current = { values, bounds };

    // Copy to system clipboard as tab-separated text
    try {
      await navigator.clipboard.writeText(textRows.join("\n"));
    } catch (err) {
      console.warn("Failed to copy to system clipboard:", err);
    }
  }, [data, columns, getSelectionBounds]);

  // Cut = copy + clear
  const cut = useCallback(async () => {
    await copy();
    // Clear will be handled separately by the delete action
  }, [copy]);

  // Paste from clipboard
  const paste = useCallback(async () => {
    const bounds = getSelectionBounds();
    if (!bounds) return;

    let pasteData: any[][] | null = null;

    // Try to get from system clipboard first
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        pasteData = text.split("\n").map((row) => row.split("\t"));
      }
    } catch (err) {
      // Fall back to internal clipboard
      if (clipboardRef.current) {
        pasteData = clipboardRef.current.values;
      }
    }

    if (!pasteData || pasteData.length === 0) return;

    // Paste starting from selection start
    const startRow = bounds.minRow;
    const startCol = bounds.minCol;

    for (let r = 0; r < pasteData.length; r++) {
      const targetRow = startRow + r;
      if (targetRow >= data.length) break;

      const row = data[targetRow];
      if (!row) continue;

      for (let c = 0; c < pasteData[r].length; c++) {
        const targetCol = startCol + c;
        if (targetCol >= columns.length) break;

        const col = columns[targetCol];
        if (!col || col.editable === false) continue;

        let value = pasteData[r][c];

        // Convert value based on column type
        if (col.type === "number") {
          value = value === "" || value === null ? null : parseFloat(String(value));
          if (isNaN(value)) value = null;
        } else if (col.type === "checkbox") {
          value = value === "true" || value === "Yes" || value === true;
        }

        onCellChange(getRowId(row), col.accessorKey, value);
      }
    }
  }, [data, columns, getSelectionBounds, onCellChange, getRowId]);

  return { copy, cut, paste };
}
