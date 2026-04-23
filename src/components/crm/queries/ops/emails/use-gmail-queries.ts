"use client";

import { useState, useCallback, useMemo } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
  keepPreviousData,
  type InfiniteData,
} from "@tanstack/react-query";
import {
  getGmailConnection,
  listGmailMessages,
  listFilteredGmailMessages,
  getGmailMessage,
  sendGmailMessage,
  createGmailDraft,
  updateGmailDraft,
  deleteGmailDraft,
  getGmailDraftIdForMessage,
  trashGmailMessage,
  markGmailMessageRead,
  markGmailMessageUnread,
  toggleStarGmailMessage,
  archiveGmailMessage,
  listGmailLabels,
  createGmailLabel,
  deleteGmailLabel,
  addLabelToGmailMessage,
  removeLabelFromGmailMessage,
  applyQueryLabelToMessage,
  listGmailAliases,
} from "@/data-access/gmail";
import { getActiveQueryIds, searchQueries } from "@/data-access/crm-queries";
import { saveEmailQueryAssociation, getDraftGenerationStatus } from "@/data-access/email-metadata";
import type { DraftGenerationStatus } from "@/data-access/email-metadata";
import type {
  GmailMessageListItem,
  GmailParsedMessage,
  GmailSendAsAlias,
} from "@/data-access/gmail";
import type { SendMessageRequest } from "@/lib/gmail/types";
import type { FilterConfig, PipelineResult } from "@/lib/gmail/filters";
import { listPresets } from "@/lib/gmail/filters";
import { gmailKeys } from "./query-keys";
import { toast } from "sonner";

export type EmailTab = "all" | "drafts" | "archive" | "sent" | "starred" | "trash";

export class GmailTokenRevokedError extends Error {
  constructor() {
    super("Gmail connection was revoked. Please reconnect your account.");
    this.name = "GmailTokenRevokedError";
  }
}

export const TAB_CONFIG: Record<
  EmailTab,
  { labelIds?: string[]; query?: string; label: string }
> = {
  all: { labelIds: ["INBOX"], label: "Inbox" },
  starred: { labelIds: ["STARRED"], label: "Starred" },
  sent: { labelIds: ["SENT"], label: "Sent" },
  drafts: { query: "in:draft", label: "Drafts" },
  archive: { query: "in:archive", label: "Archive" },
  trash: { query: "in:trash", label: "Trash" },
};

const PAGE_SIZE = 20;

type MessageListData = InfiniteData<{
  messages: GmailMessageListItem[];
  nextPageToken?: string;
  resultSizeEstimate?: number;
} | undefined>;

/**
 * Returns true if a cache key belongs to the given queryId scope.
 * - filteredMessageList keys: ["gmail","messages","filtered", hash] — hash encodes queryId
 * - messageList keys: ["gmail","messages","list", { queryId, ... }]
 * When queryId is undefined (standalone inbox), only touch keys with no queryId.
 */
function isScopeMatch(queryKey: readonly unknown[], queryId: string | undefined): boolean {
  const key = queryKey as unknown[];
  // messageList: ["gmail","messages","list", { queryId, ... }]
  if (key[2] === "list") {
    const filters = key[3] as { queryId?: string } | undefined;
    return (filters?.queryId ?? undefined) === queryId;
  }
  // filteredMessageList: ["gmail","messages","filtered", queryId|"__none__", hash]
  if (key[2] === "filtered") {
    const scopedQueryId = key[3] === "__none__" ? undefined : (key[3] as string);
    return scopedQueryId === queryId;
  }
  return false;
}

