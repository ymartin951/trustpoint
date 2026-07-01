import { supabase } from "../lib/supabase";

export const activateBoost = async (
  userId: string,
  minutes: number,
  cost: number
) => {
  const { data, error } = await supabase.rpc(
    "activate_profile_boost",
    {
      p_user_id: userId,
      p_duration_minutes: minutes,
      p_cost: cost,
    }
  );

  return { data, error };
};

export const getActiveBoost = async (userId: string) => {
  const { data, error } = await supabase
    .from("profile_boosts")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .gt("ends_at", new Date().toISOString())
    .maybeSingle();

  return { data, error };
};