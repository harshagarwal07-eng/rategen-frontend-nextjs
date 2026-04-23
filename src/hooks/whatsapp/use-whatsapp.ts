import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import type {
  WhatsAppGroupRow,
  WhatsAppGroupWithQuery,
  WhatsAppMessageDisplay,
  MessageListQueryData,
} from "@/types/whatsapp";

// ─── Query key factory ─────────────────────────────────────────────────────

export const WHATSAPP_KEYS = {
  all: ["whatsapp"] as const,
  groups: () => [...WHATSAPP_KEYS.all, "groups"] as const,
  groupsByQuery: (queryId: string) =>
    [...WHATSAPP_KEYS.groups(), "query", queryId] as const,
  messages: (chatId: string) =>
    [...WHATSAPP_KEYS.all, "messages", chatId] as const,
  connectionStatus: () =>
    [...WHATSAPP_KEYS.all, "connection-status"] as const,
};

// ─── Raw Periskope message → display mapper ─────────────────────────────────
// Centralised here so every consumer (hook + optimistic updater) uses the same logic.

// ─── Periskope field → display mapper ──────────────────────────────────────
// Source of truth: actual Periskope REST API response shape.
//
// Key divergences from the internal type definitions:
//   raw.message_type  → "image" | "video" | "audio" | "document" | "chat" | "sticker" | "location"
//   raw.media?.path   → URL of the attachment (NOT raw.media_path)
//   raw.from_me       → boolean, true = outgoing (NOT derived from phone comparison)
//   raw.quoted_message_id → reply-to message id (NOT raw.reply_to)
//   raw.prev_body !== null → message was edited
//   sender_phone includes "@c.us" / "@g.us" suffixes that must be stripped

function stripWaSuffix(phone: string | null | undefined): string {
  return (phone ?? "").replace(/@[\w.]+$/, "");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapPeriskopeMessage(raw: any): WhatsAppMessageDisplay {
  const senderPhone = stripWaSuffix(raw.sender_phone);

  // "chat" means plain text — all other message_type values are media types.
  const rawType = (raw.message_type as string | null)?.toLowerCase();
  const mediaType: WhatsAppMessageDisplay["mediaType"] =
    !rawType || rawType === "chat" ? null : (rawType as WhatsAppMessageDisplay["mediaType"]);

  // Media URL lives at raw.media.path — NOT raw.media_path.
  const mediaPath: string = (raw.media?.path as string | null | undefined) ?? "";

  return {
    messageId: raw.message_id ?? "",
    chatId: raw.chat_id ?? "",
    senderName: raw.sender_name ?? "",
    senderPhone,
    body: raw.body ?? "",
    mediaPath,
    mediaType,
    // When a media message has body text, that text is the caption.
    mediaCaption: mediaType && raw.body ? (raw.body as string) : null,
    // quoted_message_id is the Periskope field for replied-to messages.
    replyToMessageId: raw.quoted_message_id ?? null,
    timestamp: raw.timestamp ?? new Date().toISOString(),
    // from_me is a direct boolean field — no phone comparison needed.
    isOutgoing: raw.from_me === true,
    // prev_body is set only when a message was edited.
    isEdited: raw.prev_body != null,
    isPinned: false,
    isPending: false,
    reactions: Array.isArray(raw.reactions) ? raw.reactions : [],
    // ack is the Periskope delivery level: "0"|"1"|"2"|"3"|"4"
    ack: raw.ack != null ? String(raw.ack) : null,
  };
}


// ─── Data fetchers (used by hooks — not called from components directly) ────

async function fetchAllGroups(): Promise<WhatsAppGroupWithQuery[]> {
  const res = await fetch("/api/whatsapp/groups");
  if (!res.ok) throw new Error((await res.json()).error ?? "Failed to load groups");
  const data = await res.json();
  return data.groups as WhatsAppGroupWithQuery[];
}

async function fetchChatMessages(
  chatId: string,
  limit = 50
): Promise<MessageListQueryData> {
  const res = await fetch(
    `/api/whatsapp/messages?chatId=${encodeURIComponent(chatId)}&limit=${limit}`
  );
  if (!res.ok) throw new Error((await res.json()).error ?? "Failed to load messages");
  const data = await res.json();
  // Periskope returns newest-first — reverse to chronological order.
  const mapped = (data.messages ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((m: any) => mapPeriskopeMessage(m))
    .reverse() as WhatsAppMessageDisplay[];
  return { messages: mapped, totalCount: data.count ?? mapped.length };
}

export interface ConnectionStatusData {
  connected: boolean;
  phoneId: string | null;
  detail?: string;
}

async function fetchConnectionStatus(): Promise<ConnectionStatusData> {
  const res = await fetch("/api/whatsapp/connection-status");
  const data = await res.json();
  if (!res.ok) {
    return {
      connected: false,
      phoneId: null,
      detail: data.detail ?? data.error ?? "Connection check failed.",
    };
  }
  return data;
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

export function useWhatsAppGroups(
  queryId?: string,
  options?: Partial<UseQueryOptions<WhatsAppGroupWithQuery[]>>
) {
  return useQuery<WhatsAppGroupWithQuery[]>({
    queryKey: queryId ? WHATSAPP_KEYS.groupsByQuery(queryId) : WHATSAPP_KEYS.groups(),
    queryFn: fetchAllGroups,
    select: (groups) => (queryId ? groups.filter((g) => g.query_id === queryId) : groups),
    ...options,
  });
}

/**
 * Fetches and polls messages for a single chat via TanStack Query.
 * - Stops polling when the browser tab is hidden (refetchIntervalInBackground: false)
 * - All consumers share the same cache entry — no duplicate polling
 * - isOutgoing is derived from raw.from_me (Periskope boolean field)
 */
export function useGroupMessages(chatId: string | null) {
  return useQuery<MessageListQueryData>({
    queryKey: WHATSAPP_KEYS.messages(chatId ?? ""),
    queryFn: () => fetchChatMessages(chatId!),
    enabled: !!chatId,
    staleTime: 5_000,
    refetchInterval: 5_000,
    refetchIntervalInBackground: false,
  });
}

export function usePeriskopeConnectionStatus() {
  return useQuery({
    queryKey: WHATSAPP_KEYS.connectionStatus(),
    queryFn: fetchConnectionStatus,
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    retry: false,
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      queryId?: string;
      queryDisplayId?: string;
      groupName: string;
      participants: string[];
      options?: Record<string, unknown>;
    }) => {
      const res = await fetch("/api/whatsapp/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to create group");
      return res.json() as Promise<{ group: WhatsAppGroupRow; chat: { chat_id: string } }>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WHATSAPP_KEYS.groups() });
    },
  });
}