async function performOptimisticLabelUpdate(
  qc: ReturnType<typeof useQueryClient>,
  messageId: string,
  updateFn: (labels: string[]) => string[],
  queryId?: string
) {
  await qc.cancelQueries({ queryKey: gmailKeys.messages() });
  await qc.cancelQueries({ queryKey: gmailKeys.messageDetail(messageId) });

  const listQueries = qc.getQueriesData<MessageListData>({
    queryKey: gmailKeys.messages(),
  });
  const listSnapshots = listQueries.map(([key, data]) => ({ queryKey: key, data }));

  for (const [queryKey, data] of listQueries) {
    if (!data?.pages) continue;
    // Only update cache entries that belong to the current query scope
    if (!isScopeMatch(queryKey, queryId)) continue;
    qc.setQueryData<MessageListData>(queryKey, {
      ...data,
      pages: data.pages.map((page) => {
        if (!page?.messages) return page;
        return {
          ...page,
          messages: page.messages.map((msg) => {
            if (msg.id !== messageId) return msg;
            return { ...msg, labelIds: updateFn(msg.labelIds ?? []) };
          }),
        };
      }),
      pageParams: data.pageParams,
    });
  }

  const detailKey = gmailKeys.messageDetail(messageId);
  const previousDetail = qc.getQueryData<GmailParsedMessage>(detailKey);

  if (previousDetail) {
    qc.setQueryData<GmailParsedMessage>(detailKey, {
      ...previousDetail,
      labelIds: updateFn(previousDetail.labelIds ?? []),
    });
  }

  return { listSnapshots, previousDetail };
}

function rollbackLabelUpdate(
  qc: ReturnType<typeof useQueryClient>,
  messageId: string,
  context?: {
    listSnapshots: { queryKey: readonly unknown[]; data: MessageListData | undefined }[];
    previousDetail: GmailParsedMessage | undefined;
  }
) {
  if (context?.listSnapshots) {
    for (const { queryKey, data } of context.listSnapshots) {
      qc.setQueryData(queryKey, data);
    }
  }
  if (context?.previousDetail) {
    qc.setQueryData(gmailKeys.messageDetail(messageId), context.previousDetail);
  }
}

export function useGmailConnection() {
  const qc = useQueryClient();
  return useQuery({
    queryKey: gmailKeys.connection(),
    queryFn: async () => {
      const data = await getGmailConnection();
      // When connection state changes (reconnected / scope changed), invalidate alias cache
      // so the next render fetches fresh aliases instead of serving stale ones.
      qc.invalidateQueries({ queryKey: gmailKeys.aliases() });
      return data;
    },
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    select: (data) => {
      const row = data?.data && "connected" in data.data && data.data.connected ? data.data : null;
      return {
        connected: !!row,
        email: row ? row.gmail_address : null,
        needsReauth: row ? (row.needs_reauth ?? false) : false,
        missingAliasScope: row ? (row.missing_alias_scope ?? false) : false,
      };
    },
  });
}

export function useGmailAliases() {
  return useQuery({
    queryKey: gmailKeys.aliases(),
    queryFn: async (): Promise<GmailSendAsAlias[]> => {
      const result = await listGmailAliases();
      if ("error" in result) throw new Error(result.error);
      return result.data;
    },
    staleTime: 2 * 60 * 1000,   // 2 min — aliases can change after reconnect
    gcTime: 10 * 60 * 1000,     // keep in memory 10 min to avoid flash on remount
    refetchOnWindowFocus: true,  // pick up changes when user returns from Gmail settings
  });
}

export type { GmailSendAsAlias, DraftGenerationStatus };

export function useDraftGenerationStatus(queryUuid: string | undefined) {
  return useQuery({
    queryKey: gmailKeys.draftStatus(queryUuid ?? ""),
    queryFn: async (): Promise<DraftGenerationStatus> => {
      const result = await getDraftGenerationStatus(queryUuid!);
      if ("error" in result) throw new Error(result.error);
      return result.data;
    },
    enabled: !!queryUuid,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });
}

export function useGmailMessages(tab: EmailTab, search: string, enabled: boolean, queryId?: string) {
  const config = TAB_CONFIG[tab];
  const searchTrimmed = search.trim();
  const combinedQuery = [config.query, searchTrimmed].filter(Boolean).join(" ");
  const qc = useQueryClient();

  return useInfiniteQuery({
    queryKey: gmailKeys.messageList({
      tab,
      labelIds: config.labelIds,
      query: config.query,
      search: searchTrimmed,
      queryId,
    }),
    queryFn: async ({ pageParam }) => {
      const result = await listGmailMessages({
        labelIds: config.labelIds,
        query: combinedQuery || undefined,
        maxResults: PAGE_SIZE,
        pageToken: pageParam || undefined,
      });
      if ("error" in result) {
        if ("reason" in result && result.reason === "tokenRevoked") {
          qc.invalidateQueries({ queryKey: gmailKeys.connection() });
          throw new GmailTokenRevokedError();
        }
        throw new Error(result.error);
      }
      return result.data;
    },
    initialPageParam: "" as string,
    getNextPageParam: (lastPage) => lastPage?.nextPageToken ?? undefined,
    enabled,
    staleTime: 30_000,
    gcTime: 60_000,  // drop unused filter-key caches after 1 min (was 5 min — caused stale flicker on alias switch)
    refetchOnWindowFocus: false,
    retry: (_, err) => !(err instanceof GmailTokenRevokedError),
  });
}

