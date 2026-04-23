"use server";

import { createClient } from "@/utils/supabase/server";
import { getCurrentUser } from "./auth";
import type {
  ITaskLibrary,
  ITaskLibraryServiceMapEntry,
  ITaskDetails,
  ITaskComment,
  QueryTaskStatus,
  TaskCategory,
  TaskServiceCategory,
  IQueryTaskSummary,
} from "@/types/tasks";
import type { FileAttachment } from "@/types/common";
import type { LibraryTaskFormValues } from "@/components/forms/schemas/library-task-schema";

// ─── Task Library ─────────────────────────────────────────────────────────────

function sanitizeTaskInput(input: Partial<LibraryTaskFormValues>) {
  const { service_map_ids, ...rest } = input;
  return {
    ...rest,
    description: rest.description?.trim() || null,
    service_category: rest.service_category ?? null,
    scope_mode: rest.scope_mode ?? "all",
  };
}

export async function getLibraryTasks(
  dmcId: string,
  params?: { is_active?: boolean; category?: TaskCategory }
): Promise<ITaskLibrary[]> {
  const supabase = await createClient();

  let query = supabase
    .from("vw_task_library")
    .select("*")
    .eq("dmc_id", dmcId)
    .order("is_active", { ascending: false })
    .order("created_at", { ascending: false });

  if (params?.is_active !== undefined) query = query.eq("is_active", params.is_active);
  if (params?.category) query = query.eq("category", params.category);

  const { data, error } = await query;

  if (error) {
    console.error("[getLibraryTasks]", error);
    return [];
  }

  return data ?? [];
}

/** Create or update a task_library row and sync its service map in one call. */
export async function saveLibraryTask(
  input: LibraryTaskFormValues,
  existingId?: string
): Promise<ITaskLibrary | null> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user || !("dmc" in user)) return null;

  const taskData = { ...sanitizeTaskInput(input), dmc_id: user.dmc.id };
  let taskId: string;

  if (existingId) {
    const { data, error } = await supabase
      .from("task_library")
      .update(taskData)
      .eq("id", existingId)
      .select("id")
      .single();
    if (error) {
      console.error("[saveLibraryTask] update", error);
      return null;
    }
    taskId = data.id;
  } else {
    const { data, error } = await supabase
      .from("task_library")
      .insert(taskData)
      .select("id")
      .single();
    if (error) {
      console.error("[saveLibraryTask] insert", error);
      return null;
    }
    taskId = data.id;
  }

  const serviceParentIds = input.scope_mode !== "all" ? (input.service_map_ids ?? []) : [];

  if (existingId) {
    // Update: delete existing parent-level entries then re-insert
    await supabase.from("task_library_service_map").delete().eq("task_library_id", taskId).is("service_id", null);
  }
  if (serviceParentIds.length > 0) {
    await supabase.from("task_library_service_map").insert(
      serviceParentIds.map((service_parent_id) => ({ task_library_id: taskId, service_parent_id, service_id: null }))
    );
  }

  // Re-fetch from view to get service_map_count
  const { data: task, error: fetchError } = await supabase
    .from("vw_task_library")
    .select("*")
    .eq("id", taskId)
    .single();

  if (fetchError) {
    console.error("[saveLibraryTask] fetch", fetchError);
    return null;
  }

  return task;
}

export async function updateLibraryTask(
  id: string,
  input: Partial<LibraryTaskFormValues>
): Promise<ITaskLibrary | null> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user || !("dmc" in user)) return null;

  const { data, error } = await supabase
    .from("task_library")
    .update(sanitizeTaskInput(input))
    .eq("id", id)
    .select("id")
    .single();

  if (error) {
    console.error("[updateLibraryTask]", error);
    return null;
  }

  const { data: task, error: fetchError } = await supabase
    .from("vw_task_library")
    .select("*")
    .eq("id", data.id)
    .single();

  if (fetchError) {
    console.error("[updateLibraryTask] fetch", fetchError);
    return null;
  }

  return task;
}

export async function deleteLibraryTask(id: string): Promise<boolean> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user || !("dmc" in user)) return false;

  const { error } = await supabase.from("task_library").delete().eq("id", id);

  if (error) {
    console.error("[deleteLibraryTask]", error);
    return false;
  }

  return true;
}

// ─── Task Library Service Map ─────────────────────────────────────────────────

export async function getTaskServiceMap(taskId: string): Promise<ITaskLibraryServiceMapEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("task_library_service_map").select("*").eq("task_library_id", taskId);
  if (error) {
    console.error("[getTaskServiceMap]", error);
    return [];
  }
  return data ?? [];
}

