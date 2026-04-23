"use client";

import { useState, useEffect, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import SupplierDetailsForm from "@/components/forms/supplier-sections/supplier-details-form";
import { upsertSupplierDetails, getSupplierDetailsById } from "@/data-access/suppliers";
import type { ItemTypes, ISupplierData } from "@/types/suppliers";

interface SupplierQuickEditSheetProps {
  supplierId?: string;
  defaultCategory?: ItemTypes;
  isOpen: boolean;
  onClose: () => void;
  onSave: (supplierId: string, supplierName: string) => void;
}

export default function SupplierQuickEditSheet({
  supplierId,
  defaultCategory,
  isOpen,
  onClose,
  onSave,
}: SupplierQuickEditSheetProps) {
  const [formData, setFormData] = useState<Partial<ISupplierData> & { city_name?: string; country_name?: string }>({});
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setFormData({});
      return;
    }

    if (!supplierId) {
      setFormData({ category: defaultCategory ? [defaultCategory] : [] });
      return;
    }

    let cancelled = false;
    setIsDataLoading(true);
    setFormData({});

    getSupplierDetailsById(supplierId).then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        toast.error("Failed to load supplier data");
        onClose();
        return;
      }
      setFormData(data!);
      setIsDataLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [isOpen, supplierId]);

  const handleNext = async (data: any) => {
    // isSaving is already set true by the button click before form validation runs
    try {
      const result = await upsertSupplierDetails({ ...data, id: supplierId });
      if ("error" in result && result.error) throw new Error(result.error);
      const saved = result.data!;
      toast.success(supplierId ? "Supplier updated" : "Supplier created");
      onSave(saved.supplier_id, data.name);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save supplier");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-3xl flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <SheetTitle>{supplierId ? "Edit Supplier" : "Create Supplier"}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isDataLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <SupplierDetailsForm
              initialData={formData}
              disableDelete={!!supplierId}
              onNext={handleNext}
              onValidationFail={() => setIsSaving(false)}
              formRef={formRef}
            />
          )}
        </div>

        {!isDataLoading && (
          <div className="flex justify-end gap-2 px-6 py-4 border-t shrink-0">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              loading={isSaving}
              disabled={isSaving}
              loadingText="Saving..."
              onClick={() => {
                setIsSaving(true);
                formRef.current?.requestSubmit();
              }}
            >
              Save
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
