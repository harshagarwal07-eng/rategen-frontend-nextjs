"use server";

import { ISignin } from "@/components/forms/schemas/signin-schema";
import { createClient } from "../utils/supabase/server";
import { IDMCShort, IJWTPayload } from "../types/user";
import { jwtDecode } from "jwt-decode";
import { SupabaseClient, User } from "@supabase/supabase-js";
import { cache } from "react";
import { ISignup } from "@/components/forms/schemas/signup-schema";
import { env } from "@/lib/env";
import { IProfileForm } from "@/components/forms/schemas/profile-schema";
import { redirect } from "next/navigation";

export const register = async (formData: ISignup) => {
  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email: formData.adminEmail,
    password: formData.password,
    options: {
      data: {
        name: formData.name,
        userName: formData.adminName,
        streetAddress: formData.streetAddress,
        city_id: formData.city,
        city: "", // will be removed later
        country_id: formData.country,
        country: "", // will be removed later
        phone: formData.adminMobile.replace(/\+/g, ""),
        role: "dmc_admin",
        website: formData.website,
        create: true,
      },
      emailRedirectTo: env.META_URL,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
};

export const login = async (formData: ISignin) => {
  const supabase = await createClient();

  const {
    error,
    data: { session },
  } = await supabase.auth.signInWithPassword(formData);

  if (error || !session) return { error: error?.message ?? "Invalid login credentials" };

  const jwt: IJWTPayload = jwtDecode(session.access_token);

  if (!jwt?.user_role?.startsWith("dmc_")) {
    logout();
    return { error: "Invalid login credentials" };
  }

  return { success: true };
};

/**
 * SSO Login - allows any authenticated user (DMC or TA)
 * Used by OAuth SSO flow where role validation happens on the client app
 */
export const ssoLogin = async (formData: ISignin, redirectUrl?: string) => {
  const supabase = await createClient();

  const {
    error,
    data: { session },
  } = await supabase.auth.signInWithPassword(formData);

  if (error || !session) return { error: error?.message ?? "Invalid login credentials" };

  // If redirect URL provided, perform server-side redirect
  // This prevents the client from re-rendering with authenticated state
  if (redirectUrl) {
    redirect(redirectUrl);
  }

  return { success: true };
};

export const logout = async () => {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();

  if (error) return { error: error.message };

  return { success: true };
};

const getCurrentUserCache = async () => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    await logout();
    return null;
  }

  const { data, error: userError } = await supabase
    .from("dmc_team_members")
    .select("dmc:dmcs(name, id, avatar_url), role:user_roles(role)")
    .eq("user_id", user.id)
    .single();

  if (userError && user) return { ...user, role: "ta_" };

  if (userError) return null;

  const dmc = data.dmc as unknown as IDMCShort;
  const roleData = data?.role as unknown as { role: string };

  return {
    ...(user as User),
    dmc,
    role: roleData?.role,
  };
};
export const getCurrentUser = cache(getCurrentUserCache);

async function getUserCache(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase?: SupabaseClient<any, "public", any>
) {
  if (!supabase) supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}
export const getUser = cache(getUserCache);

async function getSessionCache(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase?: SupabaseClient<any, "public", any>
) {
  if (!supabase) supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jwt: any = jwtDecode(session.access_token);

  return jwt;
}
export const getSession = cache(getSessionCache);

export const updateUserProfile = async (formData: IProfileForm, userId: string) => {
  const supabase = await createClient();

  const { error: authError } = await supabase.auth.updateUser({
    data: {
      phone: formData.phone.replace(/\+/g, ""),
      name: formData.name,
    },
  });
  if (authError) return { error: authError.message };

  const { error } = await supabase
    .from("profile")
    .update({
      phone: formData.phone,
      name: formData.name,
    })
    .eq("user_id", userId);
  if (error) return { error: error.message };

  return { success: true };
};

export async function updatePassword(password: string, userId: string) {
  const supabase = await createClient(true);

  const { error } = await supabase.auth.admin.updateUserById(userId, {
    password,
  });

  if (error) return { error: error.message };

  return {
    success: "Password updated successfully",
  };
}
