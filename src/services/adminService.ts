import { supabase } from "../lib/supabase";
import type { Database } from "../lib/database.types";

type UserRow = Database["public"]["Tables"]["users"]["Row"];

export type AdminUser = UserRow & {
  credit_balance: number;
  verification_id_type?: "ghana_card" | "drivers_license" | "nhis" | "passport" | null;
  verification_id_image_url?: string | null;
  verification_selfie_url?: string | null;
};

export const getAllUsers = async () => {
  const { data: users, error } = await supabase
    .from("users")
    .select(
      `
      *,
      verification_status,
      verification_note,
      verification_image_url,
      verification_id_type,
      verification_id_image_url,
      verification_selfie_url,
      submitted_for_verification_at,
      verified_at,
      verified_by
    `
    )
    .order("created_at", { ascending: false });

  if (error) return { data: [] as AdminUser[], error };

  const usersWithCredits = await Promise.all(
    (users ?? []).map(async (user) => {
      const { data: wallet } = await supabase
        .from("credit_wallets")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle();

      return {
        ...user,
        credit_balance: wallet?.balance ?? 0,
      } as AdminUser;
    })
  );

  return { data: usersWithCredits, error: null };
};

export const getAllReports = async () => {
  const { data, error } = await (supabase.from("reports" as any) as any)
    .select(
      `
      *,
      reporter:reporter_id(*),
      reported:reported_user_id(*)
    `
    )
    .order("created_at", { ascending: false });

  return { data: data ?? [], error };
};

export const updateReportStatus = async (
  reportId: string,
  status: "pending" | "reviewed" | "resolved"
) => {
  const { error } = await (supabase.from("reports" as any) as any)
    .update({ status })
    .eq("id", reportId);

  return { error };
};

export const banUser = async (userId: string) => {
  const { error } = await supabase
    .from("users")
    .update({
      is_banned: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  return { error };
};

export const unbanUser = async (userId: string) => {
  const { error } = await supabase
    .from("users")
    .update({
      is_banned: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  return { error };
};

export const verifyUser = async (userId: string) => {
  const { error } = await supabase
    .from("users")
    .update({
      verified: true,
      verification_status: "verified",
      verification_note: null,
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any)
    .eq("id", userId);

  return { error };
};

export const unverifyUser = async (userId: string) => {
  const { error } = await supabase
    .from("users")
    .update({
      verified: false,
      verification_status: "not_submitted",
      verification_note: null,
      submitted_for_verification_at: null,
      verified_at: null,
      verified_by: null,
      updated_at: new Date().toISOString(),
    } as any)
    .eq("id", userId);

  return { error };
};

export const rejectUserVerification = async (
  userId: string,
  note: string
) => {
  const { error } = await supabase
    .from("users")
    .update({
      verified: false,
      verification_status: "rejected",
      verification_note: note,
      verified_at: null,
      verified_by: null,
      updated_at: new Date().toISOString(),
    } as any)
    .eq("id", userId);

  return { error };
};

export const getUserStats = async () => {
  const { count: totalUsers } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true });

  const { count: verifiedUsers } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("verified", true);

  const { count: bannedUsers } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("is_banned", true);

  const { count: pendingVerificationUsers } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("verification_status", "pending");

  const { count: rejectedVerificationUsers } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("verification_status", "rejected");

  const { count: totalMatches } = await supabase
    .from("matches")
    .select("*", { count: "exact", head: true });

  const { count: pendingReports } = await (supabase.from("reports" as any) as any)
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  return {
    totalUsers: totalUsers ?? 0,
    verifiedUsers: verifiedUsers ?? 0,
    bannedUsers: bannedUsers ?? 0,
    pendingVerificationUsers: pendingVerificationUsers ?? 0,
    rejectedVerificationUsers: rejectedVerificationUsers ?? 0,
    totalMatches: totalMatches ?? 0,
    pendingReports: pendingReports ?? 0,
  };
};