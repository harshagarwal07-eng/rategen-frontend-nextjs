"use client";

import { useMutation } from "@tanstack/react-query";
import { calculateMarkup } from "@/data-access/markup";
import type { CalculateMarkupInput, MarkupResult } from "@/types/markup";

export function useMarkupCalculator() {
  return useMutation({
    mutationFn: async (input: CalculateMarkupInput): Promise<MarkupResult> => {
      const res = await calculateMarkup(input);
      if (res.error || !res.data) throw new Error(res.error ?? "Calculation failed");
      return res.data;
    },
  });
}
