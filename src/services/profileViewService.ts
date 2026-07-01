import { supabase } from "../lib/supabase";

export type UnlockViewersResult = {
  success: boolean;
  message?: string;
  expires_at?: string;
};

export type RecordProfileViewResult = {
  recorded: boolean;
  message?: string;
};

export type ProfileViewRow = {
  id: string;
  viewer_id: string;
  viewed_user_id: string;
  created_at: string;
};

export const recordProfileView = async (
  viewerId: string,
  viewedUserId: string
) => {
  const { data, error } = await (supabase.rpc as any)("record_profile_view", {
    p_viewer_id: viewerId,
    p_viewed_user_id: viewedUserId,
  });

  return {
    data: data as RecordProfileViewResult | null,
    error,
  };
};

export const hasActiveProfileViewUnlock = async (userId: string) => {
  const { data, error } = await (supabase.rpc as any)(
    "has_active_profile_view_unlock",
    {
      p_user_id: userId,
    }
  );

  return {
    unlocked: Boolean(data),
    error,
  };
};

export const unlockProfileViewers = async (userId: string, cost = 10) => {
  const { data, error } = await (supabase.rpc as any)(
    "unlock_profile_viewers",
    {
      p_user_id: userId,
      p_cost: cost,
    }
  );

  return {
    data: data as UnlockViewersResult | null,
    error,
  };
};

export const getProfileViewCount = async (userId: string) => {
  const { count, error } = await (supabase as any)
    .from("profile_views")
    .select("id", { count: "exact", head: true })
    .eq("viewed_user_id", userId);

  return {
    count: count ?? 0,
    error,
  };
};

export const getProfileViewers = async (userId: string) => {
  const { data, error } = await (supabase as any)
    .from("profile_views")
    .select("id, viewer_id, viewed_user_id, created_at")
    .eq("viewed_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  return {
    data: (data ?? []) as ProfileViewRow[],
    error,
  };
};