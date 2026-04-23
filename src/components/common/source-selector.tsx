"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, Lock, Pencil, Plus, Trash } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { createSource, deleteSource, fetchSources, updateSource } from "@/data-access/source";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

import { AlertModal } from "../ui/alert-modal";

type SourceOption = {
  label: string;
  value: string;
  isEditable?: boolean;
};

type Props = {
  dmcId: string;
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export default function SourceSelector({ dmcId, value, onChange, placeholder = "Select source..." }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [sources, setSources] = useState<SourceOption[]>([]);
  const [editing, setEditing] = useState<SourceOption | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [createLabel, setCreateLabel] = useState("");

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  const selectedOption = sources.find((s) => s.value === value);

  // Fetch sources
  useEffect(() => {
    const load = async () => {
      const data = await fetchSources(dmcId, debouncedSearch);
      setSources(data);
    };
    load();
  }, [debouncedSearch, dmcId]);

  const handleSelect = (val: string) => {
    onChange(val);
    setOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    setDeleteLoading(true);
    const res = await deleteSource(dmcId, deleteId);

    if (res.error) {
      toast.error(res.error);
    } else {
      setSources((prev) => prev.filter((s) => s.value !== deleteId));
      if (value === deleteId) onChange("");
      toast.success("Source deleted");
    }

    setDeleteLoading(false);
    setDeleteId(null);
  };

  const handleEditSave = async () => {
    if (!editing || !editLabel.trim()) return;

    const res = await updateSource(dmcId, {
      value: editing.value,
      label: editLabel.trim(),
    });

    if (res.error) {
      toast.error(res.error);
      return;
    }

    setSources((prev) => prev.map((s) => (s.value === editing.value ? res.data! : s)));

    if (value === editing.value) onChange(res.data!.value);

    toast.success("Source updated");
    setEditing(null);
    setEditLabel("");
  };

  const handleCreateSave = async () => {
    if (!createLabel.trim()) return;

    const { data, error } = await createSource(dmcId, createLabel.trim());
    if (error) return toast.error(error);

    setSources((prev) => [...prev, data!]);
    onChange(data!.value);
    toast.success("Source created");

    setCreateLabel("");
    setCreating(false);
    setOpen(false);
  };

  const filteredOptions = useMemo(() => {
    return sources.filter((s) => s.label.toLowerCase().includes(debouncedSearch.toLowerCase()));
  }, [debouncedSearch, sources]);

  // Clear editing only when popover is closed AND dialog editing is closed
  useEffect(() => {
    if (!open && !editing) {
      setEditing(null);
      setEditLabel("");
    }
  }, [open, editing]);

  return (
    <>
      <Popover
        open={open || !!editing}
        onOpenChange={(isOpen) => {
          // Only allow Popover to open/close if not editing
          if (!editing) {
            setOpen(isOpen);
          }
        }}
      >
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open || !!editing}
            className={cn("w-full justify-between h-10", !value && "text-muted-foreground")}
          >
            {selectedOption?.label || placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent align="start" className="w-[--radix-popover-trigger-width] min-w-xs p-0">
          <Command shouldFilter={false}>
            <CommandInput placeholder="Search or create source" value={search} onValueChange={setSearch} />
            <CommandList>
              <CommandEmpty>No source found.</CommandEmpty>
              <CommandGroup>
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    onSelect={() => handleSelect(option.value)}
                    className="cursor-pointer justify-between"
                  >
                    <div className="flex gap-2 items-center">
                      {option.label}
                      {!option.isEditable && <Lock className="size-3 text-muted-foreground" />}
                      {value === option.value && <Check className="h-4 w-4 text-primary" />}
                    </div>

                    {option.isEditable && (
                      <div className="flex items-center justify-end w-16 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="hover:border border-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditing(option);
                            setEditLabel(option.label);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5 text-primary" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="hover:border border-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteId(option.value);
                          }}
                        >
                          <Trash className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>

            {/* Always-visible Create New button */}
            <div className="border-t p-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setCreating(true);
                  setCreateLabel(search.trim());
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New
              </Button>
            </div>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Delete confirmation modal */}
      <AlertModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        description="This will permanently delete the source and remove it from all features where it is currently assigned. This action cannot be undone."
      />

      {/* Edit / Create source dialog */}
      <Dialog
        open={!!editing || creating}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setEditing(null);
            setEditLabel("");
            setCreating(false);
            setCreateLabel("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Source" : "Create Source"}</DialogTitle>
          </DialogHeader>

          <Input
            value={editing ? editLabel : createLabel}
            onChange={(e) => (editing ? setEditLabel(e.target.value) : setCreateLabel(e.target.value))}
            placeholder={editing ? "Edit source name" : "Enter source name"}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") editing ? handleEditSave() : handleCreateSave();
            }}
          />

          <DialogFooter className="mt-4">
            <Button
              disabled={editing ? !editLabel.trim() : !createLabel.trim()}
              onClick={editing ? handleEditSave : handleCreateSave}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