export function flattenMessages(
  data: ReturnType<typeof useGmailMessages>["data"]
): GmailMessageListItem[] {
  if (!data?.pages) return [];
  return data.pages.flatMap((page) => page?.messages ?? []);
}

export function useGmailMessageDetail(id: string | null) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: gmailKeys.messageDetail(id ?? ""),
    queryFn: async () => {
      const result = await getGmailMessage(id!);
      if ("error" in result) {
        if ("reason" in result && result.reason === "tokenRevoked") {
          qc.invalidateQueries({ queryKey: gmailKeys.connection() });
          throw new GmailTokenRevokedError();
        }
        throw new Error(result.error);
      }
      return result.data;
    },
    enabled: !!id,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    retry: (_, err) => !(err instanceof GmailTokenRevokedError),
  });
}

export type SendEmailVariables = SendMessageRequest & {
  /** Display ID of the query to label the message with after send (e.g. "AAB000001") */
  queryDisplayId?: string;
  /** UUID of the query for DB association */
  queryUuid?: string;
  dmcId?: string;
};

export function useSendEmail(onSent?: () => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (variables: SendEmailVariables) => {
      const { queryDisplayId: _qd, queryUuid: _qu, dmcId: _d, ...request } = variables;
      const result = await sendGmailMessage(request);
      if ("error" in result) throw new Error(result.error);
      return result.data;
    },

    onMutate: async (variables) => {
      // Cancel in-flight fetches on the messages tree so they don't overwrite us.
      await qc.cancelQueries({ queryKey: gmailKeys.messages() });

      // Snapshot every message list page for rollback.
      const listQueries = qc.getQueriesData<MessageListData>({
        queryKey: gmailKeys.messages(),
      });
      const snapshots = listQueries.map(([key, data]) => ({ queryKey: key, data }));

      // Build an optimistic sent-message stub to prepend to the list.
      const optimisticId = `optimistic-send-${Date.now()}`;
      const optimisticEntry: GmailMessageListItem = {
        id: optimisticId,
        threadId: optimisticId,
        subject: variables.subject ?? "(no subject)",
        from: "me",
        to: variables.to,
        date: new Date().toISOString(),
        snippet: typeof variables.body === "string" ? variables.body.slice(0, 80) : "",
        labelIds: ["SENT"],
      };

      // Prepend the stub to every page-1 of every cache entry that covers SENT.
      for (const [queryKey, data] of listQueries) {
        if (!data?.pages?.length) continue;
        const key = queryKey as unknown[];
        const filters = key[3] as { labelIds?: string[] } | undefined;
        const isSentList =
          filters?.labelIds?.includes("SENT") || !filters?.labelIds;
        if (!isSentList) continue;

        qc.setQueryData<MessageListData>(queryKey, {
          ...data,
          pages: data.pages.map((page, i) => {
            if (i !== 0 || !page?.messages) return page;
            return { ...page, messages: [optimisticEntry, ...page.messages] };
          }),
          pageParams: data.pageParams,
        });
      }

      // Close the compose UI immediately (optimistic)
      onSent?.();
      toast.success("Sending\u2026");

      return { snapshots, optimisticId };
    },

    onError: (err: Error, _vars, context) => {
      // Roll back the optimistic entry.
      if (context?.snapshots) {
        for (const { queryKey, data } of context.snapshots) {
          qc.setQueryData(queryKey, data);
        }
      }
      toast.error(err.message ?? "Failed to send email");
    },

    onSuccess: (data, variables, context) => {
      if (!context) return;

      // Replace the optimistic stub with the real message ID in the cache.
      const listQueries = qc.getQueriesData<MessageListData>({
        queryKey: gmailKeys.messages(),
      });
      for (const [queryKey, cacheData] of listQueries) {
        if (!cacheData?.pages?.length) continue;
        qc.setQueryData<MessageListData>(queryKey, {
          ...cacheData,
          pages: cacheData.pages.map((page) => {
            if (!page?.messages) return page;
            return {
              ...page,
              messages: page.messages.map((msg) =>
                msg.id === context.optimisticId
                  ? { ...msg, id: data.id, threadId: data.threadId }
                  : msg
              ),
            };
          }),
          pageParams: cacheData.pageParams,
        });
      }

      // Apply query label using the display ID captured at send-time (survives unmount)
      const { queryDisplayId, queryUuid, dmcId } = variables;
      if (queryDisplayId) {
        applyQueryLabelToMessage(data.id, queryDisplayId).catch(() => {});
        if (dmcId && queryUuid) {
          saveEmailQueryAssociation({
            gmailMessageId: data.id,
            gmailThreadId: data.threadId ?? "",
            queryId: queryUuid,
            dmcId,
          }).catch(() => {});
        }
      }
    },

    onSettled: () => {
      // Always sync from server to replace any stub with ground truth.
      qc.invalidateQueries({ queryKey: gmailKeys.messages() });
    },
  });
}

