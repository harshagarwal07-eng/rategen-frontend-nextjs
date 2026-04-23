"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Tag, Plus, Loader2, Trash2 } from "lucide-react";
import {
  useGmailLabels,
  useCreateLabel,
  useDeleteLabel,
  useModifyMessageLabels,
} from "./use-gmail-queries";
import { cn } from "@/lib/utils";

interface LabelPickerProps {
  messageId: string;
  currentLabelIds: string[];
  trigger?: React.ReactNode;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function LabelRow({
  label,
  isActive,
  onToggle,
  onDelete,
  isDeleting,
}: {
  label: { id: string; name: string };
  isActive: boolean;
  onToggle: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  return (
    <CommandItem
      value={label.name}
      onSelect={onToggle}
      className="flex items-center gap-3 py-2.5 cursor-pointer rounded-lg"
    >
      <span
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
          isActive ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/40"
        )}
      >
        {isActive ? (
          <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : null}
      </span>
      <span className="flex-1 text-sm truncate font-medium">{label.name}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0 opacity-60 hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        disabled={isDeleting}
      >
        {isDeleting ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Trash2 className="h-3 w-3" />
        )}
      </Button>
    </CommandItem>
  );
}

function CreateLabelForm({
  onSubmit,
  isPending,
}: {
  onSubmit: (name: string) => void;
  isPending: boolean;
}) {
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit(name.trim());
    setName("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <Input
        autoFocus
        placeholder="New label name…"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="h-8 text-sm flex-1"
      />
      <Button
        type="submit"
        size="sm"
        className="h-8 px-3 text-xs"
        disabled={isPending || !name.trim()}
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          "Create"
        )}
      </Button>
    </form>
  );
}

export function LabelPicker({
  messageId,
  currentLabelIds,
  trigger,
  defaultOpen = false,
  onOpenChange,
}: LabelPickerProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");

  const { data: labels, isLoading } = useGmailLabels();
  const createMutation = useCreateLabel();
  const deleteMutation = useDeleteLabel();
  const modifyMutation = useModifyMessageLabels();

  const handleOpen = (v: boolean) => {
    setOpen(v);
    onOpenChange?.(v);
    if (!v) {
      setShowCreate(false);
      setSearch("");
    }
  };

  const handleToggleLabel = (labelId: string) => {
    const hasLabel = currentLabelIds.includes(labelId);
    modifyMutation.mutate({
      messageId,
      labelId,
      action: hasLabel ? "remove" : "add",
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm" className="gap-1.5 h-7 text-xs">
            <Tag className="h-3.5 w-3.5" />
            Label
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Manage Labels</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {isLoading ? (
            <div className="space-y-2 py-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <Command className="rounded-lg border">
              <CommandInput
                placeholder="Search labels by name…"
                className="h-9 text-sm"
                value={search}
                onValueChange={setSearch}
              />
              <CommandList className="max-h-56">
                <CommandEmpty className="py-6 text-center">
                  <Tag className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">
                    {search ? "No matching labels" : "No custom labels yet"}
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Create a label below to organize emails
                  </p>
                </CommandEmpty>
                <CommandGroup className="p-1">
                  {(labels ?? []).map((label) => (
                    <LabelRow
                      key={label.id}
                      label={label}
                      isActive={currentLabelIds.includes(label.id)}
                      onToggle={() => handleToggleLabel(label.id)}
                      onDelete={() => deleteMutation.mutate(label.id)}
                      isDeleting={deleteMutation.isPending}
                    />
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          )}

          <div className="border-t pt-3">
            {showCreate ? (
              <CreateLabelForm
                onSubmit={(name) => {
                  createMutation.mutate(name, {
                    onSuccess: () => setShowCreate(false),
                  });
                }}
                isPending={createMutation.isPending}
              />
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full h-8 text-xs gap-1.5"
                onClick={() => setShowCreate(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                Create new label
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
