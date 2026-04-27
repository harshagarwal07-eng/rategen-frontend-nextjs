"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createBundle,
  deleteBundle,
  getBundle,
  listBundles,
  updateBundle,
} from "@/data-access/markup";
import type {
  CreateBundleInput,
  MarkupBundle,
  UpdateBundleInput,
} from "@/types/markup";
import { markupKeys } from "./use-markup-configs";

export function useMarkupBundles() {
  return useQuery({
    queryKey: markupKeys.bundlesAll,
    queryFn: async () => {
      const res = await listBundles();
      if (res.error) {
        toast.error(res.error);
        return [] as MarkupBundle[];
      }
      return res.data ?? [];
    },
  });
}

export function useMarkupBundle(id: string | undefined) {
  return useQuery({
    queryKey: id ? markupKeys.bundle(id) : ["markup", "bundles", "none"],
    enabled: !!id,
    queryFn: async () => {
      if (!id) return null;
      const res = await getBundle(id);
      if (res.error) {
        toast.error(res.error);
        return null;
      }
      return res.data;
    },
  });
}

export function useCreateBundle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateBundleInput): Promise<MarkupBundle> => {
      const res = await createBundle(input);
      if (res.error || !res.data) throw new Error(res.error ?? "Failed to create bundle");
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: markupKeys.bundlesAll });
      toast.success("Bundle created");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateBundle(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateBundleInput) => {
      const res = await updateBundle(id, input);
      if (res.error || !res.data) throw new Error(res.error ?? "Failed to update bundle");
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: markupKeys.bundle(id) });
      qc.invalidateQueries({ queryKey: markupKeys.bundlesAll });
      toast.success("Bundle saved");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteBundle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await deleteBundle(id);
      if (res.error) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: markupKeys.bundlesAll });
      toast.success("Bundle deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