export function useAddParticipants(chatId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (participants: string[]) => {
      const res = await fetch(`/api/whatsapp/groups/${chatId}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participants }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to add participants");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: WHATSAPP_KEYS.groups() }),
  });
}

export function useRemoveParticipant(chatId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (phone: string) => {
      const res = await fetch(`/api/whatsapp/groups/${chatId}/participants`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participants: [phone] }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to remove participant");
    },
    onMutate: async (phone: string) => {
      await qc.cancelQueries({ queryKey: WHATSAPP_KEYS.groups() });
      const snapshot = qc.getQueryData<WhatsAppGroupRow[]>(WHATSAPP_KEYS.groups());
      qc.setQueryData<WhatsAppGroupRow[]>(WHATSAPP_KEYS.groups(), (old) =>
        old?.map((g) =>
          g.periskope_chat_id === chatId
            ? { ...g, participant_phones: g.participant_phones.filter((p) => p !== phone) }
            : g
        )
      );
      return { snapshot };
    },
    onError: (_err, _phone, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(WHATSAPP_KEYS.groups(), ctx.snapshot);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: WHATSAPP_KEYS.groups() }),
  });
}

export function usePromoteToAdmin(chatId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (phone: string) => {
      const res = await fetch(`/api/whatsapp/groups/${chatId}/participants/promote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participants: [phone] }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to promote");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: WHATSAPP_KEYS.groups() }),
  });
}

