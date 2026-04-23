"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { useReactTable, getCoreRowModel, flexRender, ColumnDef as TanstackColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { ColumnDef, CellPosition, getSelectionBounds } from "./types";
import { useSelection } from "./use-selection";
import { useClipboard } from "./use-clipboard";
import { useHistory } from "./use-history";
import { CellEditor } from "./cell-editors";
import { DateRangeEditor } from "./date-range-editor";
import { ExpandableEditor } from "./expandable-editor";
import { Autocomplete } from "@/components/ui/autocomplete";
import { IOption } from "@/types/common";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Eye, Copy, Undo2, Redo2 } from "lucide-react";
import { ColumnFilter } from "./column-filter";
import "./excel-grid.css";
import IndicateLocked from "@/components/common/indicate-locked";

interface ExcelGridProps<T extends { id: string }> {
  data: T[];
  columns: ColumnDef<T>[];
  onCellChange: (rowId: string, field: keyof T, value: any) => void;
  onBatchCellChange?: (changes: Array<{ rowId: string; field: keyof T; value: any }>) => void;
  getRowId?: (row: T) => string;
  getIsLocked?: (row: T, accessorKey: string, scope?: string) => boolean;
  // Row management - context-aware (inherits parent from current row)
  onInsertRow?: (afterRowId: string) => void;
  onDeleteRows?: (rowIds: string[]) => void;
  // Duplicate row (copies all data from current row)
  onDuplicateRow?: (rowId: string) => void;
  // Hide insert option from context menu (useful when there's a toolbar add button)
  hideContextMenuInsert?: boolean;
  // Custom labels for context menu (e.g., "Hotel", "Room", "Rate")
  rowLabel?: string;
  // Search functionality
  searchFields?: (keyof T)[];
  searchPlaceholder?: string;
  // Add new button (shown in toolbar)
  onAddNew?: () => void;
  addNewLabel?: string;
  // View action (eye icon in first column)
  onViewRow?: (rowId: string) => void;
}

