"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateBundle } from "@/hooks/markup/use-markup-bundles";
import { type MarkupBundle, SERVICE_LABELS, SERVICE_TYPES, type ServiceType } from "@/types/markup";

type Props = {
  bundle: MarkupBundle;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EditBundleModal({ bundle, open, onOpenChange }: Props) {
  const update = useUpdateBundle(bundle.id);
  const [name, setName] = useState(bundle.name);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>(bundle.service_types);

  useEffect(() => {
    setName(bundle.name);
    setServiceTypes(bundle.service_types);
  }, [bundle]);

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
      await update.mutateAsync({ name: name.trim(), service_types: serviceTypes });
      onOpenChange(false);
    } catch {
      // hook toasts
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit bundle</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bundle-name">Name</Label>
            <Input id="bundle-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Service types</Label>
            <div className="grid grid-cols-2 gap-2 rounded-md border p-3">
              {SERVICE_TYPES.map((st) => (
                <label key={st} className="flex items-center gap-2 cursor-pointer text-sm">
                  <Checkbox checked={serviceTypes.includes(st)} onCheckedChange={() => toggle(st)} />
                  <span>{SERVICE_LABELS[st]}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={update.isPending}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={!canSubmit || update.isPending} loading={update.isPending}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
