"use client";

import { useState, useCallback, useRef } from "react";

export interface HistoryEntry {
  rowId: string;
  field: string;
  oldValue: any;
  newValue: any;
  timestamp: number;
}

interface UseHistoryOptions {
  maxHistorySize?: number;
}

export function useHistory(options: UseHistoryOptions = {}) {
  const { maxHistorySize = 100 } = options;

  const [undoStack, setUndoStack] = useState<HistoryEntry[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryEntry[]>([]);

  // Track current values for computing oldValue
  const currentValuesRef = useRef<Map<string, any>>(new Map());

  // Get composite key for tracking values
  const getKey = (rowId: string, field: string) => `${rowId}:${field}`;

  // Record a change (call this before applying the change)
  const recordChange = useCallback(
    (rowId: string, field: string, oldValue: any, newValue: any) => {
      const entry: HistoryEntry = {
        rowId,
        field,
        oldValue,
        newValue,
        timestamp: Date.now(),
      };

      setUndoStack((prev) => {
        const newStack = [...prev, entry];
        // Trim if exceeds max size
        if (newStack.length > maxHistorySize) {
          return newStack.slice(-maxHistorySize);
        }
        return newStack;
      });

      // Clear redo stack on new change
      setRedoStack([]);

      // Update current value tracking
      currentValuesRef.current.set(getKey(rowId, field), newValue);
    },
    [maxHistorySize]
  );

  // Initialize value tracking (call when data changes externally)
  const initializeValue = useCallback((rowId: string, field: string, value: any) => {
    currentValuesRef.current.set(getKey(rowId, field), value);
  }, []);

  // Get current tracked value
  const getCurrentValue = useCallback((rowId: string, field: string): any => {
    return currentValuesRef.current.get(getKey(rowId, field));
  }, []);

  // Undo - returns the entry to undo, or null if nothing to undo
  const undo = useCallback((): HistoryEntry | null => {
    let entry: HistoryEntry | null = null;

    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const newStack = [...prev];
      entry = newStack.pop()!;
      return newStack;
    });

    if (entry) {
      setRedoStack((prev) => [...prev, entry!]);
      currentValuesRef.current.set(getKey(entry.rowId, entry.field), entry.oldValue);
    }

    return entry;
  }, []);

  // Redo - returns the entry to redo, or null if nothing to redo
  const redo = useCallback((): HistoryEntry | null => {
    let entry: HistoryEntry | null = null;

    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const newStack = [...prev];
      entry = newStack.pop()!;
      return newStack;
    });

    if (entry) {
      setUndoStack((prev) => [...prev, entry!]);
      currentValuesRef.current.set(getKey(entry.rowId, entry.field), entry.newValue);
    }

    return entry;
  }, []);

  // Check if can undo/redo
  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  // Clear history
  const clearHistory = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
    currentValuesRef.current.clear();
  }, []);

  return {
    recordChange,
    initializeValue,
    getCurrentValue,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
    undoStackSize: undoStack.length,
    redoStackSize: redoStack.length,
  };
}
