"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateBundle } from "@/hooks/markup/use-markup-bundles";
import {
  emptyMarkupValue,
} from "./format";
import { MarkupValueEditor } from "./markup-value-editor";
import {
  type MarkupValue,
  SERVICE_LABELS,
  SERVICE_TYPES,
  type ServiceType,
} from "@/types/markup";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function NewBundleModal({ open, onOpenChange }: Props) {
  const router = useRouter();
  const create = useCreateBundle();
  const [name, setName] = useState("");
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [baseMarkup, setBaseMarkup] = useState<MarkupValue>(emptyMarkupValue());

  const reset = () => {
    setName("");
    setServiceTypes([]);
    setBaseMarkup(emptyMarkupValue());
  };

  const toggle = (st: ServiceType) =>
    setServiceTypes((prev) =>
      prev.includes(st) ? prev.filter((x) => x !== st) : [...prev, st],
    );

  const canSubmit = name.trim().length > 0 && serviceTypes.length >= 2;

  const onSubmit = async () => {
    if (!canSubmit) {
      toast.error("Bundle needs a name and at least 2 service types");
      return;
    }
    try {
      const created = await create.mutateAsync({
        name: name.trim(),
        service_types: serviceTypes,
        base_markup: baseMarkup,
      });
      reset();
      onOpenChange(false);
      router.push(`/rates/markup/bundle/${created.id}`);
    } catch {
      // toast handled in hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New bundle</DialogTitle>
          <DialogDescription>
            Bundles set markup for multi-service bookings (e.g., hotel + tour + transfer).
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bundle-name">Name</Label>
            <Input
              id="bundle-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Honeymoon Package"
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Service types (select 2 or more)</Label>
            <div className="grid grid-cols-2 gap-2 rounded-md border p-3">
              {SERVICE_TYPES.map((st) => (
                <label key={st} className="flex items-center gap-2 cursor-pointer text-sm">
                  <Checkbox
                    checked={serviceTypes.includes(st)}
                    onCheckedChange={() => toggle(st)}
                  />
                  <span>{SERVICE_LABELS[st]}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Base markup</Label>
            <MarkupValueEditor value={baseMarkup} onChange={setBaseMarkup} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={create.isPending}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={!canSubmit || create.isPending} loading={create.isPending}>
            Create bundle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
