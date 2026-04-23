"use server";

import { IAddTeam } from "@/components/forms/schemas/add-team-schema";
import { IEditTeam } from "@/components/forms/schemas/edit-team-schema";
import { ICompanyProfile } from "@/components/forms/schemas/profile-schema";
import { IDMCShort } from "@/types/user";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { cache } from "react";

export const getDmcDetailsById = async (dmcId: string) => {
  const supabase = await createClient();

  const { data, error } = await supabase.from("dmcs").select("*").eq("id", dmcId).single();
  if (error) return { error: error.message };

  // will be reomove after updating the columns properly
  const processedData = {
    ...data,
    country: data.country_id,
    city: data.city_id,
  };
  //---------------------------------------------------
  return processedData;
};

export const updateDmc = async (dmcId: string, formdata: ICompanyProfile) => {
  const supabase = await createClient();

  // will be reomove after updating the columns properly
  const processedData = {
    ...formdata,
    country: "",
    city: "",
    country_id: formdata.country,
    city_id: formdata.city,
  };
  //---------------------------------------------------

  const { data, error } = await supabase.from("dmcs").update(processedData).eq("id", dmcId).select().single();

  if (error) return { error: error.message };

  return { data };
};

export const fetchMemberOptions = async (dmcId: string): Promise<import("@/types/common").IOption[]> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("dmc_team_members")
    .select("user_id, member:profile(name)")
    .eq("dmc_id", dmcId);

  if (error || !data) return [];

  return data.map(({ user_id, member }) => ({
    value: user_id,
    // @ts-expect-error - TS supabase error
    label: `${member?.name ?? "Unknown"}`,
  }));
};

export const getMembers = async (dmcId?: string) => {
  const supabase = await createClient();

  if (!dmcId) return [];

  const { data: membersData, error: membersError } = await supabase
    .from("dmc_team_members")
    .select("user_id, member:profile(name,phone,avatar_url,email), role:user_roles(role)")
    .eq("dmc_id", dmcId);
  if (membersError) return [];

  const members = membersData?.map(({ member, role, user_id }) => ({
    id: user_id,
    // @ts-expect-error - TS supabase error
    name: member.name,
    // @ts-expect-error - TS supabase error
    phone: member.phone,
    // @ts-expect-error - TS supabase error
    avatar_url: member.avatar_url,
    // @ts-expect-error - TS supabase error
    email: member.email,
    // @ts-expect-error - TS supabase error
    designation: role?.role,
  }));

  return members || [];
};

export const createMember = async (formData: IAddTeam, org: IDMCShort) => {
  const supabase = await createClient(true);

  const { error } = await supabase.auth.admin.createUser({
    email: formData.email,
    email_confirm: true,
    password: formData.password,
    user_metadata: {
      name: org.name,
      userName: formData.name,
      role: formData.designation,
      create: false,
      dmc_id: org.id,
      phone: formData.phone.replace(/\+/g, ""),
    },
  });
  if (error) return { error: error.message };

  // await sendTeamWelcomeMail({
  //   email: formData.email,
  //   username: formData.name,
  //   password: formData.password,
  //   loginUrl: `${env.META_URL}/login`,
  // });

  revalidatePath("/settings/team");
  return { success: true };
};

export const updateMember = async (formData: IEditTeam, userId: string) => {
  const supabase = await createClient(true);

  const { error } = await supabase.auth.admin.updateUserById(userId, {
    email: formData.email,
    email_confirm: true,
    user_metadata: {
      userName: formData.name,
      role: formData.designation,
      phone: formData.phone.replace(/\+/g, ""),
    },
  });

  if (error) return { error: error.message };

  revalidatePath("/settings/team");
  return { success: true };
};

export async function updateMemberPassword(password: string, userId: string, dmcId: string) {
  const supabase = await createClient(true);

  const { data, error: dmcError } = await supabase
    .from("dmc_team_members")
    .select("id")
    .eq("user_id", userId)
    .eq("dmc_id", dmcId)
    .single();

  if (dmcError) return { error: dmcError.message };
  if (!data) return { error: "User not found" };

  const { error } = await supabase.auth.admin.updateUserById(userId, {
    password,
  });

  if (error) return { error: error.message };

  return {
    success: "Password updated successfully",
  };
}

const getServicesOfferedCache = async () => {
  const supabase = await createClient();

  const { data, error } = await supabase.from("services_offered").select("*").eq("active", true);

  if (error) return { error: error.message };

  const serviceOptions = data.map((service) => ({
    label: service.label,
    value: service.id,
  }));

  return { serviceOptions };
};
export const getServicesOffered = cache(getServicesOfferedCache);
