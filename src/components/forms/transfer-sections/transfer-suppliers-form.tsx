"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BorderedCard } from "@/components/ui/bordered-card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { getSupplierOptions, getSupplierTeamMembers } from "@/data-access/suppliers";
import type { SupplierAssociation, ISupplierTeamMemberData } from "@/types/suppliers";
import SupplierPickerPopover from "@/components/crm/suppliers/supplier-picker/supplier-picker-popover";
import PocMultiSelect from "@/components/crm/suppliers/supplier-picker/poc-multi-select";
import SupplierQuickEditSheet from "@/components/crm/suppliers/supplier-picker/supplier-quick-edit-sheet";
import {
  MultiSelector,
  MultiSelectorContent,
  MultiSelectorInput,
  MultiSelectorItem,
  MultiSelectorList,
  MultiSelectorTrigger,
} from "@/components/ui/multi-select";

interface PackageOption {
  id: string;
  name: string;
}

interface TransferSuppliersFormProps {
  initialData?: {
    id?: string;
    packages?: PackageOption[];
    supplier_associations?: SupplierAssociation[];
  };
  syncedColumns: string[];
  onNext: (data: { associations: SupplierAssociation[] }) => void;
  formRef?: React.RefObject<HTMLFormElement>;
}

type SupplierCard = {
  supplier_id: string;
  poc_ids: string[];
  primary_poc_id?: string;
  package_ids: string[];
  teamMembers: ISupplierTeamMemberData[];
  isLoadingMembers: boolean;
};

export type SupplierOption = { label: string; value: string; inactive?: boolean };

const newCard = (): SupplierCard => ({
  supplier_id: "",
  poc_ids: [],
  primary_poc_id: undefined,
  package_ids: [],
  teamMembers: [],
  isLoadingMembers: false,
});