export type SaveDraftResult = { draftId: string; messageId: string; threadId: string };

export function useSaveDraft(onSuccess?: (result: SaveDraftResult) => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      draftId,
      request,
    }: {
      draftId?: string;
      request: SendMessageRequest;
    }): Promise<SaveDraftResult> => {
      if (draftId) {
        const result = await updateGmailDraft(draftId, request);
        if ("error" in result) throw new Error(result.error);
        return {
          draftId: result.data.id,
          messageId: result.data.message.id,
          threadId: result.data.message.threadId ?? "",
        };
      }
      const result = await createGmailDraft(request);
      if ("error" in result) throw new Error(result.error);
      return {
        draftId: result.data.id,
        messageId: result.data.message.id,
        threadId: result.data.message.threadId ?? "",
      };
    },

    onMutate: async ({ draftId, request }) => {
      await qc.cancelQueries({ queryKey: gmailKeys.messages() });

      const listQueries = qc.getQueriesData<MessageListData>({
        queryKey: gmailKeys.messages(),
      });
      const snapshots = listQueries.map(([key, data]) => ({ queryKey: key, data }));

      const optimisticId = draftId ?? `optimistic-draft-${Date.now()}`;
      const optimisticEntry: GmailMessageListItem = {
        id: optimisticId,
        threadId: optimisticId,
        subject: request.subject ?? "(no subject)",
        from: "me",
        to: request.to,
        date: new Date().toISOString(),
        snippet: typeof request.body === "string" ? request.body.slice(0, 80) : "",
        labelIds: ["DRAFT"],
      };

      for (const [queryKey, data] of listQueries) {
        if (!data?.pages?.length) continue;
        const key = queryKey as unknown[];
        const filters = key[3] as { query?: string } | undefined;
        // Target draft lists (query includes "in:draft") or broad lists.
        const isDraftList =
          typeof filters?.query === "string" && filters.query.includes("in:draft");
        if (!isDraftList) continue;

        // If updating an existing draft, replace it; otherwise prepend.
        if (draftId) {
          qc.setQueryData<MessageListData>(queryKey, {
            ...data,
            pages: data.pages.map((page) => {
              if (!page?.messages) return page;
              return {
                ...page,
                messages: page.messages.map((msg) =>
                  msg.id === draftId ? optimisticEntry : msg
                ),
              };
            }),
            pageParams: data.pageParams,
          });
        } else {
          qc.setQueryData<MessageListData>(queryKey, {
            ...data,
            pages: data.pages.map((page, i) => {
              if (i !== 0 || !page?.messages) return page;
              return { ...page, messages: [optimisticEntry, ...page.messages] };
            }),
            pageParams: data.pageParams,
          });
        }
      }

      // Dismiss compose window immediately.
      toast.success(draftId ? "Draft updated" : "Draft saved");

      return { snapshots, optimisticId };
    },

    onError: (err: Error, _vars, context) => {
      if (context?.snapshots) {
        for (const { queryKey, data } of context.snapshots) {
          qc.setQueryData(queryKey, data);
        }
      }
      toast.error(err.message ?? "Failed to save draft");
    },

    onSuccess: (data, _vars, context) => {
      if (!context) return;
      // Replace optimistic stub with real IDs from the API.
      const listQueries = qc.getQueriesData<MessageListData>({
        queryKey: gmailKeys.messages(),
      });
      for (const [queryKey, cacheData] of listQueries) {
        if (!cacheData?.pages?.length) continue;
        qc.setQueryData<MessageListData>(queryKey, {
          ...cacheData,
          pages: cacheData.pages.map((page) => {
            if (!page?.messages) return page;
            return {
              ...page,
              messages: page.messages.map((msg) =>
                msg.id === context.optimisticId
                  ? { ...msg, id: data.messageId, threadId: data.threadId }
                  : msg
              ),
            };
          }),
          pageParams: cacheData.pageParams,
        });
      }
      // Fire the caller's onSuccess AFTER the stub swap so IDs are real.
      onSuccess?.(data);
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: gmailKeys.messages() });
    },
  });
}


