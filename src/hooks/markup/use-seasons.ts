"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createSeason,
  deleteSeason,
  listSeasons,
  updateSeason,
} from "@/data-access/markup";
import type { CreateSeasonInput, Season, UpdateSeasonInput } from "@/types/markup";
import { markupKeys } from "./use-markup-configs";

export function useSeasons() {
  return useQuery({
    queryKey: markupKeys.seasons,
    queryFn: async () => {
      const res = await listSeasons();
      if (res.error) {
        toast.error(res.error);
        return [] as Season[];
      }
      return res.data ?? [];
    },
    staleTime: 60 * 1000,
  });
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: markupKeys.seasons });
  qc.invalidateQueries({ queryKey: markupKeys.configsAll });
  qc.invalidateQueries({ queryKey: ["markup", "configs"] });
}

export function useCreateSeason() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateSeasonInput) => {
      const res = await createSeason(input);
      if (res.error || !res.data) throw new Error(res.error ?? "Failed to create season");
      return res.data;
    },
    onSuccess: () => {
      invalidateAll(qc);
      toast.success("Season created");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateSeason() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; input: UpdateSeasonInput }) => {
      const res = await updateSeason(args.id, args.input);
      if (res.error || !res.data) throw new Error(res.error ?? "Failed to update season");
      return res.data;
    },
    onSuccess: () => {
      invalidateAll(qc);
      toast.success("Season updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteSeason() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await deleteSeason(id);
      if (res.error) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      invalidateAll(qc);
      toast.success("Season deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
