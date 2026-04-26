"use client";

import { useEffect, useRef } from "react";
import { TourDetail } from "@/types/tours";

interface Tab4AddonsProps {
  initialData: Partial<TourDetail> | null;
  setIsLoading?: (loading: boolean) => void;
  formRef?: React.RefObject<HTMLFormElement>;
  onDirtyChange?: (isDirty: boolean) => void;
  onSaved?: () => void;
}

export default function Tab4Addons({ onDirtyChange }: Tab4AddonsProps) {
  const onDirtyChangeRef = useRef(onDirtyChange);
  onDirtyChangeRef.current = onDirtyChange;

  useEffect(() => {
    return () => {
      onDirtyChangeRef.current?.(false);
    };
  }, []);

  return (
    <div className="mx-auto max-w-2xl py-12 text-center text-muted-foreground">
      <h2 className="text-xl font-semibold text-foreground mb-2">Add-ons</h2>
      <p>Tab 4 coming up.</p>
    </div>
  );
}
