"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createOverride,
  deleteOverride,
  updateOverride,
} from "@/data-access/markup";
import type { CreateOverrideInput, UpdateOverrideInput } from "@/types/markup";
import { markupKeys } from "./use-markup-configs";

export function useCreateOverride(configId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateOverrideInput) => {
      const res = await createOverride(configId, input);
      if (res.error || !res.data) throw new Error(res.error ?? "Failed to add override");
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: markupKeys.config(configId) });
      toast.success("Override added");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateOverride(configId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { overrideId: string; input: UpdateOverrideInput }) => {
      const res = await updateOverride(configId, args.overrideId, args.input);
      if (res.error || !res.data) throw new Error(res.error ?? "Failed to update override");
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: markupKeys.config(configId) });
      toast.success("Override updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteOverride(configId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (overrideId: string) => {
      const res = await deleteOverride(configId, overrideId);
      if (res.error) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: markupKeys.config(configId) });
      toast.success("Override removed");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