export function useTrashEmail(onSuccess?: () => void) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await trashGmailMessage(id);
      if ("error" in result) throw new Error(result.error);
      return result.data;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: gmailKeys.messages() });
      await qc.cancelQueries({ queryKey: gmailKeys.messageDetail(id) });

      const listQueries = qc.getQueriesData<MessageListData>({ queryKey: gmailKeys.messages() });
      const snapshots = listQueries.map(([key, data]) => ({ queryKey: key, data }));
      const previousDetail = qc.getQueryData<GmailParsedMessage>(gmailKeys.messageDetail(id));

      for (const [queryKey, data] of listQueries) {
        if (!data?.pages) continue;
        qc.setQueryData<MessageListData>(queryKey, {
          ...data,
          pages: data.pages.map((page) => {
            if (!page?.messages) return page;
            return { ...page, messages: page.messages.filter((msg) => msg.id !== id) };
          }),
          pageParams: data.pageParams,
        });
      }

      return { snapshots, previousDetail };
    },
    onError: (_err, id, context) => {
      if (context?.snapshots) {
        for (const { queryKey, data } of context.snapshots) {
          qc.setQueryData(queryKey, data);
        }
      }
      if (context?.previousDetail) {
        qc.setQueryData(gmailKeys.messageDetail(id), context.previousDetail);
      }
      toast.error("Failed to move to trash");
    },
    onSuccess: (_data, id) => {
      qc.removeQueries({ queryKey: gmailKeys.messageDetail(id) });
      onSuccess?.();
      toast.success("Moved to trash");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: gmailKeys.messages() });
    },
  });
}

export function useArchiveEmail(onSuccess?: () => void, queryId?: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await archiveGmailMessage(id);
      if ("error" in result) throw new Error(result.error);
      return result.data;
    },
    onMutate: async (id) => {
      return performOptimisticLabelUpdate(qc, id, (labels) =>
        labels.filter((l) => l !== "INBOX"),
        queryId
      );
    },
    onError: (_err, id, context) => {
      rollbackLabelUpdate(qc, id, context);
      toast.error("Failed to archive email");
    },
    onSuccess: (_data, _id) => {
      toast.success("Email archived");
      onSuccess?.();
    },
    onSettled: (_data, _err, id) => {
      qc.invalidateQueries({ queryKey: gmailKeys.messages() });
      qc.invalidateQueries({ queryKey: gmailKeys.messageDetail(id) });
    },
  });
}

export function useMarkAsRead(queryId?: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await markGmailMessageRead(id);
      if ("error" in result) throw new Error(result.error);
      return result.data;
    },
    onMutate: async (id) => {
      return performOptimisticLabelUpdate(qc, id, (labels) =>
        labels.filter((l) => l !== "UNREAD"),
        queryId
      );
    },
    onError: (_err, id, context) => {
      rollbackLabelUpdate(qc, id, context);
    },
    onSettled: (_data, _err, id) => {
      qc.invalidateQueries({ queryKey: gmailKeys.messages() });
      qc.invalidateQueries({ queryKey: gmailKeys.messageDetail(id) });
    },
  });
}

