import { supabase } from "./supabase";

export const uploadAvatar = async (file: File, userId: string) => {
  const fileExt = file.name.split(".").pop();
  const filePath = `${userId}/avatar.${fileExt}`;

  // Upload
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, file, { upsert: true });

    if (uploadError) {
  console.error("UPLOAD ERROR:", uploadError);
  throw uploadError;
}

  if (uploadError) {
    throw uploadError;
  }

  

  // Get public URL
  const { data } = supabase.storage
    .from("avatars")
    .getPublicUrl(filePath);

console.log("Buckets:", data);
console.log("Error:", Error);

  return data.publicUrl;
};