import {
  Check,
  Clock,
  ClockCheck,
  ShieldAlert,
  Ban,
  LucideIcon,
  BadgeCheck,
  XCircle,
  AlertCircle,
  ScanEye,
  CalendarCheck,
  Loader,
  CircleCheck,
  CircleX,
  CircleMinus,
} from "lucide-react";
import { OrgStatus } from "@/types/crm-agency";
import { QueryStatus } from "@/types/crm-query";
import { ISiteStatus } from "@/types/whitelabel-config";
import { LibraryItemStatus } from "@/types/docs";
import { QueryTaskStatus } from "@/types/tasks";

export interface StatusConfig {
  value: OrgStatus | QueryStatus | ISiteStatus | LibraryItemStatus;
  label: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
}

export interface SimpleStatusConfig {
  value: string;
  label: string;
  color: string;
  bgColor: string;
  dotColor?: string;
  borderColor?: string;
}

export const AGENT_STATUS_CONFIGS: StatusConfig[] = [
  {
    value: "pending",
    label: "Pending",
    icon: Clock,
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
  {
    value: "active",
    label: "Active",
    icon: Check,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    value: "inactive",
    label: "Inactive",
    icon: ShieldAlert,
    color: "text-info",
    bgColor: "bg-info/10",
  },
  {
    value: "blocked",
    label: "Blocked",
    icon: Ban,
    color: "text-destructive",
    bgColor: "bg-destructive/10",
  },
];

export const QUERY_STATUS_CONFIGS: StatusConfig[] = [
  {
    value: "ongoing",
    label: "Active",
    icon: Clock,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-500/10",
  },
  {
    value: "booked",
    label: "Booked",
    icon: CalendarCheck,
    color: "text-info",
    bgColor: "bg-sky-500/10",
  },
  {
    value: "live",
    label: "Live",
    icon: ScanEye,
    color: "text-violet-600 dark:text-violet-400",
    bgColor: "bg-violet-500/10",
  },
  {
    value: "completed",
    label: "Completed",
    icon: ClockCheck,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-500/10",
  },
  {
    value: "cancelled",
    label: "Cancelled",
    icon: XCircle,
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-500/10",
  },
  {
    value: "archived",
    label: "Archived",
    icon: CircleMinus,
    color: "text-slate-500 dark:text-slate-400",
    bgColor: "bg-slate-500/10",
  },
];

export const SITE_STATUS_CONFIGS: StatusConfig[] = [
  {
    value: "active",
    label: "Active",
    icon: Check,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    value: "pending",
    label: "Pending Review",
    icon: Clock,
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
  {
    value: "approved",
    label: "Approved",
    icon: BadgeCheck,
    color: "text-info",
    bgColor: "bg-info/10",
  },
  {
    value: "suspend",
    label: "Suspended",
    icon: AlertCircle,
    color: "text-destructive",
    bgColor: "bg-destructive/10",
  },
];

export const LIBRARY_STATUS_CONFIGS: StatusConfig[] = [
  {
    value: "active",
    label: "Active",
    icon: Check,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    value: "inactive",
    label: "Inactive",
    icon: ShieldAlert,
    color: "text-info",
    bgColor: "bg-info/10",
  },
  {
    value: "blacklist",
    label: "Blacklist",
    icon: Ban,
    color: "text-destructive",
    bgColor: "bg-destructive/10",
  },
];

const DEFAULT_STATUS_CONFIG: StatusConfig = {
  value: "pending",
  label: "Pending",
  icon: Clock,
  color: "text-muted-foreground",
  bgColor: "bg-muted-foreground/20",
};

export const getAgentStatusConfig = (status?: OrgStatus | string): StatusConfig => {
  return AGENT_STATUS_CONFIGS.find((config) => config.value === status) || DEFAULT_STATUS_CONFIG;
};
export const getQueryStatusConfig = (status?: QueryStatus | string): StatusConfig => {
  return QUERY_STATUS_CONFIGS.find((config) => config.value === status) || DEFAULT_STATUS_CONFIG;
};
export const getSiteStatusConfig = (status?: ISiteStatus | string): StatusConfig => {
  return SITE_STATUS_CONFIGS.find((config) => config.value === status) || DEFAULT_STATUS_CONFIG;
};

export const getLibraryStatusConfig = (status?: LibraryItemStatus | string): StatusConfig => {
  return LIBRARY_STATUS_CONFIGS.find((config) => config.value === status) || DEFAULT_STATUS_CONFIG;
};

export const SERVICE_TYPE_CONFIGS: SimpleStatusConfig[] = [
  {
    value: "hotel",
    label: "Hotel",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-l-blue-500",
  },
  {
    value: "tour",
    label: "Tour",
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-l-emerald-500",
  },
  {
    value: "transfer",
    label: "Transfer",
    color: "text-violet-600 dark:text-violet-400",
    bgColor: "bg-violet-500/10",
    borderColor: "border-l-violet-500",
  },
  {
    value: "combo",
    label: "Combo",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-500/10",
  },
  {
    value: "meal",
    label: "Meal",
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-500/10",
  },
  {
    value: "guide",
    label: "Guide",
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-500/10",
  },
  {
    value: "other",
    label: "Other",
    color: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-500/10",
  },
];

export const BOOKING_STATUS_CONFIGS: SimpleStatusConfig[] = [
  {
    value: "pending",
    label: "Pending",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-500/10",
    dotColor: "bg-amber-500",
  },
  {
    value: "on_hold",
    label: "On Hold",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-500/10",
    dotColor: "bg-blue-500",
  },
  {
    value: "confirmed",
    label: "Confirmed",
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-500/10",
    dotColor: "bg-emerald-500",
  },
];

export const PAYMENT_STATUS_CONFIGS: SimpleStatusConfig[] = [
  {
    value: "not_configured",
    label: "Not Configured",
    color: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-500/10",
  },
  {
    value: "unpaid",
    label: "Unpaid",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-500/10",
  },
  {
    value: "partial",
    label: "Partially Paid",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-500/10",
  },
  {
    value: "paid",
    label: "Paid",
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-500/10",
  },
  {
    value: "overdue",
    label: "Overdue",
    color: "text-destructive",
    bgColor: "bg-destructive/10",
  },
  {
    value: "cancelled",
    label: "Cancelled",
    color: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-500/10",
  },
];

export const VOUCHER_STATUS_CONFIGS: SimpleStatusConfig[] = [
  {
    value: "pending",
    label: "Pending",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-500/10",
  },
  {
    value: "vouchered",
    label: "Vouchered",
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-500/10",
  },
];

const DEFAULT_SIMPLE_STATUS_CONFIG: SimpleStatusConfig = {
  value: "unknown",
  label: "Unknown",
  color: "text-muted-foreground",
  bgColor: "bg-muted/20",
};

export const getServiceTypeConfig = (type?: string): SimpleStatusConfig => {
  return SERVICE_TYPE_CONFIGS.find((config) => config.value === type) || DEFAULT_SIMPLE_STATUS_CONFIG;
};

export const getBookingStatusConfig = (status?: string): SimpleStatusConfig => {
  return BOOKING_STATUS_CONFIGS.find((config) => config.value === status) || DEFAULT_SIMPLE_STATUS_CONFIG;
};

export const getPaymentStatusConfig = (status?: string): SimpleStatusConfig => {
  return PAYMENT_STATUS_CONFIGS.find((config) => config.value === status) || DEFAULT_SIMPLE_STATUS_CONFIG;
};

export const getVoucherStatusConfig = (status?: string): SimpleStatusConfig => {
  return VOUCHER_STATUS_CONFIGS.find((config) => config.value === status) || DEFAULT_SIMPLE_STATUS_CONFIG;
};

export const PAYMENT_TRANSACTION_STATUS_CONFIGS: SimpleStatusConfig[] = [
  {
    value: "approved",
    label: "Approved",
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-500/10",
  },
  {
    value: "pending",
    label: "Pending",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-500/10",
  },
  {
    value: "rejected",
    label: "Rejected",
    color: "text-destructive",
    bgColor: "bg-destructive/10",
  },
];

export const getPaymentTransactionStatusConfig = (status?: string): SimpleStatusConfig => {
  return PAYMENT_TRANSACTION_STATUS_CONFIGS.find((config) => config.value === status) || DEFAULT_SIMPLE_STATUS_CONFIG;
};

export const QUERY_TASK_STATUS_CONFIGS: Record<QueryTaskStatus, SimpleStatusConfig & { dotColor: string; icon: LucideIcon }> = {
  pending: {
    value: "pending",
    label: "Pending",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-500/10",
    dotColor: "bg-amber-500",
    icon: Clock,
  },
  in_progress: {
    value: "in_progress",
    label: "In Progress",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-500/10",
    dotColor: "bg-blue-500",
    icon: Loader,
  },
  completed: {
    value: "completed",
    label: "Completed",
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-500/10",
    dotColor: "bg-emerald-500",
    icon: CircleCheck,
  },
  cancelled: {
    value: "cancelled",
    label: "Cancelled",
    color: "text-destructive dark:text-red-400",
    bgColor: "bg-destructive/10",
    dotColor: "bg-destructive",
    icon: CircleX,
  },
  skipped: {
    value: "skipped",
    label: "Skipped",
    color: "text-slate-500",
    bgColor: "bg-slate-500/10",
    dotColor: "bg-slate-400",
    icon: CircleMinus,
  },
};

export const getQueryTaskStatusConfig = (status: QueryTaskStatus) => {
  return QUERY_TASK_STATUS_CONFIGS[status];
};
