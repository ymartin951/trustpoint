import { supabase } from "../lib/supabase";
import { Database } from "../lib/database.types";

type UserProfile = Database["public"]["Tables"]["users"]["Row"];

export interface DiscoveryFilters {
  minAge?: number;
  maxAge?: number;
  country?: string;
  religion?: string;
  relationship_goal?: "dating" | "marriage";
  gender?: "male" | "female" | "other";
}

export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  return { data, error };
};

const calculateAgeFromDob = (dateOfBirth: string | null) => {
  if (!dateOfBirth) return null;

  const birthDate = new Date(dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) return null;

  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  const monthDiff = now.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && now.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
};

export const getDiscoveryProfiles = async (
  currentUserId: string,
  _filters: Record<string, unknown> = {}
) => {
  const { data, error } = await supabase.rpc(
    "get_discovery_profiles_with_boosts",
    {
      p_current_user_id: currentUserId,
    }
  );

  return {
    data,
    error,
  };
};

export const uploadAvatar = async (userId: string, file: File) => {
  const fileExt = file.name.split(".").pop();
  const fileName = `${userId}/avatar.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(fileName, file, { upsert: true });

  if (uploadError) return { data: null, error: uploadError };

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(fileName);

  const { error: updateError } = await supabase
    .from("users")
    .update({ avatar_url: publicUrl })
    .eq("id", userId);

  if (updateError) return { data: null, error: updateError };

  return { data: publicUrl, error: null };
};

export const uploadPhoto = async (userId: string, file: File) => {
  const fileExt = file.name.split(".").pop();
  const fileName = `${userId}/${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("photos")
    .upload(fileName, file);

  if (uploadError) return { data: null, error: uploadError };

  const {
    data: { publicUrl },
  } = supabase.storage.from("photos").getPublicUrl(fileName);

  const { data, error: insertError } = await supabase
    .from("photos")
    .insert({ user_id: userId, photo_url: publicUrl })
    .select()
    .single();

  if (insertError) return { data: null, error: insertError };

  return { data, error: null };
};

export const getUserPhotos = async (userId: string) => {
  const { data, error } = await supabase
    .from("photos")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return { data, error };
};

export const deletePhoto = async (photoId: string, photoUrl: string) => {
  const path = photoUrl.split("/photos/")[1];

  const { error: storageError } = await supabase.storage
    .from("photos")
    .remove([path]);

  if (storageError) return { error: storageError };

  const { error: dbError } = await supabase
    .from("photos")
    .delete()
    .eq("id", photoId);

  return { error: dbError };
};