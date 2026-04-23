export interface PeriskopeChat {
  org_id: string;
  chat_id: string;
  chat_name: string;
  chat_type: "group" | "user";
  chat_image: string | null;
  chat_labels: string;
  org_phone: string;
  created_at: string;
  is_muted: boolean;
  invite_link: string | null;
  group_description: string | null;
  custom_properties: Record<string, string>;
  members: Record<string, PeriskopeChatMember>;
}

export interface PeriskopeChatMember {
  org_id: string;
  chat_id: string;
  contact_id: string;
  contact_name: string;
  contact_color: string;
  contact_image: string;
  contact_labels: string;
  org_phone: string;
  is_admin: boolean;
  is_super_admin: boolean;
  is_internal: boolean;
}

export interface ChatListResponse {
  from: number;
  to: number;
  count: number;
  chats: PeriskopeChat[];
}

export interface CreateGroupRequest {
  group_name: string;
  participants: string[];
  options?: {
    description?: string;
    image?: string;
    messagesAdminsOnly?: boolean;
    infoAdminsOnly?: boolean;
    addMembersAdminsOnly?: boolean;
    force_add_participants?: boolean;
  };
}

export interface GroupSettingsRequest {
  name?: string;
  description?: string;
  image?: string;
  messagesAdminsOnly?: boolean;
  infoAdminsOnly?: boolean;
  addMembersAdminsOnly?: boolean;
}

export interface ParticipantActionRequest {
  participants: string[];
  force_add_participants?: boolean;
}

export type PeriskopeMediaType =
  | "image"
  | "video"
  | "audio"
  | "document"
  | "sticker"
  | "location"
  | null;

export interface PeriskopeMessage {
  message_id: string;
  chat_id: string;
  org_phone: string;
  sender_phone: string;
  sender_name: string;
  body: string;
  media_path: string;
  /** Periskope-supplied media type — present when media_path is non-empty */
  media_type: PeriskopeMediaType;
  timestamp: string;
  performed_by: string | null;
}

export interface MessageListResponse {
  from: number;
  to: number;
  count: number;
  messages: PeriskopeMessage[];
}

export interface SendMessagePayload {
  chat_id: string;
  message: string;
  media?: {
    type: "image" | "video" | "document" | "audio";
    url?: string;
    filedata?: string;
    filename?: string;
  };
  reply_to?: string;
  options?: {
    hide_url_preview?: boolean;
  };
}

export interface SendMessageResponse {
  message_id: string;
  chat_id: string;
  status: string;
}

export interface BroadcastPayload {
  chat_ids: string[];
  message: string;
  scheduled_at?: string;
  delay?: number;
  variables?: Array<{ values: Record<string, string>; chat_id: string }>;
  media?: SendMessagePayload["media"];
  reply_to?: string;
}

export interface BroadcastResponse {
  broadcast_id: string;
  queue_id: string;
  status: string;
}

// ─── Contact Types ──────────────────────────────────────────────────

export interface PeriskopeContact {
  org_id: string;
  contact_id: string;
  contact_name: string | null;
  contact_type: "user" | "business";
  contact_color: string;
  contact_image: string;
  is_wa_contact: boolean;
  is_my_contact: boolean | null;
  is_internal: boolean | null;
  is_imported: boolean | null;
  label_ids: Record<string, boolean>;
  labels: string[];
  chat_ids?: string[];
  updated_at: string;
}

export interface ContactListResponse {
  from: number;
  to: number;
  count: number;
  contacts: PeriskopeContact[];
}

export interface CreateContactRequest {
  contact_name: string;
  contact_id: string;
  labels?: string;
  is_internal?: boolean;
}

export interface UpdateContactRequest {
  contact_name?: string;
  is_internal?: boolean;
  labels?: string;
}

export interface UpdateContactLabelsRequest {
  labels: string;
  contact_ids: string[];
}

export interface UpdateChatLabelsRequest {
  labels: string;
  chat_ids: string[];
}

export type PeriskopeWebhookEventType =
  | "message.created"
  | "message.updated"
  | "chat.created"
  | "phone.connected"
  | "phone.disconnected"
  | "ticket.created";

export interface PeriskopeWebhookEvent {
  integration_name: PeriskopeWebhookEventType;
  org_id: string;
  data: Record<string, unknown>;
  created_at: string;
}

export interface PeriskopeValidationError {
  name: string;
  code: string;
  fields: Record<string, { message: string; value?: string }>;
  message: string;
  status: number;
}

export interface PaginationOptions {
  offset?: number;
  limit?: number;
}

export type BookingMilestone = "welcome" | "confirmation" | "reminder7day" | "dayOf" | "postTrip";
export type ParticipantRole = "admin" | "member";
export type GroupStatus = "active" | "completed" | "pending";

export interface GroupParticipant {
  phone: string;
  name: string;
  role: ParticipantRole;
  isWhatsAppContact: boolean;
}

export interface WelcomeTemplateVars {
  travelerName: string;
  destination: string;
  travelDates: string;
  queryId: string;
}

export interface ConfirmationTemplateVars {
  travelerName: string;
  destination: string;
  checkIn: string;
  checkOut: string;
  hotel: string;
  transferDetails: string;
  toursIncluded: string[];
}

export interface ReminderTemplateVars {
  travelerName: string;
  destination: string;
  daysUntilTravel: number;
  meetingPoint: string;
  contactNumber: string;
}
