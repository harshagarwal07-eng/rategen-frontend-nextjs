"use client";

import { ReactNode, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "../../ui/sheet";
import QueryForm from "../../forms/query-form";
import { IQueryForm } from "../../forms/schemas/query-form-schema";
import { IQueryDetails } from "@/types/crm-query";

interface QueryFormSheetProps {
  children: ReactNode;
  initialData?: IQueryDetails | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: (queryId?: string) => void;
}

export default function QueryFormSheet({
  children,
  initialData = null,
  open: controlledOpen,
  onOpenChange,
  onSuccess,
}: QueryFormSheetProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  // Use controlled state if provided, otherwise use internal state
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? onOpenChange || (() => {}) : setInternalOpen;

  // Convert IQueryDetails to IQueryForm format
  const formData: IQueryForm | null = initialData
    ? {
        id: initialData.id,
        traveler_name: initialData.traveler_name,
        nationality: initialData.nationality,
        travel_date: new Date(initialData.travel_date),
        travel_countries: initialData.travel_countries,
        message: initialData.message || "",
        pax_details: initialData.pax_details,
        source: initialData.source,
        ta_id: initialData.ta_id,
        query_type: initialData.query_type,
        services: initialData.services,
        duration: initialData.duration,
      }
    : null;

  const isEditMode = !!initialData;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-screen-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditMode ? "Edit Query" : "Create New Query"}</SheetTitle>
          <SheetDescription>{isEditMode ? "Update query details" : "Start creating a new query"}</SheetDescription>
        </SheetHeader>
        <div className="p-4">
          <QueryForm
            initialData={formData}
            onSuccess={(queryId) => {
              setOpen(false);
              onSuccess?.(queryId);
            }}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
