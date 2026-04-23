export type IBookingFeature = "search" | "book" | "cancel" | "modify";
export type ISiteStatus = "active" | "pending" | "approved" | "suspend";

export interface IServicePermission {
  providers: string[];
  features: IBookingFeature[];
}
export interface IBookingServicePermissions {
  hotel?: IServicePermission;
  tour?: IServicePermission;
  transfer?: IServicePermission;
}

export interface IServiceGroupPermissions {
  bookings?: IBookingServicePermissions;
}

interface IPaymentOptions {
  [key: string]: any;
}

export interface ISiteCustomizations {
  branding: {
    logoLight: string; // Light theme logo (required)
    logoDark?: string; // Dark theme logo (optional)
    logoIcon?: string; // Icon/short logo (optional)
    siteName: string; // Site name (required)
    tagline?: string; // Site tagline (optional)
    themeColor?: string; // Primary theme color (optional)
  };
  support: {
    supportEmail: string; // Support email (required)
    supportPhone?: string; // Support phone (optional)
    whatsappUrl?: string; // WhatsApp URL (optional)
  };
  seo: {
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string;
    ogImage?: string;
  };
}

export interface IDNSRecord {
  type: string;
  name: string;
  value: string;
  ttl?: number;
}

export interface IAppSettings {
  id: string;
  created_at: string;
  permissions: IServiceGroupPermissions;
  payment_options: IPaymentOptions;
  site_customizations: ISiteCustomizations;
  domain: string;
  dmc_id: string;
  dmcs?: {
    name: string;
    avatar_url: string | null;
  };
  status: ISiteStatus;
  dns_records?: IDNSRecord[];
}

export interface IAppConfig {
  settings: IAppSettings | null;
  isLoading: boolean;
  error: string | null;
}