/** Sync service map entries for a task to exactly the given parent IDs (parent-level only, service_id = null). */
export async function upsertTaskServiceMap(taskId: string, serviceParentIds: string[]): Promise<boolean> {
  const supabase = await createClient();

  // Remove entries no longer in the selection
  const removeQuery = supabase
    .from("task_library_service_map")
    .delete()
    .eq("task_library_id", taskId)
    .is("service_id", null);

  if (serviceParentIds.length > 0) {
    removeQuery.not("service_parent_id", "in", `(${serviceParentIds.join(",")})`);
  }

  const { error: deleteError } = await removeQuery;
  if (deleteError) {
    console.error("[upsertTaskServiceMap] delete", deleteError);
    return false;
  }

  if (serviceParentIds.length === 0) return true;

  const { error: insertError } = await supabase.from("task_library_service_map").insert(
    serviceParentIds.map((service_parent_id) => ({
      task_library_id: taskId,
      service_parent_id,
      service_id: null,
    }))
  );

  if (insertError) {
    console.error("[upsertTaskServiceMap] insert", insertError);
    return false;
  }

  return true;
}

/** Fetch a flat list of {id, name} for the given service category (hotel | tour | transfer). */
export async function getServiceOptionsForCategory(
  category: TaskServiceCategory
): Promise<{ id: string; name: string }[]> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user || !("dmc" in user)) return [];

  const dmcId = user.dmc.id;

  if (category === "hotel") {
    const { data, error } = await supabase
      .from("hotels")
      .select("id, hotel_name")
      .eq("dmc_id", dmcId)
      .order("hotel_name", { ascending: true });
    if (error) return [];
    return (data ?? []).map((r) => ({ id: r.id, name: r.hotel_name }));
  }

  if (category === "tour") {
    const { data, error } = await supabase
      .from("tours")
      .select("id, tour_title")
      .eq("dmc_id", dmcId)
      .order("tour_title", { ascending: true });
    if (error) return [];
    return (data ?? []).map((r) => ({ id: r.id, name: r.tour_title }));
  }

  // transfer
  const { data, error } = await supabase
    .from("transfers")
    .select("id, transfer_title")
    .eq("dmc_id", dmcId)
    .order("transfer_title", { ascending: true });
  if (error) return [];
  return (data ?? []).map((r) => ({ id: r.id, name: r.transfer_title }));
}

// ─── Query Task Summary (master table) ───────────────────────────────────────

export async function getQueryTaskSummary(): Promise<IQueryTaskSummary[]> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user || !("dmc" in user)) return [];

  const { data, error } = await supabase
    .from("vw_query_task_summary")
    .select("*")
    .eq("dmc_id", user.dmc.id)
    .order("total_tasks", { ascending: false });

  if (error) {
    console.error("[getQueryTaskSummary]", error);
    return [];
  }

  return data ?? [];
}

// ─── Query Tasks ──────────────────────────────────────────────────────────────

// Priority: 1=pending+overdue, 2=pending, 3=in_progress+overdue, 4=in_progress, 5=completed, 6=cancelled
function sortQueryTasks(tasks: ITaskDetails[]): ITaskDetails[] {
  const now = new Date();
  const priority = (t: ITaskDetails): number => {
    const overdue = t.due_at ? new Date(t.due_at) < now : false;
    if (t.status === "pending" && overdue) return 1;
    if (t.status === "pending") return 2;
    if (t.status === "in_progress" && overdue) return 3;
    if (t.status === "in_progress") return 4;
    if (t.status === "completed") return 5;
    if (t.status === "cancelled") return 6;
    return 7;
  };
  return [...tasks].sort((a, b) => {
    const diff = priority(a) - priority(b);
    if (diff !== 0) return diff;
    if (!a.due_at && !b.due_at) return 0;
    if (!a.due_at) return 1;
    if (!b.due_at) return -1;
    return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
  });
}

export async function getQueryTasks(
  queryId: string,
  params?: { status?: QueryTaskStatus; category?: TaskCategory; is_active?: boolean }
): Promise<ITaskDetails[]> {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const { data, error } = await supabase.rpc("get_query_tasks", {
    p_query_id: queryId,
    p_user_id: user?.id ?? null,
    p_status: params?.status ?? null,
    p_category: params?.category ?? null,
    p_is_active: params?.is_active ?? null,
  });

  if (error) {
    console.error("[getQueryTasks]", error);
    return [];
  }

  return sortQueryTasks(data ?? []);
}

