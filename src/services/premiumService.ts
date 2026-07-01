import { supabase } from "../lib/supabase";

export type SubscriptionStatus = {
  plan_type: "free" | "premium";
  status: "active" | "inactive" | "cancelled" | "expired";
  is_premium: boolean;
  started_at?: string | null;
  expires_at?: string | null;
};

export const getUserSubscription = async (userId: string) => {
  const { data, error } = await (supabase.rpc as any)("get_user_subscription", {
    p_user_id: userId,
  });

  return {
    data: data as SubscriptionStatus | null,
    error,
  };
};

export const hasActivePremium = async (userId: string) => {
  const { data, error } = await (supabase.rpc as any)("has_active_premium", {
    p_user_id: userId,
  });

  return {
    isPremium: Boolean(data),
    error,
  };
};

export const initializePremiumPayment = async () => {
  const { data, error } = await supabase.functions.invoke(
    "initialize-premium-payment",
    {
      body: {
        returnUrl: `${window.location.origin}/premium`,
        source: "premium_page",
      },
    }
  );

  return {
    authorizationUrl:
      (data?.authorization_url as string | undefined) ||
      (data?.authorizationUrl as string | undefined),
    reference: data?.reference as string | undefined,
    plan: data?.plan,
    error,
  };
};

export const verifyPremiumPayment = async (reference: string) => {
  const { data, error } = await supabase.functions.invoke(
    "verify-premium-payment",
    {
      body: { reference },
    }
  );

  return {
    data,
    error,
  };
};