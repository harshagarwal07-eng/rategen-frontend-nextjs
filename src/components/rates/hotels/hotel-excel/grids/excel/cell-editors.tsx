"use client";

import { useEffect, useRef, useCallback } from "react";
import { CellType } from "./types";

interface BaseCellEditorProps {
  value: any;
  onChange: (value: any) => void;
  onCommit: () => void;
  onCancel: () => void;
  onNavigate: (direction: "up" | "down" | "left" | "right") => void;
  selectAll?: boolean; // If true, select all text on mount
}

// Text Editor
interface TextEditorProps extends BaseCellEditorProps {}

export function TextEditor({ value, onChange, onCommit, onCancel, onNavigate, selectAll }: TextEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      if (selectAll) {
        inputRef.current.select();
      } else {
        // Place cursor at end
        const len = inputRef.current.value.length;
        inputRef.current.setSelectionRange(len, len);
      }
    }
  }, [selectAll]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      } else if (e.key === "Enter") {
        onCommit();
        onNavigate("down");
      } else if (e.key === "Tab") {
        e.preventDefault();
        onCommit();
        onNavigate(e.shiftKey ? "left" : "right");
      }
    },
    [onCommit, onCancel, onNavigate]
  );

  return (
    <input
      ref={inputRef}
      type="text"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={onCommit}
      className="cell-editor cell-editor-text"
    />
  );
}

// Number Editor - uses text input to avoid spinners and allow cursor positioning
interface NumberEditorProps extends BaseCellEditorProps {}

export function NumberEditor({ value, onChange, onCommit, onCancel, onNavigate, selectAll }: NumberEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      if (selectAll) {
        inputRef.current.select();
      } else {
        // Place cursor at end
        const len = inputRef.current.value.length;
        inputRef.current.setSelectionRange(len, len);
      }
    }
  }, [selectAll]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      } else if (e.key === "Enter") {
        onCommit();
        onNavigate("down");
      } else if (e.key === "Tab") {
        e.preventDefault();
        onCommit();
        onNavigate(e.shiftKey ? "left" : "right");
      }
    },
    [onCommit, onCancel, onNavigate]
  );

  // Allow only numbers, decimal point, and minus sign
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      // Allow empty, or valid number pattern
      if (val === "" || val === "-" || /^-?\d*\.?\d*$/.test(val)) {
        onChange(val);
      }
    },
    [onChange]
  );

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      value={value ?? ""}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onBlur={onCommit}
      className="cell-editor cell-editor-number"
    />
  );
}

// Select Editor (Dropdown)
interface SelectEditorProps extends BaseCellEditorProps {
  options: string[];
}

export function SelectEditor({ value, onChange, onCommit, onCancel, onNavigate, options }: SelectEditorProps) {
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    selectRef.current?.focus();
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange(e.target.value);
      onCommit();
    },
    [onChange, onCommit]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      } else if (e.key === "Tab") {
        e.preventDefault();
        onCommit();
        onNavigate(e.shiftKey ? "left" : "right");
      }
    },
    [onCommit, onCancel, onNavigate]
  );

  return (
    <select
      ref={selectRef}
      value={value ?? ""}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onBlur={onCommit}
      className="cell-editor cell-editor-select"
    >
      <option value="">-- Select --</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}

// Checkbox Editor
interface CheckboxEditorProps extends BaseCellEditorProps {}

export function CheckboxEditor({ value, onChange, onCommit }: CheckboxEditorProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.checked);
      onCommit();
    },
    [onChange, onCommit]
  );

  return (
    <input
      type="checkbox"
      checked={!!value}
      onChange={handleChange}
      className="cell-editor cell-editor-checkbox"
    />
  );
}

// Factory to get the right editor
interface CellEditorProps extends BaseCellEditorProps {
  type: CellType;
  options?: string[];
  cellWidth?: number;
}

export function CellEditor({ type, options, selectAll, ...props }: CellEditorProps) {
  switch (type) {
    case "number":
      return <NumberEditor {...props} selectAll={selectAll} />;
    case "select":
      return <SelectEditor {...props} options={options || []} />;
    case "checkbox":
      return <CheckboxEditor {...props} />;
    case "text":
    default:
      return <TextEditor {...props} selectAll={selectAll} />;
  }
}