export function ExcelGrid<T extends { id: string }>({
  data,
  columns,
  onCellChange,
  onBatchCellChange,
  getRowId = (row) => row.id,
  getIsLocked = () => false,
  onInsertRow,
  onDeleteRows,
  onDuplicateRow,
  hideContextMenuInsert = false,
  rowLabel = "Row",
  searchFields,
  searchPlaceholder = "Search...",
  onAddNew,
  addNewLabel = "Add",
  onViewRow,
}: ExcelGridProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [editingCell, setEditingCell] = useState<CellPosition | null>(null);
  const [editValue, setEditValue] = useState<any>("");
  const [selectAllOnEdit, setSelectAllOnEdit] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  // Column filters: map of columnId -> Set of selected values
  const [columnFilters, setColumnFilters] = useState<Record<string, Set<string>>>({});

  // Handle column filter change
  const handleColumnFilterChange = useCallback((columnId: string, values: Set<string>) => {
    setColumnFilters((prev) => {
      if (values.size === 0) {
        // Remove filter if empty
        const { [columnId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [columnId]: values };
    });
  }, []);

  // Filter data based on search query AND column filters
  const filteredData = useMemo(() => {
    let result = data;

    // Apply search filter
    if (searchQuery.trim() && searchFields && searchFields.length > 0) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((row) => {
        return searchFields.some((field) => {
          const value = row[field];
          if (value == null) return false;
          return String(value).toLowerCase().includes(query);
        });
      });
    }

    // Apply column filters
    const filterEntries = Object.entries(columnFilters);
    if (filterEntries.length > 0) {
      result = result.filter((row) => {
        return filterEntries.every(([columnId, allowedValues]) => {
          const col = columns.find((c) => c.id === columnId);
          if (!col) return true;
          const value = String(row[col.accessorKey] ?? "");
          return allowedValues.has(value);
        });
      });
    }

    return result;
  }, [data, searchQuery, searchFields, columnFilters, columns]);

  // Selection hook
  const {
    selection,
    selectCell,
    startSelection,
    extendSelection,
    selectAll,
    selectRow,
    moveSelection,
    isCellSelected,
    isCellAnchor,
    getSelectionBounds: getBounds,
    selectionRef,
  } = useSelection({ rowCount: filteredData.length, colCount: columns.length });

  // History hook for undo/redo
  const { recordChange, initializeValue, getCurrentValue, undo, redo, canUndo, canRedo } = useHistory();

  // Initialize history tracking when data changes
  useEffect(() => {
    data.forEach((row) => {
      const rowId = getRowId(row);
      columns.forEach((col) => {
        initializeValue(rowId, col.accessorKey as string, row[col.accessorKey]);
      });
    });
  }, [data, columns, getRowId, initializeValue]);

  // Wrapped onCellChange that records history
  const handleCellChangeWithHistory = useCallback(
    (rowId: string, field: keyof T, newValue: any) => {
      const oldValue = getCurrentValue(rowId, field as string);
      recordChange(rowId, field as string, oldValue, newValue);
      onCellChange(rowId, field, newValue);
    },
    [getCurrentValue, recordChange, onCellChange]
  );

  // Clipboard hook
  const { copy, paste } = useClipboard({
    data: filteredData,
    columns,
    getSelectionBounds: getBounds,
    onCellChange: handleCellChangeWithHistory,
    getRowId,
  });

  // Build TanStack Table columns
  const tableColumns: TanstackColumnDef<T>[] = useMemo(
    () =>
      columns.map((col) => ({
        id: col.id,
        accessorKey: col.accessorKey as string,
        header: col.header,
        size: col.width || 120,
        minSize: col.minWidth || 60,
      })),
    [columns]
  );

  const table = useReactTable({
    data: filteredData,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => getRowId(row),
  });

  // Start editing a cell
  // replaceMode: true = typing started edit (select all), false = double-click/F2 (cursor at end)
  const startEditing = useCallback(
    (row: number, col: number, initialValue?: string, replaceMode = false) => {
      const rowData = filteredData[row];
      if (!rowData) return;

      const column = columns[col];
      if (column.editable === false) return;

      const isLocked = getIsLocked(rowData, column.accessorKey as string);
      if (isLocked) return;

      setEditingCell({ row, col });
      setSelectAllOnEdit(replaceMode);
      setEditValue(initialValue !== undefined ? initialValue : (rowData[column.accessorKey] ?? ""));
    },
    [columns, filteredData, getIsLocked]
  );

  // Commit edit
  const commitEdit = useCallback(() => {
    if (!editingCell) return;

    const col = columns[editingCell.col];
    const row = filteredData[editingCell.row];
    if (!row || !col) {
      setEditingCell(null);
      return;
    }

    let finalValue: any = editValue;

    // Type conversion
    if (col.type === "number") {
      finalValue = editValue === "" || editValue === null ? null : parseFloat(String(editValue));
      if (isNaN(finalValue)) finalValue = null;
    } else if (col.type === "checkbox") {
      finalValue = !!editValue;
    }

    handleCellChangeWithHistory(getRowId(row), col.accessorKey, finalValue);
    setEditingCell(null);
    setEditValue("");
    containerRef.current?.focus();
  }, [editingCell, editValue, columns, filteredData, handleCellChangeWithHistory, getRowId]);

  // Cancel edit
  const cancelEdit = useCallback(() => {
    setEditingCell(null);
    setEditValue("");
    containerRef.current?.focus();
  }, []);

  // Navigate after edit
  const navigateAfterEdit = useCallback(
    (direction: "up" | "down" | "left" | "right") => {
      moveSelection(direction, false);
    },
    [moveSelection]
  );

  // Delete selected cells
  const deleteSelectedCells = useCallback(() => {
    const bounds = getBounds();
    if (!bounds) return;

    const changes: Array<{ rowId: string; field: keyof T; value: any }> = [];

    for (let r = bounds.minRow; r <= bounds.maxRow; r++) {
      for (let c = bounds.minCol; c <= bounds.maxCol; c++) {
        const col = columns[c];
        const row = filteredData[r];
        const isLocked = getIsLocked(row, col.accessorKey as string);

        if (!col || !row) continue;
        if (col.editable === false || isLocked) continue;

        const emptyValue = col.type === "number" ? null : col.type === "checkbox" ? false : "";
        changes.push({ rowId: getRowId(row), field: col.accessorKey, value: emptyValue });
      }
    }

    // Use batch change if available, otherwise fall back to individual changes
    if (onBatchCellChange && changes.length > 0) {
      // Record history for each change
      changes.forEach(({ rowId, field, value }) => {
        const oldValue = getCurrentValue(rowId, field as string);
        recordChange(rowId, field as string, oldValue, value);
      });
      onBatchCellChange(changes);
    } else {
      // Fall back to individual changes
      changes.forEach(({ rowId, field, value }) => {
        handleCellChangeWithHistory(rowId, field, value);
      });
    }
  }, [
    getBounds,
    columns,
    filteredData,
    getRowId,
    onBatchCellChange,
    getCurrentValue,
    recordChange,
    handleCellChangeWithHistory,
  ]);

  // Undo handler
  const handleUndo = useCallback(() => {
    const entry = undo();
    if (entry) {
      onCellChange(entry.rowId, entry.field as keyof T, entry.oldValue);
    }
  }, [undo, onCellChange]);

  // Redo handler
  const handleRedo = useCallback(() => {
    const entry = redo();
    if (entry) {
      onCellChange(entry.rowId, entry.field as keyof T, entry.newValue);
    }
  }, [redo, onCellChange]);

  // Get selected row indices (unique rows in selection)
  const getSelectedRowIndices = useCallback((): number[] => {
    const bounds = getBounds();
    if (!bounds) return [];
    const rows: number[] = [];
    for (let r = bounds.minRow; r <= bounds.maxRow; r++) {
      rows.push(r);
    }
    return rows;
  }, [getBounds]);

  // Get selected row IDs
  const getSelectedRowIds = useCallback((): string[] => {
    const rowIndices = getSelectedRowIndices();
    return rowIndices.map((idx) => getRowId(filteredData[idx])).filter(Boolean);
  }, [getSelectedRowIndices, filteredData, getRowId]);

  // Handle delete rows
  const handleDeleteRows = useCallback(() => {
    if (!onDeleteRows) return;
    const rowIds = getSelectedRowIds();
    if (rowIds.length > 0) {
      onDeleteRows(rowIds);
    }
  }, [onDeleteRows, getSelectedRowIds]);

  // Handle insert row (after current selection)
  const handleInsertRow = useCallback(() => {
    if (!onInsertRow) return;
    const bounds = getBounds();
    if (!bounds) return;
    // Insert after the last selected row
    const afterRow = filteredData[bounds.maxRow];
    if (afterRow) {
      onInsertRow(getRowId(afterRow));
    }
  }, [onInsertRow, getBounds, filteredData, getRowId]);

  // Handle duplicate row (copy row with all data)
  const handleDuplicateRow = useCallback(() => {
    if (!onDuplicateRow) return;
    const bounds = getBounds();
    if (!bounds) return;
    const row = filteredData[bounds.maxRow];
    if (row) {
      onDuplicateRow(getRowId(row));
    }
  }, [onDuplicateRow, getBounds, filteredData, getRowId]);

  // Handle copy button click on index cell
  const handleCopyButtonClick = useCallback(
    (rowIdx: number) => {
      const row = filteredData[rowIdx];
      if (!row) return;
      const rowId = getRowId(row);

      // Use duplicate if available (for hotels), otherwise insert
      if (onDuplicateRow) {
        onDuplicateRow(rowId);
      } else if (onInsertRow) {
        onInsertRow(rowId);
      }
    },
    [filteredData, getRowId, onDuplicateRow, onInsertRow]
  );

  // Handle mouse down on cell (left-click)
  const handleMouseDown = useCallback(
    (row: number, col: number, e: React.MouseEvent) => {
      if (e.button !== 0) return;

      // Commit any ongoing edit
      if (editingCell) {
        commitEdit();
      }

      containerRef.current?.focus();

      if (e.shiftKey && selection) {
        selectCell({ row, col }, true);
      } else {
        startSelection({ row, col });
      }
    },
    [editingCell, commitEdit, selection, selectCell, startSelection]
  );

  // Handle right-click on cell - select cell before context menu
  const handleContextMenu = useCallback(
    (row: number, col: number) => {
      // Commit any ongoing edit
      if (editingCell) {
        commitEdit();
      }

      containerRef.current?.focus();

      // Only select if not already in selection
      if (!isCellSelected(row, col)) {
        selectCell({ row, col });
      }
    },
    [editingCell, commitEdit, isCellSelected, selectCell]
  );

  // Handle mouse enter during drag
  const handleMouseEnter = useCallback(
    (row: number, col: number) => {
      extendSelection({ row, col });
    },
    [extendSelection]
  );

  // Handle double click
  const handleDoubleClick = useCallback(
    (row: number, col: number) => {
      startEditing(row, col);
    },
    [startEditing]
  );

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // If editing, let the editor handle most keys
      if (editingCell) return;

      const { key, shiftKey, ctrlKey, metaKey } = e;
      const mod = ctrlKey || metaKey;

      // Navigation
      if (key === "ArrowUp") {
        e.preventDefault();
        moveSelection("up", shiftKey);
      } else if (key === "ArrowDown") {
        e.preventDefault();
        moveSelection("down", shiftKey);
      } else if (key === "ArrowLeft") {
        e.preventDefault();
        moveSelection("left", shiftKey);
      } else if (key === "ArrowRight") {
        e.preventDefault();
        moveSelection("right", shiftKey);
      } else if (key === "Tab") {
        e.preventDefault();
        moveSelection(shiftKey ? "left" : "right", false);
      }

      // Select all
      else if (key === "a" && mod) {
        e.preventDefault();
        selectAll();
      }

      // Copy/Paste
      else if (key === "c" && mod) {
        e.preventDefault();
        copy();
      } else if (key === "v" && mod) {
        e.preventDefault();
        paste();
      }

      // Undo (Ctrl+Z)
      else if (key === "z" && mod && !shiftKey) {
        e.preventDefault();
        handleUndo();
      }

      // Redo (Ctrl+Y or Ctrl+Shift+Z)
      else if ((key === "y" && mod) || (key === "z" && mod && shiftKey)) {
        e.preventDefault();
        handleRedo();
      }

      // Delete
      else if (key === "Delete" || key === "Backspace") {
        e.preventDefault();
        deleteSelectedCells();
      }

      // Enter edit mode
      else if (key === "Enter" || key === "F2") {
        e.preventDefault();
        if (selectionRef.current) {
          startEditing(selectionRef.current.start.row, selectionRef.current.start.col);
        }
      }

      // Insert row (Ctrl+Shift++ or Ctrl+Shift+=)
      else if ((key === "+" || key === "=") && mod && shiftKey) {
        e.preventDefault();
        handleInsertRow();
      }

      // Delete rows (Ctrl+-)
      else if (key === "-" && mod && !shiftKey) {
        e.preventDefault();
        handleDeleteRows();
      }

      // Type to edit (alphanumeric) - start with typed character, cursor at end
      else if (key.length === 1 && !mod && !e.altKey && selectionRef.current) {
        const col = columns[selectionRef.current.start.col];
        if (col.editable !== false && col.type !== "checkbox" && col.type !== "select") {
          e.preventDefault();
          startEditing(selectionRef.current.start.row, selectionRef.current.start.col, key, false);
        }
      }
    },
    [
      editingCell,
      moveSelection,
      selectAll,
      copy,
      paste,
      deleteSelectedCells,
      handleUndo,
      handleRedo,
      handleInsertRow,
      handleDeleteRows,
      startEditing,
      columns,
      selectionRef,
    ]
  );

  // Get selection border classes
  const getSelectionClasses = useCallback(
    (rowIdx: number, colIdx: number): string[] => {
      const bounds = getSelectionBounds(selection);
      if (!bounds) return [];

      const inSelection =
        rowIdx >= bounds.minRow && rowIdx <= bounds.maxRow && colIdx >= bounds.minCol && colIdx <= bounds.maxCol;

      if (!inSelection) return [];

      const classes: string[] = ["in-selection"];

      if (rowIdx === bounds.minRow) classes.push("selection-top");
      if (rowIdx === bounds.maxRow) classes.push("selection-bottom");
      if (colIdx === bounds.minCol) classes.push("selection-left");
      if (colIdx === bounds.maxCol) classes.push("selection-right");

      return classes;
    },
    [selection]
  );

  // Render cell content or editor
  const renderCell = (rowIdx: number, colIdx: number, value: any, cellWidth?: number) => {
    const column = columns[colIdx];
    const isEditing = editingCell?.row === rowIdx && editingCell?.col === colIdx;
    const row = filteredData[rowIdx];
    const isHotelLocked = getIsLocked(row, column.accessorKey as string, "hotel");
    const isRoomLocked = getIsLocked(row, column.accessorKey as string, "hotel_room");

    // Select type - use Autocomplete for searchable dropdown
    if (column.type === "select") {
      // Get options - support both static array and function
      const rawOptions = typeof column.options === "function" ? column.options(row) : column.options || [];

      // Normalize to IOption[] format
      const selectOptions: IOption[] =
        rawOptions.length > 0 && typeof rawOptions[0] === "string"
          ? (rawOptions as string[]).map((opt) => ({ value: opt, label: opt }))
          : (rawOptions as IOption[]);

      // Find current selected option to display label
      const selectedOption = selectOptions.find((opt) => opt.value === value);

      return (
        <div
          className="cell-select-wrapper"
          onMouseDown={(e) => {
            e.stopPropagation();
            selectCell({ row: rowIdx, col: colIdx });
          }}
        >
          <Autocomplete
            options={selectOptions}
            value={value ?? ""}
            onChange={(newValue) => {
              if (column.editable !== false && !isHotelLocked && !isRoomLocked) {
                handleCellChangeWithHistory(getRowId(row), column.accessorKey, newValue);
              }
              containerRef.current?.focus();
            }}
            disabled={column.editable === false || isHotelLocked || isRoomLocked}
            placeholder="--"
            searchPlaceholder="Search..."
          />
        </div>
      );
    }

    // Checkbox type - always show as checkbox
    if (column.type === "checkbox") {
      return (
        <div className="cell-content checkbox">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => {
              if (column.editable !== false && !isHotelLocked && !isRoomLocked) {
                handleCellChangeWithHistory(getRowId(row), column.accessorKey, e.target.checked);
              }
            }}
            disabled={column.editable === false || isHotelLocked || isRoomLocked}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          />
        </div>
      );
    }

    // DateRange type - show text normally, edit with popover
    if (column.type === "daterange") {
      if (isEditing) {
        return (
          <DateRangeEditor
            value={value ?? ""}
            onSave={(newValue) => {
              handleCellChangeWithHistory(getRowId(row), column.accessorKey, newValue);
            }}
            onClose={() => {
              setEditingCell(null);
              setEditValue("");
              containerRef.current?.focus();
            }}
          />
        );
      }
      // Display as text when not editing
      const displayValue = value?.toString() ?? "";
      return (
        <div className="cell-content" title={displayValue}>
          {displayValue}
        </div>
      );
    }

    // Expandable type - show text normally, edit with popover
    if (column.type === "expandable") {
      if (isEditing) {
        return (
          <ExpandableEditor
            value={value ?? ""}
            onSave={(newValue) => {
              handleCellChangeWithHistory(getRowId(row), column.accessorKey, newValue);
            }}
            onClose={() => {
              setEditingCell(null);
              setEditValue("");
              containerRef.current?.focus();
            }}
            cellWidth={cellWidth || column.width}
          />
        );
      }
      // Display as text when not editing
      const expandableValue = value?.toString() ?? "";
      return (
        <div className="cell-content" title={expandableValue}>
          {expandableValue}
        </div>
      );
    }

    // Editing mode for text/number
    if (isEditing) {
      return (
        <CellEditor
          type={column.type || "text"}
          options={column.options}
          value={editValue}
          onChange={setEditValue}
          onCommit={commitEdit}
          onCancel={cancelEdit}
          onNavigate={navigateAfterEdit}
          selectAll={selectAllOnEdit}
          cellWidth={cellWidth || column.width}
        />
      );
    }

    // Default text display - show eye icon on first column if onViewRow provided
    const textValue = value?.toString() ?? "";
    if (colIdx === 0 && (onViewRow || isHotelLocked)) {
      return (
        <div className="cell-content cell-with-action" title={textValue}>
          <span className="cell-text">{textValue}</span>
          {value && isHotelLocked && <IndicateLocked tooltip="This hotel is linked to datastore" className="size-3!" />}
          {value && onViewRow && (
            <button
              className="cell-view-btn"
              onClick={(e) => {
                e.stopPropagation();
                onViewRow(getRowId(row));
              }}
              title="View details"
            >
              <Eye className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      );
    }
    if (column.id === "room_category" && isRoomLocked) {
      return (
        <div className="cell-content" title={textValue}>
          <span className="cell-text">{textValue}</span>
          {value && isRoomLocked && <IndicateLocked tooltip="This room is linked to datastore" className="size-3!" />}
        </div>
      );
    }
    return (
      <div className="cell-content" title={textValue}>
        {textValue}
      </div>
    );
  };

  const selectedRowCount = getSelectedRowIndices().length;
  const hasSelection = selectedRowCount > 0;

  // Always show toolbar for undo/redo buttons
  const showToolbar = true;

  return (
    <div className="excel-grid-wrapper">
      {/* Toolbar with search and add button */}
      {showToolbar && (
        <div className="excel-grid-toolbar">
          {searchFields && (
            <div className="excel-grid-search">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 text-xs w-96 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              {searchQuery && (
                <span className="text-xs text-muted-foreground">
                  {filteredData.length} of {data.length}
                </span>
              )}
            </div>
          )}
          <div className="excel-grid-toolbar-right">
            <div className="excel-grid-undo-redo">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUndo}
                disabled={!canUndo}
                className="h-8 w-8 p-0"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRedo}
                disabled={!canRedo}
                className="h-8 w-8 p-0"
                title="Redo (Ctrl+Y)"
              >
                <Redo2 className="h-4 w-4" />
              </Button>
            </div>
            {onAddNew && (
              <Button size="sm" onClick={onAddNew} className="h-8 gap-1">
                <Plus className="h-4 w-4" />
                {addNewLabel}
              </Button>
            )}
          </div>
        </div>
      )}
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div ref={containerRef} className="excel-grid-container" tabIndex={0} onKeyDown={handleKeyDown}>
            <table className="excel-grid">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    <th className="row-index">#</th>
                    {headerGroup.headers.map((header, colIdx) => {
                      const col = columns[colIdx];
                      const hasActiveFilter = col && columnFilters[col.id]?.size > 0;
                      return (
                        <th
                          key={header.id}
                          style={{ width: header.getSize(), minWidth: header.column.columnDef.minSize }}
                          className={hasActiveFilter ? "has-filter" : undefined}
                        >
                          <div className="th-content">
                            <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                            {col?.filterable && (
                              <ColumnFilter
                                columnId={col.id}
                                data={data}
                                accessorKey={col.accessorKey}
                                activeFilters={columnFilters[col.id] || new Set()}
                                onFilterChange={handleColumnFilterChange}
                                options={col.type === "select" ? col.options : undefined}
                              />
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row, rowIdx) => (
                  <tr key={row.id}>
                    <td
                      className="row-index group"
                      onClick={() => {
                        if (editingCell) {
                          commitEdit();
                        }
                        selectRow(rowIdx);
                        containerRef.current?.focus();
                      }}
                      onContextMenu={() => {
                        if (editingCell) {
                          commitEdit();
                        }
                        selectRow(rowIdx);
                      }}
                    >
                      <span className="row-index-number">{rowIdx + 1}</span>
                      {(onDuplicateRow || onInsertRow) && (
                        <button
                          className="row-index-copy-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyButtonClick(rowIdx);
                          }}
                          title={onDuplicateRow ? `Duplicate ${rowLabel}` : `Add ${rowLabel}`}
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      )}
                    </td>
                    {row.getVisibleCells().map((cell, colIdx) => {
                      const column = columns[colIdx];
                      const selected = isCellSelected(rowIdx, colIdx);
                      const anchor = isCellAnchor(rowIdx, colIdx);
                      const isEditing = editingCell?.row === rowIdx && editingCell?.col === colIdx;
                      const selectionClasses = getSelectionClasses(rowIdx, colIdx);
                      const isLocked = getIsLocked(row.original, column.accessorKey as string);

                      return (
                        <td
                          key={cell.id}
                          className={cn(
                            (column.editable === false || isLocked) && "readonly",
                            selected && "selected",
                            anchor && "anchor",
                            isEditing && "editing",
                            ...selectionClasses
                          )}
                          style={{
                            width: cell.column.getSize(),
                            minWidth: cell.column.columnDef.minSize,
                          }}
                          onMouseDown={(e) => handleMouseDown(rowIdx, colIdx, e)}
                          onMouseEnter={() => handleMouseEnter(rowIdx, colIdx)}
                          onDoubleClick={() => handleDoubleClick(rowIdx, colIdx)}
                          onContextMenu={() => handleContextMenu(rowIdx, colIdx)}
                        >
                          {renderCell(rowIdx, colIdx, cell.getValue(), cell.column.getSize())}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-64">
          {onInsertRow && !hideContextMenuInsert && (
            <ContextMenuItem onClick={handleInsertRow} disabled={!hasSelection}>
              Add {rowLabel}
              <ContextMenuShortcut>Ctrl+Shift++</ContextMenuShortcut>
            </ContextMenuItem>
          )}
          {onDuplicateRow && (
            <ContextMenuItem onClick={handleDuplicateRow} disabled={!hasSelection}>
              Duplicate {rowLabel}
            </ContextMenuItem>
          )}
          {onDeleteRows && (
            <ContextMenuItem
              onClick={handleDeleteRows}
              disabled={!hasSelection}
              className="text-destructive focus:text-destructive"
            >
              Delete {rowLabel}
              {selectedRowCount > 1 ? "s" : ""}
              <ContextMenuShortcut>Ctrl+-</ContextMenuShortcut>
            </ContextMenuItem>
          )}
          {((onInsertRow && !hideContextMenuInsert) || onDuplicateRow || onDeleteRows) && <ContextMenuSeparator />}
          <ContextMenuItem onClick={copy} disabled={!hasSelection}>
            Copy
            <ContextMenuShortcut>Ctrl+C</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem onClick={paste} disabled={!hasSelection}>
            Paste
            <ContextMenuShortcut>Ctrl+V</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={handleUndo} disabled={!canUndo}>
            Undo
            <ContextMenuShortcut>Ctrl+Z</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem onClick={handleRedo} disabled={!canRedo}>
            Redo
            <ContextMenuShortcut>Ctrl+Y</ContextMenuShortcut>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
}