export function useDemoteFromAdmin(chatId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (phone: string) => {
      const res = await fetch(`/api/whatsapp/groups/${chatId}/demote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participants: [phone] }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to demote");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: WHATSAPP_KEYS.groups() }),
  });
}

export function useLeaveGroup() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (chatId: string) => {
      const res = await fetch(`/api/whatsapp/groups/${chatId}/leave`, {
        method: "POST",
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to leave group");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: WHATSAPP_KEYS.groups() }),
  });
}

/**
 * Sends a WhatsApp message with full optimistic update.
 *
 * Optimistic flow:
 * 1. onMutate — immediately appends a pending bubble (isPending: true) to the cached list
 * 2. onError  — rolls back to snapshot if the API call fails
 * 3. onSettled — triggers a refetch so the real message_id replaces the temp one
 */
export function useSendMessage(chatId: string) {
  const qc = useQueryClient();
  const cacheKey = WHATSAPP_KEYS.messages(chatId);

  return useMutation({
    mutationFn: async ({
      message,
      replyTo,
      media,
    }: {
      message?: string;
      replyTo?: string;
      media?: {
        type: "image" | "video" | "document" | "audio";
        /** Pre-encoded base64 (without data URL prefix) — normal path, already encoded at file-select time */
        filedata?: string;
        /** Raw File — fallback if encoding wasn't done yet (rare: huge files on slow devices) */
        file?: File;
        filename?: string;
        /** Data URL for the optimistic bubble preview — self-contained, NOT sent to API */
        localPreviewUrl?: string;
      };
    }) => {
      // Normal path: filedata is already encoded.
      // Fallback path: encode the File now (blocks, but only for huge files on slow devices).
      let filedata = media?.filedata;
      if (!filedata && media?.file) {
        filedata = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(",")[1]);
          reader.onerror = reject;
          reader.readAsDataURL(media.file!);
        });
      }

      // Strip client-only fields before sending to the API
      const apiMedia = media
        ? { type: media.type, filedata, filename: media.filename }
        : undefined;

      const res = await fetch("/api/whatsapp/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, message, replyTo, media: apiMedia }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to send message");
      return res.json();
    },


    onMutate: async ({ message, media }) => {
      await qc.cancelQueries({ queryKey: cacheKey });
      const snapshot = qc.getQueryData<MessageListQueryData>(cacheKey);

      const optimisticMessage: WhatsAppMessageDisplay = {
        messageId: `optimistic-${Date.now()}`,
        chatId,
        senderName: "",
        senderPhone: "",
        body: message ?? "",
        // Use the local blob URL so the image/video shows IMMEDIATELY in the bubble.
        // Once onSettled fires the real CDN URL replaces this.
        mediaPath: media?.localPreviewUrl ?? "",
        mediaType: media?.type ?? null,
        mediaCaption: null,
        replyToMessageId: null,
        timestamp: new Date().toISOString(),
        isOutgoing: true,
        isEdited: false,
        isPinned: false,
        isPending: true,
        reactions: [],
        ack: null,
      };

      qc.setQueryData<MessageListQueryData>(cacheKey, (prev) => {
        if (!prev) return { messages: [optimisticMessage], totalCount: 1 };
        return {
          ...prev,
          messages: [...prev.messages, optimisticMessage],
          totalCount: prev.totalCount + 1,
        };
      });

      return { snapshot };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) {
        qc.setQueryData<MessageListQueryData>(cacheKey, ctx.snapshot);
      }
    },

    onSuccess: (data) => {
      // Swap optimistic bubble: keep content, update messageId + clear isPending.
      // No refetch — avoids the flash. The 5s polling will sync the real message.
      const realId: string = data?.message_id ?? "";
      qc.setQueryData<MessageListQueryData>(cacheKey, (prev) => {
        if (!prev) return prev;
        const messages = prev.messages.map((m) =>
          m.messageId.startsWith("optimistic-")
            ? { ...m, messageId: realId || m.messageId, isPending: false }
            : m
        );
        return { ...prev, messages };
      });
    },

    onSettled: () => {
      // Mark stale so the next polling tick picks up the real message,
      // but don't force an immediate refetch (that caused the flash).
      qc.invalidateQueries({ queryKey: cacheKey, refetchType: "none" });
    },
  });
}

// ─── Message action mutations ────────────────────────────────────────────────

export function useSendMessageReaction(chatId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      const res = await fetch(`/api/whatsapp/messages/${messageId}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to react");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: WHATSAPP_KEYS.messages(chatId) }),
  });
}

export function useDeleteMessage(chatId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (messageId: string) => {
      const res = await fetch(`/api/whatsapp/messages/${messageId}/delete`, {
        method: "POST",
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to delete");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: WHATSAPP_KEYS.messages(chatId) }),
  });
}

export function useForwardMessage(chatId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ messageId, targetChatId }: { messageId: string; targetChatId: string }) => {
      const res = await fetch(`/api/whatsapp/messages/${messageId}/forward`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: targetChatId }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to forward");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: WHATSAPP_KEYS.messages(chatId) }),
  });
}

export function usePinMessage(chatId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (messageId: string) => {
      const res = await fetch(`/api/whatsapp/messages/${messageId}/pin`, {
        method: "POST",
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to pin");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: WHATSAPP_KEYS.messages(chatId) }),
  });
}

// ─── Contact verification ─────────────────────────────────────────────────────

export function useVerifyWhatsAppContacts() {
  return useMutation({
    mutationFn: async (phones: string[]): Promise<{ valid: string[]; invalid: string[] }> => {
      const res = await fetch("/api/whatsapp/contacts/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phones }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Contact verification failed");
      return res.json();
    },
  });
}
