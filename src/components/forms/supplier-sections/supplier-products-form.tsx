"use client";

import { AlertCircle } from "lucide-react";
import { ISupplierTeamMemberData, ItemTypes } from "@/types/suppliers";
import { BorderedCard } from "@/components/ui/bordered-card";
import SupplierAddItemPanel from "./supplier-add-item-panel";
import SupplierItemsTable from "@/components/crm/suppliers/supplier-items-table";
import SupplierLibraryItemsPanel from "./supplier-library-items-panel";
import SupplierLibraryItemsTable from "@/components/crm/suppliers/supplier-library-items-table";

interface SupplierProductsFormProps {
  initialData?: {
    supplierId?: string;
    team_members?: ISupplierTeamMemberData[];
    category?: ItemTypes[];
  };
  onNext: (data?: any) => void;
}

export default function SupplierProductsForm({ initialData }: SupplierProductsFormProps) {
  const supplierId = initialData?.supplierId || "";
  const teamMembers = initialData?.team_members || [];
  const category = initialData?.category || [];

  if (!supplierId) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <AlertCircle className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm font-medium text-muted-foreground">
          Please save the supplier details first
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Go back to the Supplier Details tab, fill in the required fields, and click Save &amp; Next
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BorderedCard title="Add Products" collapsible>
        <SupplierAddItemPanel supplierId={supplierId} teamMembers={teamMembers} category={category} />
      </BorderedCard>

      <BorderedCard title="Add Library Items" collapsible defaultOpen={false}>
        <SupplierLibraryItemsPanel supplierId={supplierId} category={category} />
      </BorderedCard>

      <BorderedCard title="View Products" variant="dashed" collapsible>
        <SupplierItemsTable supplierId={supplierId} teamMembers={teamMembers} />
      </BorderedCard>

      <BorderedCard title="View Library Items" variant="dashed" collapsible defaultOpen={false}>
        <SupplierLibraryItemsTable supplierId={supplierId} />
      </BorderedCard>
    </div>
  );
}
