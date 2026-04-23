import { useState, useCallback, useRef, useEffect } from "react";
import { CellPosition, SelectionRange, SelectionBounds, getSelectionBounds, isCellInBounds } from "./types";

interface UseSelectionProps {
  rowCount: number;
  colCount: number;
}

interface UseSelectionReturn {
  selection: SelectionRange | null;
  isSelecting: boolean;
  selectCell: (pos: CellPosition, extend?: boolean) => void;
  startSelection: (pos: CellPosition) => void;
  extendSelection: (pos: CellPosition) => void;
  endSelection: () => void;
  selectAll: () => void;
  selectRow: (row: number) => void;
  clearSelection: () => void;
  moveSelection: (direction: "up" | "down" | "left" | "right", extend?: boolean) => void;
  isCellSelected: (row: number, col: number) => boolean;
  isCellAnchor: (row: number, col: number) => boolean;
  getSelectionBounds: () => SelectionBounds | null;
  selectionRef: React.MutableRefObject<SelectionRange | null>;
}

export function useSelection({ rowCount, colCount }: UseSelectionProps): UseSelectionReturn {
  const [selection, setSelection] = useState<SelectionRange | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  // Ref to avoid stale closures in callbacks
  const selectionRef = useRef<SelectionRange | null>(null);

  useEffect(() => {
    selectionRef.current = selection;
  }, [selection]);

  // Select a single cell (or extend selection with shift)
  const selectCell = useCallback((pos: CellPosition, extend = false) => {
    if (extend && selectionRef.current) {
      setSelection({
        start: selectionRef.current.start,
        end: pos,
      });
    } else {
      setSelection({ start: pos, end: pos });
    }
  }, []);

  // Start drag selection
  const startSelection = useCallback((pos: CellPosition) => {
    setSelection({ start: pos, end: pos });
    setIsSelecting(true);
  }, []);

  // Extend selection during drag
  const extendSelection = useCallback((pos: CellPosition) => {
    if (isSelecting && selectionRef.current) {
      setSelection({
        start: selectionRef.current.start,
        end: pos,
      });
    }
  }, [isSelecting]);

  // End drag selection
  const endSelection = useCallback(() => {
    setIsSelecting(false);
  }, []);

  // Select all cells
  const selectAll = useCallback(() => {
    if (rowCount > 0 && colCount > 0) {
      setSelection({
        start: { row: 0, col: 0 },
        end: { row: rowCount - 1, col: colCount - 1 },
      });
    }
  }, [rowCount, colCount]);

  // Select entire row
  const selectRow = useCallback((row: number) => {
    if (colCount > 0) {
      setSelection({
        start: { row, col: 0 },
        end: { row, col: colCount - 1 },
      });
    }
  }, [colCount]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelection(null);
  }, []);

  // Move selection with arrow keys
  const moveSelection = useCallback(
    (direction: "up" | "down" | "left" | "right", extend = false) => {
      const current = selectionRef.current;
      if (!current) return;

      // Calculate target based on direction
      const target = extend ? { ...current.end } : { ...current.start };

      switch (direction) {
        case "up":
          target.row = Math.max(0, target.row - 1);
          break;
        case "down":
          target.row = Math.min(rowCount - 1, target.row + 1);
          break;
        case "left":
          target.col = Math.max(0, target.col - 1);
          break;
        case "right":
          target.col = Math.min(colCount - 1, target.col + 1);
          break;
      }

      if (extend) {
        setSelection({ start: current.start, end: target });
      } else {
        setSelection({ start: target, end: target });
      }
    },
    [rowCount, colCount]
  );

  // Check if cell is in selection
  const isCellSelected = useCallback(
    (row: number, col: number) => {
      const bounds = getSelectionBounds(selection);
      if (!bounds) return false;
      return isCellInBounds({ row, col }, bounds);
    },
    [selection]
  );

  // Check if cell is the anchor (start of selection)
  const isCellAnchor = useCallback(
    (row: number, col: number) => {
      if (!selection) return false;
      return selection.start.row === row && selection.start.col === col;
    },
    [selection]
  );

  // Get current selection bounds
  const getBounds = useCallback(() => {
    return getSelectionBounds(selection);
  }, [selection]);

  // Handle mouse up globally
  useEffect(() => {
    const handleMouseUp = () => setIsSelecting(false);
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, []);

  return {
    selection,
    isSelecting,
    selectCell,
    startSelection,
    extendSelection,
    endSelection,
    selectAll,
    selectRow,
    clearSelection,
    moveSelection,
    isCellSelected,
    isCellAnchor,
    getSelectionBounds: getBounds,
    selectionRef,
  };
}
