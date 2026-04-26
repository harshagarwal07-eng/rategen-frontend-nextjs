"use client";

import { useEffect, useRef } from "react";
import { TourDetail } from "@/types/tours";

interface Tab3SeasonsRatesProps {
  initialData: Partial<TourDetail> | null;
  onDirtyChange?: (isDirty: boolean) => void;
}

export default function Tab3SeasonsRates({ onDirtyChange }: Tab3SeasonsRatesProps) {
  const onDirtyChangeRef = useRef(onDirtyChange);
  onDirtyChangeRef.current = onDirtyChange;

  useEffect(() => {
    return () => {
      onDirtyChangeRef.current?.(false);
    };
  }, []);

  return (
    <div className="mx-auto max-w-2xl py-12 text-center text-muted-foreground">
      <h2 className="text-xl font-semibold text-foreground mb-2">Seasons & Rates</h2>
      <p>Tab 3 coming up.</p>
    </div>
  );
}
