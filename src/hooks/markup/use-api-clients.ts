"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createApiClient,
  deleteApiClient,
  listApiClients,
  updateApiClient,
} from "@/data-access/markup";
import type {
  ApiClient,
  CreateApiClientInput,
  UpdateApiClientInput,
} from "@/types/markup";
import { markupKeys } from "./use-markup-configs";

export function useApiClients() {
  return useQuery({
    queryKey: markupKeys.apiClients,
    queryFn: async () => {
      const res = await listApiClients();
      if (res.error) {
        toast.error(res.error);
        return [] as ApiClient[];
      }
      return res.data ?? [];
    },
    staleTime: 60 * 1000,
  });
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: markupKeys.apiClients });
  qc.invalidateQueries({ queryKey: markupKeys.configsAll });
  qc.invalidateQueries({ queryKey: ["markup", "configs"] });
}

export function useCreateApiClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateApiClientInput) => {
      const res = await createApiClient(input);
      if (res.error || !res.data) throw new Error(res.error ?? "Failed to create API client");
      return res.data;
    },
    onSuccess: () => {
      invalidateAll(qc);
      toast.success("API client created");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateApiClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; input: UpdateApiClientInput }) => {
      const res = await updateApiClient(args.id, args.input);
      if (res.error || !res.data) throw new Error(res.error ?? "Failed to update API client");
      return res.data;
    },
    onSuccess: () => {
      invalidateAll(qc);
      toast.success("API client updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteApiClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await deleteApiClient(id);
      if (res.error) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      invalidateAll(qc);
      toast.success("API client deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
