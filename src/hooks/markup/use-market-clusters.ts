"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createMarketCluster,
  deleteMarketCluster,
  listMarketClusters,
  updateMarketCluster,
} from "@/data-access/markup";
import type {
  CreateMarketClusterInput,
  MarketCluster,
  UpdateMarketClusterInput,
} from "@/types/markup";
import { markupKeys } from "./use-markup-configs";

export function useMarketClusters() {
  return useQuery({
    queryKey: markupKeys.marketClusters,
    queryFn: async () => {
      const res = await listMarketClusters();
      if (res.error) {
        toast.error(res.error);
        return [] as MarketCluster[];
      }
      return res.data ?? [];
    },
    staleTime: 60 * 1000,
  });
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: markupKeys.marketClusters });
  // Auto-add-0% may have appended new modifier rows on existing configs.
  qc.invalidateQueries({ queryKey: markupKeys.configsAll });
  qc.invalidateQueries({ queryKey: ["markup", "configs"] });
}

export function useCreateMarketCluster() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateMarketClusterInput) => {
      const res = await createMarketCluster(input);
      if (res.error || !res.data) throw new Error(res.error ?? "Failed to create cluster");
      return res.data;
    },
    onSuccess: () => {
      invalidateAll(qc);
      toast.success("Market cluster created");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateMarketCluster() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; input: UpdateMarketClusterInput }) => {
      const res = await updateMarketCluster(args.id, args.input);
      if (res.error || !res.data) throw new Error(res.error ?? "Failed to update cluster");
      return res.data;
    },
    onSuccess: () => {
      invalidateAll(qc);
      toast.success("Market cluster updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteMarketCluster() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await deleteMarketCluster(id);
      if (res.error) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      invalidateAll(qc);
      toast.success("Market cluster deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
