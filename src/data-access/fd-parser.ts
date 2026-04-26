"use client";

import axios from "axios";
import { createClient } from "@/utils/supabase/client";
import { env } from "@/lib/env";
import type {
  FDParserCreateResponse,
  FDParserSaveResponse,
  FDParserSession,
} from "@/types/fd-parser";

const fdParserApi = axios.create({
  baseURL: env.API_URL,
  headers: { "Content-Type": "application/json" },
});

fdParserApi.interceptors.request.use(async (config) => {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

const BASE = "/api/fd-parser";

export async function fdParserListSessions(params?: {
  limit?: number;
  packageId?: string;
}): Promise<FDParserSession[]> {
  const { data } = await fdParserApi.get<FDParserSession[]>(`${BASE}/sessions`, {
    params: {
      ...(params?.limit ? { limit: params.limit } : {}),
      ...(params?.packageId ? { package_id: params.packageId } : {}),
    },
  });
  return data;
}

export async function fdParserGetSession(id: string): Promise<FDParserSession> {
  const { data } = await fdParserApi.get<FDParserSession>(`${BASE}/sessions/${id}`);
  return data;
}

export async function fdParserCreateSession(form: {
  file: File;
  title: string;
  tour_code: string;
  duration_nights: number;
  duration_days: number;
  document_instructions?: string;
  ai_remarks?: string;
}): Promise<FDParserCreateResponse> {
  const fd = new FormData();
  fd.append("file", form.file);
  fd.append("title", form.title);
  fd.append("tour_code", form.tour_code);
  fd.append("duration_nights", String(form.duration_nights));
  fd.append("duration_days", String(form.duration_days));
  if (form.document_instructions) {
    fd.append("document_instructions", form.document_instructions);
  }
  if (form.ai_remarks) fd.append("ai_remarks", form.ai_remarks);
  const { data } = await fdParserApi.post<FDParserCreateResponse>(
    `${BASE}/sessions`,
    fd,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data;
}

export async function fdParserSaveSession(id: string): Promise<FDParserSaveResponse> {
  const { data } = await fdParserApi.post<FDParserSaveResponse>(
    `${BASE}/sessions/${id}/save`,
  );
  return data;
}

export function fdParserStreamUrl(id: string): string {
  return `${env.API_URL}${BASE}/sessions/${id}/stream`;
}
