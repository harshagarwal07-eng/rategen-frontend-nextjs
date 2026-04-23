import type { Column, RowData } from "@tanstack/react-table";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    showTotal?: boolean;
    options?: { label: string; value: string }[];
  }
}

/**
 * Pinning styles for the new data table.
 *
 * Uses border-collapse: separate (set on the <table> in data-table.tsx) so every cell
 * fully owns its own borders. With border-separate, sticky cells' borders always move
 * with them — they are never shared/claimed by adjacent scrolling cells the way they are
 * with border-collapse: collapse.
 *
 * Row separators are provided by borderBottom on each cell (not via <tr> border-b, which
 * is ignored by browsers under border-collapse: separate).
 *
 * Right-pinned left separator:
 *   - The last non-pinned column gets borderRight: "none" so it contributes no visible border.
 *   - The first right-pinned column gets borderLeft: "1px solid" which is fully owned by the
 *     sticky cell and stays in place during scroll.
 */
export function getNewTablePinningStyles<TData>({
  column,
  isHeader = false,
  isLastBeforeRightPinned = false,
}: {
  column: Column<TData>;
  withBorder?: boolean; // reserved for future use
  isHeader?: boolean;
  isLastBeforeRightPinned?: boolean;
}): React.CSSProperties {
  const isPinned = column.getIsPinned();
  const isFirstRightPinnedColumn = isPinned === "right" && column.getIsFirstColumn("right");

  return {
    left: isPinned === "left" ? `${column.getStart("left")}px` : undefined,
    right: isPinned === "right" ? `${column.getAfter("right")}px` : undefined,
    opacity: isPinned ? 0.99 : 1,
    position: isPinned ? "sticky" : "relative",
    background: isHeader ? "var(--pinned-header-background)" : "var(--pinned-background)",
    width: column.getSize(),
    zIndex: isPinned ? (isHeader ? 15 : 5) : 0,
    // Row separator: <tr> border-b is ignored with border-separate, so cells carry it.
    borderBottom: "1px solid var(--border)",
    // Column separator on the right side of every cell.
    // The last non-pinned column before the right-pinned group has borderRight: "none"
    // so it contributes no visible border at that boundary.
    borderRight: isLastBeforeRightPinned ? "none" : "1px solid var(--border)",
    // The first right-pinned column gets an explicit left border that is fully owned
    // by the sticky cell — with border-separate it never scrolls away.
    borderLeft: isFirstRightPinnedColumn ? "1px solid var(--border)" : undefined,
  };
}
