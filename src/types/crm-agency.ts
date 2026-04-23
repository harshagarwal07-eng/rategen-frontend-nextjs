import { FileAttachment } from "./common";

export type OrgStatus = "active" | "pending" | "inactive" | "blocked";
export type OrgCatagory = "unrated" | "3" | "4" | "5";
export type SupportMessageRole = "agent" | "dmc" | "system";

export interface ICrmUserShort {
  user_id: string;
  name: string;
  email: string;
  phone: string;
  avatar_url?: string;
}

export interface ICrmTeamMember {
  id: string;
  created_at: string;
  updated_at: string;
  ta_id: string;
  user_id: string;
  user: ICrmUserShort;
}

export interface ICrmTaDetails {
  ta_id: string;
  dmc_id: string;
  name: string;
  ta_admin_name?: string;
  ta_admin_phone?: string;
  ta_admin_email?: string;
  created_at: string;
  updated_at?: string;
  status: OrgStatus;
  category?: OrgCatagory;
  website?: string;
  country: string;
  country_name: string;
  city?: string;
  city_name?: string;
  source?: string;
  source_name?: string;
  dmc_pin_count?: string;
  is_flagged: boolean;
  queries_count?: number;
  booking_count?: number;
  token_used?: number;
}

export interface ICrmSupportMessage {
  id: string;
  created_at: string;
  updated_at: string;
  text: string;
  created_by?: {
    user_id: string;
    name: string;
  };
  ta_id: string;
  files: FileAttachment[];
  edited: boolean;
  role: SupportMessageRole;
  is_pinned?: boolean;
}

export interface IPinnedMessage {
  id: string;
  created_at: string;
  message_id: string;
  ta_id: string;
  role: "agent" | "dmc";
}
