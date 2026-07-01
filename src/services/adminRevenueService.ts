import { supabase } from "../lib/supabase";
import type { Database } from "../lib/database.types";

type CreditTransaction =
  Database["public"]["Tables"]["credit_transactions"]["Row"];

export type RevenueSummary = {
  totalRevenue: number;
  todayRevenue: number;
  totalCreditsSold: number;
  totalPurchases: number;
};

export type TopBuyer = {
  user_id: string;
  total_spent: number;
  total_credits: number;
  purchase_count: number;
  profile: {
    full_name: string | null;
    avatar_url: string | null;
    email?: string | null;
  } | null;
};

const getTodayStartIso = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return start.toISOString();
};

export const getRevenueSummary = async (): Promise<{
  data: RevenueSummary;
  error: any;
}> => {
  const { data, error } = await supabase
    .from("credit_transactions")
    .select("*")
    .eq("type", "purchase");

  if (error) {
    return {
      data: {
        totalRevenue: 0,
        todayRevenue: 0,
        totalCreditsSold: 0,
        totalPurchases: 0,
      },
      error,
    };
  }

  const todayStart = getTodayStartIso();

  const purchases = (data ?? []) as CreditTransaction[];

  const totalRevenue = purchases.reduce(
    (sum, item) => sum + Number(item.amount_paid ?? 0),
    0
  );

  const todayRevenue = purchases
    .filter((item) => item.created_at >= todayStart)
    .reduce((sum, item) => sum + Number(item.amount_paid ?? 0), 0);

  const totalCreditsSold = purchases.reduce(
    (sum, item) => sum + Number(item.amount ?? 0),
    0
  );

  return {
    data: {
      totalRevenue,
      todayRevenue,
      totalCreditsSold,
      totalPurchases: purchases.length,
    },
    error: null,
  };
};

export const getRecentPurchases = async (limit = 10): Promise<{
  data: CreditTransaction[];
  error: any;
}> => {
  const { data, error } = await supabase
    .from("credit_transactions")
    .select("*")
    .eq("type", "purchase")
    .order("created_at", { ascending: false })
    .limit(limit);

  return {
    data: (data ?? []) as CreditTransaction[],
    error,
  };
};

export const getTopBuyers = async (): Promise<{
  data: TopBuyer[];
  error: any;
}> => {
  const { data, error } = await supabase
    .from("credit_transactions")
    .select("*")
    .eq("type", "purchase");

  if (error) {
    return { data: [], error };
  }

  const grouped = new Map<
    string,
    {
      total_spent: number;
      total_credits: number;
      purchase_count: number;
    }
  >();

  for (const item of (data ?? []) as CreditTransaction[]) {
    const current = grouped.get(item.user_id) ?? {
      total_spent: 0,
      total_credits: 0,
      purchase_count: 0,
    };

    current.total_spent += Number(item.amount_paid ?? 0);
    current.total_credits += Number(item.amount ?? 0);
    current.purchase_count += 1;

    grouped.set(item.user_id, current);
  }

  const sorted = Array.from(grouped.entries())
    .map(([user_id, values]) => ({
      user_id,
      ...values,
    }))
    .sort((a, b) => b.total_spent - a.total_spent)
    .slice(0, 10);

  const buyers = await Promise.all(
    sorted.map(async (buyer) => {
      const { data: profile } = await supabase
        .from("users")
        .select("full_name, avatar_url")
        .eq("id", buyer.user_id)
        .maybeSingle();

      return {
        ...buyer,
        profile: profile ?? null,
      };
    })
  );

  return { data: buyers, error: null };
};


export type DailyRevenuePoint = {
  date: string;
  revenue: number;
  purchases: number;
};

export const getDailyRevenueChart = async (days = 14): Promise<{
  data: DailyRevenuePoint[];
  error: any;
}> => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (days - 1));
  startDate.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("credit_transactions")
    .select("created_at, amount_paid")
    .eq("type", "purchase")
    .gte("created_at", startDate.toISOString())
    .order("created_at", { ascending: true });

  if (error) {
    return { data: [], error };
  }

  const chartMap = new Map<string, DailyRevenuePoint>();

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);

    const key = date.toISOString().slice(0, 10);

    chartMap.set(key, {
      date: key,
      revenue: 0,
      purchases: 0,
    });
  }

  for (const item of data ?? []) {
    const key = new Date(item.created_at).toISOString().slice(0, 10);
    const existing = chartMap.get(key);

    if (existing) {
      existing.revenue += Number(item.amount_paid ?? 0);
      existing.purchases += 1;
    }
  }

  return {
    data: Array.from(chartMap.values()),
    error: null,
  };
};