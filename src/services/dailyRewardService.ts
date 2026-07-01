import { supabase } from "../lib/supabase";

export type DailyRewardResult = {
  claimed: boolean;
  credits_awarded: number;
  message: string;
};

export const claimDailyReward = async (userId: string) => {
  const { data, error } = await supabase.rpc("claim_daily_reward", {
    p_user_id: userId,
  });

  return {
    data: data as DailyRewardResult | null,
    error,
  };
};