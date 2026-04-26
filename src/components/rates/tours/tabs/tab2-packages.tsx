"use client";

import { useEffect, useRef } from "react";
import { TourDetail } from "@/types/tours";

interface Tab2PackagesProps {
  initialData: Partial<TourDetail> | null;
  countryId: string | null;
  onNext: () => void | Promise<void>;
  setIsLoading?: (loading: boolean) => void;
  formRef?: React.RefObject<HTMLFormElement>;
  onDirtyChange?: (isDirty: boolean) => void;
}

export default function Tab2Packages({ onDirtyChange }: Tab2PackagesProps) {
  const onDirtyChangeRef = useRef(onDirtyChange);
  onDirtyChangeRef.current = onDirtyChange;

  useEffect(() => {
    return () => {
      onDirtyChangeRef.current?.(false);
    };
  }, []);

  return (
    <div className="mx-auto max-w-2xl py-12 text-center text-muted-foreground">
      <h2 className="text-xl font-semibold text-foreground mb-2">Packages</h2>
      <p>Tab 2 coming up.</p>
    </div>
  );
}
