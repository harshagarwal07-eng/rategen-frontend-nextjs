"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { clearModifiers, upsertModifiers } from "@/data-access/markup";
import type { ModifierType, UpsertModifiersInput } from "@/types/markup";
import { markupKeys } from "./use-markup-configs";

export function useUpsertModifiers(configId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpsertModifiersInput) => {
      const res = await upsertModifiers(configId, input);
      if (res.error || !res.data) throw new Error(res.error ?? "Failed to save modifiers");
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: markupKeys.config(configId) });
      qc.invalidateQueries({ queryKey: markupKeys.modifiers(configId) });
      toast.success("Modifier saved");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useClearModifiers(configId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (modifierType: ModifierType) => {
      const res = await clearModifiers(configId, modifierType);
      if (res.error) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: markupKeys.config(configId) });
      qc.invalidateQueries({ queryKey: markupKeys.modifiers(configId) });
      toast.success("Modifier cleared");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
