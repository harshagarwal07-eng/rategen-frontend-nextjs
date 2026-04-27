"use client";

import { useState, useEffect, useRef } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import http from "@/lib/api";

interface GeoNode {
  id: string;
  name: string;
  type: string;
  parent_id: string | null;
  ancestors?: Array<{ id: string; name: string; type: string }>;
}

function isErrorResponse(r: unknown): boolean {
  return (
    !!r &&
    typeof r === "object" &&
    !Array.isArray(r) &&
    "error" in r &&
    !!(r as { error?: unknown }).error
  );
}

interface GeoNodePickerProps {
  value: string | null;
  onChange: (id: string | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const DEBOUNCE_MS = 200;

export default function GeoNodePicker({
  value,
  onChange,
  placeholder = "Select location...",
  className,
  disabled = false,
}: GeoNodePickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<GeoNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<GeoNode | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadSelectedNode = async () => {
      if (!value) {
        setSelectedNode(null);
        return;
      }
      try {
        const res = await http.get<GeoNode>(`/api/geo/nodes/${value}`);
        if (cancelled || isErrorResponse(res)) return;
        setSelectedNode(res as GeoNode);
      } catch (e) {
        console.error("Failed to load selected node:", e);
      }
    };
    loadSelectedNode();
    return () => {
      cancelled = true;
    };
  }, [value]);

  const performSearch = async (query: string) => {
    if (query.length === 0) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ q: query });
      const res = await http.get<GeoNode[]>(
        `/api/geo/nodes/search?${params}`,
      );
      if (isErrorResponse(res)) {
        setResults([]);
      } else {
        setResults((res as GeoNode[]) ?? []);
      }
    } catch (e) {
      console.error("Search failed:", e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      performSearch(val);
    }, DEBOUNCE_MS);
  };

  const handleSelect = (node: GeoNode) => {
    setSelectedNode(node);
    onChange(node.id);
    setOpen(false);
    setSearch("");
    setResults([]);
  };

  const handleClear = () => {
    setSelectedNode(null);
    onChange(null);
    setSearch("");
    setResults([]);
  };

  const displayName = selectedNode
    ? `${selectedNode.name}${selectedNode.ancestors?.length ? ` • ${selectedNode.ancestors.map((a) => a.name).join(" • ")}` : ""}`
    : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          disabled={disabled}
          className={cn("w-full justify-between", className)}
        >
          <span className="truncate text-sm">{displayName}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search locations..."
            value={search}
            onValueChange={handleSearchChange}
          />
          <CommandList>
            {loading && (
              <CommandEmpty>Searching...</CommandEmpty>
            )}
            {!loading && results.length === 0 && search.length > 0 && (
              <CommandEmpty>No locations found</CommandEmpty>
            )}
            {!loading && search.length === 0 && !selectedNode && (
              <CommandEmpty>Start typing to search</CommandEmpty>
            )}
            {!loading && results.length > 0 && (
              <CommandGroup>
                {results.map((node) => (
                  <CommandItem
                    key={node.id}
                    value={node.id}
                    onSelect={() => handleSelect(node)}
                  >
                    <span className="flex-1">
                      {node.name}
                      {node.ancestors?.length ? (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {node.ancestors.map((a) => a.name).join(" • ")}
                        </span>
                      ) : null}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