export default function TransferSuppliersForm({ initialData, onNext, formRef }: TransferSuppliersFormProps) {
  const transferId = initialData?.id;
  const packageOptions: PackageOption[] = (initialData?.packages ?? []).filter((p) => p.id && p.name);

  const [cards, setCards] = useState<SupplierCard[]>([newCard()]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>(() =>
    (initialData?.supplier_associations ?? []).map((a) => ({
      label: a.supplier_name ?? a.supplier_id,
      value: a.supplier_id,
      inactive: a.is_active === false,
    }))
  );
  const [editSheet, setEditSheet] = useState<{ open: boolean; supplierId?: string; cardIndex?: number }>({
    open: false,
  });
  const [createSheet, setCreateSheet] = useState<{ open: boolean; cardIndex?: number }>({ open: false });
  const [isLoadingInitial, setIsLoadingInitial] = useState(!!transferId);

  const internalRef = useRef<HTMLFormElement>(null);
  const resolvedRef = (formRef ?? internalRef) as React.RefObject<HTMLFormElement>;

  const loadSuppliers = async (inactiveLinked?: SupplierAssociation[]) => {
    const data = await getSupplierOptions();
    const active = data as SupplierOption[];

    if (inactiveLinked?.length) {
      const activeIds = new Set(active.map((s) => s.value));
      const inactiveOptions: SupplierOption[] = inactiveLinked
        .filter((a) => !activeIds.has(a.supplier_id))
        .map((a) => ({
          label: a.supplier_name ?? a.supplier_id,
          value: a.supplier_id,
          inactive: true,
        }));
      setSuppliers([...active, ...inactiveOptions]);
    } else {
      setSuppliers(active);
    }
  };

  useEffect(() => {
    const assocs = initialData?.supplier_associations ?? [];
    const inactiveLinked = assocs.filter((a) => a.is_active === false);
    loadSuppliers(inactiveLinked);
  }, []);

  useEffect(() => {
    if (!transferId) return;
    const assocs = initialData?.supplier_associations ?? [];
    if (assocs.length === 0) {
      setCards([newCard()]);
      setIsLoadingInitial(false);
      return;
    }
    const initial: SupplierCard[] = assocs.map((a) => ({
      supplier_id: a.supplier_id,
      poc_ids: a.poc_ids,
      primary_poc_id: a.primary_poc_id,
      package_ids: a.package_ids ?? [],
      teamMembers: [],
      isLoadingMembers: true,
    }));
    setCards(initial);
    setIsLoadingInitial(false);
    initial.forEach((card, idx) => {
      getSupplierTeamMembers(card.supplier_id).then((members) => {
        setCards((prev) =>
          prev.map((c, i) => (i === idx ? { ...c, teamMembers: members, isLoadingMembers: false } : c))
        );
      });
    });
  }, [transferId]);

  const selectSupplier = async (cardIndex: number, supplierId: string) => {
    setCards((prev) =>
      prev.map((c, i) =>
        i === cardIndex
          ? {
              ...c,
              supplier_id: supplierId,
              poc_ids: [],
              primary_poc_id: undefined,
              package_ids: [],
              teamMembers: [],
              isLoadingMembers: true,
            }
          : c
      )
    );
    const members = await getSupplierTeamMembers(supplierId);
    setCards((prev) =>
      prev.map((c, i) => (i === cardIndex ? { ...c, teamMembers: members, isLoadingMembers: false } : c))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferId) {
      toast.error("Please save Transfer Info first before managing suppliers.");
      return;
    }

    // Validate at least one package per supplier
    const filledCards = cards.filter((c) => c.supplier_id);
    for (const card of filledCards) {
      if (card.package_ids.length === 0) {
        toast.error("Please select at least one package for each supplier.");
        return;
      }
    }

    const associations: SupplierAssociation[] = filledCards.map((c) => ({
      supplier_id: c.supplier_id,
      poc_ids: c.poc_ids,
      primary_poc_id: c.primary_poc_id,
      package_ids: c.package_ids,
    }));
    onNext({ associations });
  };

  const existingSupplierIds = cards.map((c) => c.supplier_id).filter(Boolean);

  if (isLoadingInitial) {
    return (
      <div className="space-y-6">
        {[1, 2].map((i) => (
          <div key={i} className="border rounded-lg p-4 space-y-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-4 w-32" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-28 rounded-full" />
              <Skeleton className="h-8 w-28 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!transferId) {
    return (
      <div className="flex items-center justify-center h-60">
        <p className="text-sm text-muted-foreground">Save Transfer Info first to enable supplier linking.</p>
      </div>
    );
  }

  return (
    <>
      <form ref={resolvedRef} onSubmit={handleSubmit}>
        <div className="space-y-6">
          {cards.map((card, index) => {
            const selectedOption = suppliers.find((s) => s.value === card.supplier_id);
            return (
              <div key={index} className="relative">
                <BorderedCard title={cards.length > 1 ? `Supplier ${index + 1}` : "Supplier"}>
                  <div className="space-y-4">
                    <div className="flex items-end gap-2">
                      <div className="flex-1 space-y-1.5">
                        <Label className="text-sm">Select Supplier</Label>
                        <SupplierPickerPopover
                          itemType="transfer"
                          existingSupplierIds={existingSupplierIds.filter((id) => id !== card.supplier_id)}
                          selectedSupplierId={card.supplier_id}
                          selectedSupplierName={selectedOption?.label}
                          selectedInactive={selectedOption?.inactive}
                          suppliers={suppliers}
                          onSelect={(supplierId) => selectSupplier(index, supplierId)}
                          onCreateNew={() => setCreateSheet({ open: true, cardIndex: index })}
                          onEdit={(supplierId) => setEditSheet({ open: true, supplierId, cardIndex: index })}
                        />
                      </div>
                      {cards.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-destructive hover:text-destructive"
                          onClick={() => setCards((prev) => prev.filter((_, i) => i !== index))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {card.supplier_id && (
                      <>
                        <div className="space-y-1.5">
                          <Label className="text-sm">
                            Packages <span className="text-destructive">*</span>
                          </Label>
                          {packageOptions.length === 0 ? (
                            <p className="text-xs text-muted-foreground">
                              No packages found. Add packages in the Packages & Rates step first.
                            </p>
                          ) : (
                            <MultiSelector
                              values={card.package_ids}
                              onValuesChange={(ids) =>
                                setCards((prev) =>
                                  prev.map((c, i) => (i === index ? { ...c, package_ids: ids } : c))
                                )
                              }
                            >
                              <MultiSelectorTrigger data={packageOptions.map((p) => ({ label: p.name, value: p.id }))}>
                                <MultiSelectorInput placeholder="Select packages..." />
                              </MultiSelectorTrigger>
                              <MultiSelectorContent>
                                <MultiSelectorList>
                                  {packageOptions.map((pkg) => (
                                    <MultiSelectorItem key={pkg.id} value={pkg.id}>
                                      {pkg.name}
                                    </MultiSelectorItem>
                                  ))}
                                </MultiSelectorList>
                              </MultiSelectorContent>
                            </MultiSelector>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-sm">Points of Contact</Label>
                          <PocMultiSelect
                            teamMembers={card.teamMembers}
                            value={card.poc_ids}
                            primaryId={card.primary_poc_id}
                            onChange={(ids) =>
                              setCards((prev) => prev.map((c, i) => (i === index ? { ...c, poc_ids: ids } : c)))
                            }
                            onPrimaryChange={(id) =>
                              setCards((prev) =>
                                prev.map((c, i) => (i === index ? { ...c, primary_poc_id: id } : c))
                              )
                            }
                            isLoading={card.isLoadingMembers}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </BorderedCard>
              </div>
            );
          })}

          <div className="flex justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCards((prev) => [...prev, newCard()])}
              className="w-full max-w-md border-dashed border-2"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Supplier
            </Button>
          </div>
        </div>

        <button type="submit" className="hidden" aria-hidden />
      </form>

      <SupplierQuickEditSheet
        defaultCategory="transfer"
        isOpen={createSheet.open}
        onClose={() => setCreateSheet({ open: false })}
        onSave={async (supplierId) => {
          await loadSuppliers();
          if (createSheet.cardIndex !== undefined) {
            selectSupplier(createSheet.cardIndex, supplierId);
          }
          setCreateSheet({ open: false });
        }}
      />

      <SupplierQuickEditSheet
        supplierId={editSheet.supplierId}
        isOpen={editSheet.open}
        onClose={() => setEditSheet({ open: false })}
        onSave={async (supplierId) => {
          await loadSuppliers();
          if (editSheet.cardIndex !== undefined) {
            setCards((prev) => prev.map((c, i) => (i === editSheet.cardIndex ? { ...c, isLoadingMembers: true } : c)));
            const members = await getSupplierTeamMembers(supplierId);
            setCards((prev) =>
              prev.map((c, i) =>
                i === editSheet.cardIndex ? { ...c, teamMembers: members, isLoadingMembers: false } : c
              )
            );
          }
          setEditSheet({ open: false });
        }}
      />
    </>
  );
}
