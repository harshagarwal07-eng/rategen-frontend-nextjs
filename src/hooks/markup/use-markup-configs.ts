"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createMarkupConfig,
  deleteMarkupConfig,
  getMarkupConfig,
  listMarkupConfigs,
  updateMarkupConfig,
} from "@/data-access/markup";
import type {
  CreateConfigInput,
  MarkupConfig,
  MarkupConfigSummary,
  UpdateConfigInput,
} from "@/types/markup";

export const markupKeys = {
  configsAll: ["markup", "configs"] as const,
  config: (id: string) => ["markup", "configs", id] as const,
  bundlesAll: ["markup", "bundles"] as const,
  bundle: (id: string) => ["markup", "bundles", id] as const,
  marketClusters: ["markup", "market-clusters"] as const,
  seasons: ["markup", "seasons"] as const,
  apiClients: ["markup", "api-clients"] as const,
  modifiers: (configId: string) => ["markup", "modifiers", configId] as const,
  overrides: (configId: string) => ["markup", "overrides", configId] as const,
};

export function useMarkupConfigs() {
  return useQuery({
    queryKey: markupKeys.configsAll,
    queryFn: async () => {
      const res = await listMarkupConfigs();
      if (res.error) {
        toast.error(res.error);
        return [] as MarkupConfigSummary[];
      }
      return res.data ?? [];
    },
  });
}

export function useMarkupConfig(id: string | undefined) {
  return useQuery({
    queryKey: id ? markupKeys.config(id) : ["markup", "configs", "none"],
    enabled: !!id,
    queryFn: async () => {
      if (!id) return null;
      const res = await getMarkupConfig(id);
      if (res.error) {
        toast.error(res.error);
        return null;
      }
      return res.data;
    },
  });
}

export function useCreateMarkupConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateConfigInput): Promise<MarkupConfig> => {
      const res = await createMarkupConfig(input);
      if (res.error || !res.data) throw new Error(res.error ?? "Failed to create config");
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: markupKeys.configsAll });
      toast.success("Markup config created");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateMarkupConfig(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateConfigInput): Promise<MarkupConfig> => {
      const res = await updateMarkupConfig(id, input);
      if (res.error || !res.data) throw new Error(res.error ?? "Failed to update config");
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: markupKeys.config(id) });
      qc.invalidateQueries({ queryKey: markupKeys.configsAll });
      toast.success("Markup saved");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteMarkupConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await deleteMarkupConfig(id);
      if (res.error) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: markupKeys.configsAll });
      toast.success("Markup config deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
