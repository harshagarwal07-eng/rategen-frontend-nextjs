import type { GroupStatus, PeriskopeChatMember } from "@/lib/periskope/types";

export interface WhatsAppGroupRow {
  id: string;
  periskope_chat_id: string;
  query_id: string;
  dmc_id: string;
  group_name: string;
  participant_phones: string[];
  label_ids: string[];
  status: GroupStatus;
  invite_link: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  members?: Record<string, PeriskopeChatMember>;
}

export interface WhatsAppGroupWithQuery extends WhatsAppGroupRow {
  query_display_id: string;
  traveler_name: string;
  ta_name: string;
  destination: string;
}

export interface GroupParticipantDisplay {
  phone: string;
  name: string;
  role: "admin" | "member";
  avatarUrl: string | null;
  isInternal: boolean;
}

export interface MessageReaction {
  emoji: string;
  senderPhone: string;
}

export interface WhatsAppMessageDisplay {
  messageId: string;
  chatId: string;
  senderName: string;
  senderPhone: string;
  body: string;
  mediaPath: string;
  mediaType: "image" | "video" | "document" | "audio" | "sticker" | "location" | null;
  mediaCaption: string | null;
  replyToMessageId: string | null;
  timestamp: string;
  isOutgoing: boolean;
  isEdited: boolean;
  isPinned: boolean;
  isPending: boolean;
  reactions: MessageReaction[];
  ack: string | null;
}

export interface MessageListQueryData {
  messages: WhatsAppMessageDisplay[];
  totalCount: number;
}

export interface PeriskopeConnectionRow {
  id: string;
  dmc_id: string;
  api_key: string;
  phone_id: string;
  org_id: string | null;
  connected_at: string;
  updated_at: string;
}