export async function addQueryTask(input: {
  query_id: string;
  name: string;
  description?: string | null;
  category?: TaskCategory | null;
  due_at?: string | null;
  sort_order?: number | null;
}): Promise<ITaskDetails | null> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user || !("dmc" in user)) return null;

  const { data, error } = await supabase
    .from("query_tasks")
    .insert({ ...input, dmc_id: user.dmc.id, task_origin: "manual" })
    .select()
    .single();

  if (error) {
    console.error("[addQueryTask]", error);
    return null;
  }

  return data;
}

export async function updateQueryTask(
  id: string,
  input: Partial<{
    name: string;
    description: string | null;
    category: TaskCategory | null;
    due_at: string | null;
    status: QueryTaskStatus;
    sort_order: number | null;
    completed_at: string | null;
  }>
): Promise<ITaskDetails | null> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user || !("dmc" in user)) return null;

  const update = { ...input } as Record<string, unknown>;
  if (input.status === "completed" && !input.completed_at) {
    update.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase.from("query_tasks").update(update).eq("id", id).select().single();

  if (error) {
    console.error("[updateQueryTask]", error);
    return null;
  }

  return data;
}

export async function deleteQueryTask(id: string): Promise<boolean> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user || !("dmc" in user)) return false;

  const { error } = await supabase.from("query_tasks").delete().eq("id", id);

  if (error) {
    console.error("[deleteQueryTask]", error);
    return false;
  }

  return true;
}

// ─── Task Attachments ─────────────────────────────────────────────────────────

export async function getTaskAttachments(taskId: string): Promise<FileAttachment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("query_tasks").select("attachments").eq("id", taskId).single();
  if (error) {
    console.error("[getTaskAttachments]", error);
    return [];
  }
  return (data?.attachments as FileAttachment[]) ?? [];
}

export async function updateTaskAttachments(taskId: string, attachments: FileAttachment[]): Promise<boolean> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return false;
  const { error } = await supabase.from("query_tasks").update({ attachments }).eq("id", taskId);
  if (error) {
    console.error("[updateTaskAttachments]", error);
    return false;
  }
  return true;
}

// ─── Task Comments ────────────────────────────────────────────────────────────

export async function getTaskComments(taskId: string): Promise<ITaskComment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("query_task_comments")
    .select("*, profile:author_id(name)")
    .eq("query_task_id", taskId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[getTaskComments]", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    query_task_id: row.query_task_id,
    author_id: row.author_id,
    body: row.body,
    created_at: row.created_at,
    updated_at: row.updated_at,
    author_name: (row.profile as { name?: string } | null)?.name ?? null,
  }));
}

export async function addTaskComment(taskId: string, body: string): Promise<ITaskComment | null> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("query_task_comments")
    .insert({ query_task_id: taskId, author_id: user.id, body })
    .select("*, profile:author_id(name)")
    .single();

  if (error) {
    console.error("[addTaskComment]", error);
    return null;
  }

  return {
    id: data.id,
    query_task_id: data.query_task_id,
    author_id: data.author_id,
    body: data.body,
    created_at: data.created_at,
    updated_at: data.updated_at,
    author_name: (data.profile as { name?: string } | null)?.name ?? null,
  };
}

export async function markTaskCommentsSeen(taskId: string): Promise<void> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return;
  await supabase.rpc("mark_task_comments_seen", { p_user_id: user.id, p_task_id: taskId });
}

export async function deleteTaskComment(commentId: string): Promise<boolean> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return false;
  const { error } = await supabase.from("query_task_comments").delete().eq("id", commentId);
  if (error) {
    console.error("[deleteTaskComment]", error);
    return false;
  }
  return true;
}

export async function updateTaskComment(commentId: string, body: string): Promise<boolean> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return false;
  const { error } = await supabase
    .from("query_task_comments")
    .update({ body })
    .eq("id", commentId)
    .eq("author_id", user.id);
  if (error) {
    console.error("[updateTaskComment]", error);
    return false;
  }
  return true;
}

// ─── Task Assignments ─────────────────────────────────────────────────────────

/** Replaces all assignees for a task with the given user IDs. */
export async function setTaskAssignees(taskId: string, userIds: string[]): Promise<boolean> {
  const supabase = await createClient();

  const { error: deleteError } = await supabase.from("query_task_assignments").delete().eq("query_task_id", taskId);

  if (deleteError) {
    console.error("[setTaskAssignees] delete", deleteError);
    return false;
  }

  if (userIds.length === 0) return true;

  const { error: insertError } = await supabase
    .from("query_task_assignments")
    .insert(userIds.map((user_id) => ({ query_task_id: taskId, user_id })));

  if (insertError) {
    console.error("[setTaskAssignees] insert", insertError);
    return false;
  }

  return true;
}
