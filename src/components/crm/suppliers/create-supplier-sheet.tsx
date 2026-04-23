"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import SupplierFullscreenForm from "@/components/forms/supplier-fullscreen-form";
import { useQueryClient } from "@tanstack/react-query";

export default function CreateSupplierSheet() {
  const queryClient = useQueryClient();
  const [supplierFormOpen, setSupplierFormOpen] = useState(false);

  const handleFormSuccess = () => {
    setSupplierFormOpen(false);
    invalidateQueries();
  };

  const invalidateQueries = () => {
    queryClient.invalidateQueries({
      queryKey: ["getAllSuppliersByUser"],
      exact: false,
      type: "active",
    });
  };

  return (
    <>
      <Button size="sm" onClick={() => setSupplierFormOpen(true)}>
        <Plus />
        Add New
      </Button>

      <SupplierFullscreenForm
        isOpen={supplierFormOpen}
        onClose={() => setSupplierFormOpen(false)}
        onSuccess={handleFormSuccess}
      />
    </>
  );
}