export function useMarkAsUnread(queryId?: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await markGmailMessageUnread(id);
      if ("error" in result) throw new Error(result.error);
      return result.data;
    },
    onMutate: async (id) => {
      return performOptimisticLabelUpdate(qc, id, (labels) =>
        labels.includes("UNREAD") ? labels : [...labels, "UNREAD"],
        queryId
      );
    },
    onError: (_err, id, context) => {
      rollbackLabelUpdate(qc, id, context);
      toast.error("Failed to mark as unread");
    },
    onSuccess: () => {
      toast.success("Marked as unread");
    },
    onSettled: (_data, _err, id) => {
      qc.invalidateQueries({ queryKey: gmailKeys.messages() });
      qc.invalidateQueries({ queryKey: gmailKeys.messageDetail(id) });
    },
  });
}

export function useToggleStar() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, starred }: { id: string; starred: boolean }) => {
      const result = await toggleStarGmailMessage(id, starred);
      if ("error" in result) throw new Error(result.error);
      return result.data;
    },
    onMutate: async ({ id, starred }) => {
      return performOptimisticLabelUpdate(qc, id, (labels) => {
        if (starred) {
          return labels.includes("STARRED") ? labels : [...labels, "STARRED"];
        }
        return labels.filter((l) => l !== "STARRED");
      });
    },
    onError: (_err, { id }, context) => {
      rollbackLabelUpdate(qc, id, context);
      toast.error("Failed to update star");
    },
    onSuccess: (_data, { starred }) => {
      toast.success(starred ? "Starred" : "Unstarred");
    },
    onSettled: (_data, _err, { id }) => {
      qc.invalidateQueries({ queryKey: gmailKeys.messages() });
      qc.invalidateQueries({ queryKey: gmailKeys.messageDetail(id) });
    },
  });
}

export function useEmailSelection(allIds: string[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(allIds));
  }, [allIds]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds]
  );

  const isAllSelected = allIds.length > 0 && selectedIds.size === allIds.length;
  const isSomeSelected = selectedIds.size > 0;

  return {
    selectedIds,
    selectedCount: selectedIds.size,
    toggle,
    selectAll,
    deselectAll,
    isSelected,
    isAllSelected,
    isSomeSelected,
  };
}

export function useGmailLabels() {
  return useQuery({
    queryKey: gmailKeys.labelList(),
    queryFn: async () => {
      const res = await listGmailLabels();
      if ("error" in res) throw new Error(res.error);
      return res.data.labels.filter((l) => l.type === "user");
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const res = await createGmailLabel(name);
      if ("error" in res) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: gmailKeys.labels() });
      toast.success("Label created");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (labelId: string) => {
      const res = await deleteGmailLabel(labelId);
      if ("error" in res) throw new Error(res.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: gmailKeys.labels() });
      toast.success("Label deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useModifyMessageLabels() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      messageId,
      labelId,
      action,
    }: {
      messageId: string;
      labelId: string;
      action: "add" | "remove";
    }) => {
      const fn = action === "add" ? addLabelToGmailMessage : removeLabelFromGmailMessage;
      const res = await fn(messageId, labelId);
      if ("error" in res) throw new Error(res.error);
      return res.data;
    },
    onMutate: async ({ messageId, labelId, action }) => {
      await performOptimisticLabelUpdate(qc, messageId, (labels) =>
        action === "add"
          ? [...labels, labelId]
          : labels.filter((l) => l !== labelId)
      );
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: gmailKeys.messages() });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteDraft(onSuccess?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (draftId: string) => {
      const res = await deleteGmailDraft(draftId);
      if ("error" in res) throw new Error(res.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: gmailKeys.messages() });
      onSuccess?.();
      toast.success("Draft deleted");
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to delete draft"),
  });
}

