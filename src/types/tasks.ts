// Literal types — all lowercase matching new DB schema
export type TaskScopeMode = "all" | "inclusive" | "exclusive";
export type TaskServiceCategory = "hotel" | "tour" | "transfer";
export type TaskOffsetReference = "booking_confirm" | "trip_start" | "service_date";
export type TaskOffsetDirection = "before" | "after";
export type TaskOffsetUnit = "minute" | "hour" | "day";
export type QueryTaskStatus = "pending" | "in_progress" | "completed" | "cancelled" | "skipped";
export type TaskOrigin = "system" | "ai" | "manual";
export type TaskCategory = "hotel" | "tour" | "transfer" | "meal" | "guide" | "package" | "finance" | "on_trip";
export type TaskTimelineAction = "task_created" | "assigned" | "unassigned" | "status_changed" | "due_date_changed";

// task_library table
export interface ITaskLibrary {
  id: string;
  dmc_id: string;
  name: string;
  description: string | null;
  category: TaskCategory | null;
  service_category: TaskServiceCategory | null;
  scope_mode: TaskScopeMode;
  offset_reference: TaskOffsetReference;
  offset_direction: TaskOffsetDirection;
  offset_value: number;
  offset_unit: TaskOffsetUnit;
  default_assignees: string[] | null;
  sort_order: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // From vw_task_library
  service_map_count: number;
}

export interface ITaskLibraryServiceMapEntry {
  id: string;
  task_library_id: string;
  service_parent_id: string;
  service_id: string | null;
}

export interface ITaskAssignee {
  user_id: string;
  full_name: string;
  assigned_at: string;
}

// vw_query_tasks — query-scoped task with context and aggregated assignees
export interface ITaskDetails {
  id: string;
  query_id: string;
  source_template_id: string | null;
  name: string;
  description: string | null;
  category: TaskCategory | null;
  offset_reference: TaskOffsetReference | null;
  offset_direction: TaskOffsetDirection | null;
  offset_value: number | null;
  offset_unit: TaskOffsetUnit | null;
  due_at: string | null;
  sort_order: number | null;
  status: QueryTaskStatus;
  task_origin: TaskOrigin;
  is_active: boolean;
  dmc_id: string;
  created_by: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  // From whitelabel_queries join
  query_status: string;
  // Aggregated from query_task_assignments + profile
  assignees: ITaskAssignee[];
  // From query_tasks (trigger-maintained)
  last_comment_at: string | null;
  // From get_query_tasks RPC
  comment_count: number;
  has_unread: boolean;
  // Attachment count (optional, populated when available)
  attachment_count?: number;
}

// vw_query_task_summary — one row per query with aggregated task counts
export interface IQueryTaskSummary {
  query_id: string;
  short_query_id: string;
  dmc_id: string;
  traveler_name: string;
  ta_name: string | null;
  query_status: string;
  travel_date: string | null;
  total_tasks: number;
  pending_count: number;
  in_progress_count: number;
  skipped_count: number;
  completed_count: number;
  cancelled_count: number;
  overdue_count: number;
}

export interface ITaskComment {
  id: string;
  query_task_id: string;
  author_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  author_name: string | null;
}

// vw_query_task_timeline — audit log enriched with task and performer context
export interface ITaskTimeline {
  id: string;
  query_task_id: string;
  action: TaskTimelineAction;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  performed_by: string | null;
  created_at: string;
  // From query_tasks join
  query_id: string;
  task_name: string;
  task_category: TaskCategory | null;
  // From profile join
  performed_by_name: string | null;
}