export function useGetDraftIdForMessage(messageId: string | null) {
  return useQuery({
    queryKey: gmailKeys.draftIdForMessage(messageId ?? ""),
    queryFn: async () => {
      const res = await getGmailDraftIdForMessage(messageId!);
      if ("error" in res) throw new Error(res.error);
      return res.data;
    },
    enabled: !!messageId,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

// ─── Query Association Hooks ──────────────────────────────────────────────

export function useActiveQueryIds(dmcId: string | undefined) {
  return useQuery({
    queryKey: ["queries", "active", dmcId || "session"] as const,
    queryFn: async () => {
      // The server will resolve dmcId via getCurrentUser() if undefined
      const result = await getActiveQueryIds(dmcId);
      if ("error" in result) throw new Error(result.error);
      return result.data;
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useSearchQueries(
  dmcId: string | undefined,
  search: string,
  enabled = true
) {
  return useQuery({
    queryKey: ["queries", "search", dmcId || "session", search] as const,
    queryFn: async () => {
      // The server will resolve dmcId via getCurrentUser() if undefined
      const result = await searchQueries(dmcId, search);
      if ("error" in result) throw new Error(result.error);
      return result.data;
    },
    enabled: enabled,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
}

type AttachEmailToQueryInput = {
  messageId: string;
  threadId: string;
  queryId: string;
  dmcId: string;
};

export function useAttachEmailToQuery() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, queryId, threadId, dmcId }: AttachEmailToQueryInput) => {
      const [labelResult, metaResult] = await Promise.all([
        applyQueryLabelToMessage(messageId, queryId),
        saveEmailQueryAssociation({
          gmailMessageId: messageId,
          gmailThreadId: threadId,
          queryId,
          dmcId,
        }),
      ]);
      if ("error" in labelResult) throw new Error(labelResult.error);
      if ("error" in metaResult) throw new Error(metaResult.error);
      return { messageId, queryId };
    },

    onMutate: async ({ messageId, queryId }) => {
      return performOptimisticLabelUpdate(qc, messageId, (labels) =>
        labels.includes(queryId) ? labels : [...labels, queryId]
      );
    },

    onError: (_err, { messageId }, context) => {
      rollbackLabelUpdate(qc, messageId, context);
      toast.error("Failed to attach email to query");
    },

    onSuccess: (_data, { queryId }) => {
      toast.success(`Attached to ${queryId}`);
    },

    onSettled: (_data, _err, { messageId }) => {
      qc.invalidateQueries({ queryKey: gmailKeys.messages() });
      qc.invalidateQueries({ queryKey: gmailKeys.messageDetail(messageId) });
    },
  });
}

// ─── Filter Pipeline Hooks ────────────────────────────────────────────────

/**
 * Stable hash for a FilterConfig, used as query key.
 * Deterministic JSON.stringify with sorted keys.
 */
function hashFilterConfig(config: FilterConfig): string {
  return JSON.stringify(config, Object.keys(config).sort());
}

/**
 * Fetch Gmail messages using the filter pipeline.
 * Supports infinite scrolling with dynamic filter configs.
 *
 * @example
 * ```tsx
 * const { data, fetchNextPage, hasNextPage } = useFilteredGmailMessages(
 *   {
 *     filters: {
 *       logic: "AND",
 *       conditions: [
 *         { field: "from", operator: "contains", value: "alice@example.com" },
 *         { field: "has", operator: "equals", value: "attachment" },
 *       ],
 *     },
 *     labelIds: ["INBOX"],
 *     maxResults: 20,
 *   },
 *   true // enabled
 * );
 * ```
 */
export function useFilteredGmailMessages(
  filterConfig: FilterConfig,
  enabled: boolean,
  queryId?: string
) {
  const configHash = useMemo(
    () => hashFilterConfig(filterConfig),
    [filterConfig]
  );

  return useInfiniteQuery({
    queryKey: gmailKeys.filteredMessageList(queryId, configHash),
    queryFn: async ({ pageParam }) => {
      const config: FilterConfig = {
        ...filterConfig,
        pageToken: pageParam || undefined,
      };
      const result = await listFilteredGmailMessages(config);
      if ("error" in result) throw new Error(result.error);
      return result.data;
    },
    initialPageParam: "" as string,
    getNextPageParam: (lastPage) => lastPage?.nextPageToken ?? undefined,
    enabled,
    staleTime: 30_000,
    gcTime: 60_000,  // drop unused filter caches quickly (alias filter changes generate new hash keys)
    refetchOnWindowFocus: false,
  });
}

/**
 * Flatten filtered messages from infinite query pages.
 */
export function flattenFilteredMessages(
  data: ReturnType<typeof useFilteredGmailMessages>["data"]
): GmailMessageListItem[] {
  if (!data?.pages) return [];
  return data.pages.flatMap((page) => page?.messages ?? []);
}

/**
 * Get available filter presets.
 * These are static and cached aggressively.
 */
export function useFilterPresets() {
  return useQuery({
    queryKey: gmailKeys.presets(),
    queryFn: () => listPresets(),
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
