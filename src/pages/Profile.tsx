import { useState, useEffect, useRef, ChangeEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  MapPin,
  Edit2,
  Save,
  X,
  Heart,
  MessageCircle,
  Camera,
  Plus,
  Trash2,
  BadgeCheck,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  Upload,
  Clock,
  CreditCard,
  UserRoundCheck,
  Eye,
  LockKeyhole,
  Unlock,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import {
  uploadAvatar,
  uploadPhoto,
  getUserPhotos,
  deletePhoto,
} from "../services/userService";
import { likeUser, checkIfMatched } from "../services/matchService";
import { getOrCreateConversation } from "../services/chatService";
import {
  recordProfileView,
  getProfileViewCount,
  getProfileViewers,
  hasActiveProfileViewUnlock,
  unlockProfileViewers,
} from "../services/profileViewService";
import { calculateAge, getAvatarUrl } from "../lib/utils";
import { getProfileStrength } from "../lib/profileScore";
import { Database, VerificationStatus } from "../lib/database.types";

type User = Database["public"]["Tables"]["users"]["Row"];
type PhotoItem = Database["public"]["Tables"]["photos"]["Row"];

type GhanaIdType = "ghana_card" | "drivers_license" | "nhis" | "passport";

type VerificationUser = User & {
  verification_id_type?: GhanaIdType | null;
  verification_id_image_url?: string | null;
  verification_selfie_url?: string | null;
  verification_image_url?: string | null;
  verification_note?: string | null;
  submitted_for_verification_at?: string | null;
  verified_at?: string | null;
  verified_by?: string | null;
  profile_completion?: number | null;
  profile_completed_reward?: boolean | null;
};

type ProfileFormData = {
  full_name: string;
  bio: string;
  city: string;
  region: string;
  country: string;
  education: string;
  religion: string;
};

type ToastType = "success" | "error" | "info";

type ToastState = {
  message: string;
  type: ToastType;
};

type ProfileViewRow = {
  id: string;
  viewer_id: string;
  viewed_user_id: string;
  created_at: string;
};

type UnlockResult = {
  success: boolean;
  message?: string;
  expires_at?: string;
};

type ProfileCompletionRewardResult = {
  success: boolean;
  rewarded: boolean;
  reward?: number;
  balance?: number;
  message?: string;
};

const VERIFICATION_BUCKET = "verification-documents";

const EDUCATION_OPTIONS = [
  "Basic School",
  "JHS",
  "SHS",
  "Diploma",
  "HND",
  "Bachelor's Degree",
  "Master's Degree",
  "PhD",
  "Other",
];

const RELIGION_OPTIONS = [
  "Christianity",
  "Islam",
  "Traditional",
  "Other",
  "Prefer not to say",
];

const ID_TYPES: Array<{
  value: GhanaIdType;
  label: string;
  description: string;
}> = [
  {
    value: "ghana_card",
    label: "Ghana Card / ECOWAS Identity Card",
    description: "National ID card issued in Ghana",
  },
  {
    value: "drivers_license",
    label: "Driving License",
    description: "Valid Ghana driving license",
  },
  {
    value: "nhis",
    label: "NHIS Card",
    description: "National Health Insurance Card",
  },
  {
    value: "passport",
    label: "Ghana Passport",
    description: "Valid Ghanaian passport",
  },
];

const sanitizeFileName = (name: string) => {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
};

const hasText = (value: unknown) => {
  return typeof value === "string" && value.trim().length > 0;
};

const getIdTypeLabel = (value?: string | null) => {
  return ID_TYPES.find((item) => item.value === value)?.label ?? "Not selected";
};

const isProfileVerified = (profile: VerificationUser) => {
  return profile.verified === true || profile.verification_status === "verified";
};

const isUnlockResult = (value: unknown): value is UnlockResult => {
  return typeof value === "object" && value !== null && "success" in value;
};

const isProfileCompletionRewardResult = (
  value: unknown
): value is ProfileCompletionRewardResult => {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    "rewarded" in value
  );
};

const calculateAccurateProfileCompletion = (
  profile: VerificationUser,
  photos: PhotoItem[]
) => {
  const checks = [
    hasText(profile.full_name),
    hasText(profile.avatar_url),
    hasText(profile.bio),
    hasText(profile.gender),
    hasText(profile.date_of_birth),
    hasText(profile.city),
    hasText(profile.region),
    hasText(profile.country),
    hasText(profile.education),
    hasText(profile.religion),
    photos.length > 0,
    hasText(profile.verification_id_type),
    hasText(profile.verification_id_image_url),
    hasText(profile.verification_selfie_url),
  ];

  const completed = checks.filter(Boolean).length;
  const percentage = Math.round((completed / checks.length) * 100);

  return Math.min(100, Math.max(0, percentage));
};

const getVerificationStatusConfig = (
  status: VerificationStatus | null | undefined,
  verified: boolean
) => {
  if (verified || status === "verified") {
    return {
      label: "Verified",
      title: "You are verified",
      description:
        "Your account has been verified. Verified users build more trust and usually get better responses.",
      icon: ShieldCheck,
      badgeClass: "bg-blue-50 text-blue-700 border-blue-100",
      boxClass: "bg-blue-50 border-blue-100 text-blue-800",
    };
  }

  if (status === "pending") {
    return {
      label: "Pending Review",
      title: "Verification under review",
      description:
        "Your ID and selfie have been submitted. Admin will review your verification soon.",
      icon: Clock,
      badgeClass: "bg-amber-50 text-amber-700 border-amber-100",
      boxClass: "bg-amber-50 border-amber-100 text-amber-800",
    };
  }

  if (status === "rejected") {
    return {
      label: "Rejected",
      title: "Verification rejected",
      description:
        "Your verification was rejected. Check the admin note below, correct the issue, and submit again.",
      icon: ShieldAlert,
      badgeClass: "bg-red-50 text-red-700 border-red-100",
      boxClass: "bg-red-50 border-red-100 text-red-800",
    };
  }

  return {
    label: "Not Submitted",
    title: "Verify your identity",
    description:
      "Select your ID type, upload your ID card, and upload a selfie for admin review.",
    icon: ShieldQuestion,
    badgeClass: "bg-gray-50 text-gray-700 border-gray-200",
    boxClass: "bg-gray-50 border-gray-200 text-gray-800",
  };
};

export const Profile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile: currentUser, updateProfile, refreshProfile } = useAuth();

  const recordedViewRef = useRef<string | null>(null);

  const [profile, setProfile] = useState<VerificationUser | null>(null);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isMatched, setIsMatched] = useState(false);
  const [hasLiked, setHasLiked] = useState(false);
  const [liking, setLiking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [startingChat, setStartingChat] = useState(false);

  const [verificationIdType, setVerificationIdType] =
    useState<GhanaIdType | "">("");
  const [idUploading, setIdUploading] = useState(false);
  const [selfieUploading, setSelfieUploading] = useState(false);
  const [verificationSubmitting, setVerificationSubmitting] = useState(false);

  const [toast, setToast] = useState<ToastState | null>(null);

  const [profileViewCount, setProfileViewCount] = useState(0);
  const [profileViewers, setProfileViewers] = useState<ProfileViewRow[]>([]);
  const [viewersUnlocked, setViewersUnlocked] = useState(false);
  const [unlockingViewers, setUnlockingViewers] = useState(false);
  const [loadingViewers, setLoadingViewers] = useState(false);

  const isOwnProfile = !id || id === currentUser?.id;

  const [formData, setFormData] = useState<ProfileFormData>({
    full_name: "",
    bio: "",
    city: "",
    region: "",
    country: "",
    education: "",
    religion: "",
  });

  const showToast = (message: string, type: ToastType = "info") => {
    setToast({ message, type });

    window.setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const completion = profile
    ? calculateAccurateProfileCompletion(profile, photos)
    : 0;

  const strength = getProfileStrength(completion);

  const verificationConfig = profile
    ? getVerificationStatusConfig(profile.verification_status, profile.verified)
    : null;

  const VerificationIcon = verificationConfig?.icon ?? ShieldQuestion;

  const syncProfileCompletion = async (
    userId: string,
    nextProfile: VerificationUser,
    nextPhotos: PhotoItem[]
  ) => {
    const nextCompletion = calculateAccurateProfileCompletion(
      nextProfile,
      nextPhotos
    );

    const { data, error } = await (supabase.rpc as any)(
      "award_profile_completion_reward",
      {
        p_user_id: userId,
        p_completion: nextCompletion,
        p_reward: 10,
      }
    );

    if (error) {
      console.error("Profile completion reward RPC failed:", error);
      return;
    }

    if (!isProfileCompletionRewardResult(data)) {
      console.error("Unexpected profile reward response:", data);
      return;
    }

    setProfile((prev) =>
      prev
        ? {
            ...prev,
            profile_completion: nextCompletion,
            profile_completed_reward:
              data.rewarded || prev.profile_completed_reward === true,
          }
        : prev
    );

    if (data.rewarded) {
      showToast(
        `🎉 Your profile is 100% complete. You earned ${
          data.reward ?? 10
        } credits!`,
        "success"
      );
    }
  };

  const getProfileNotes = () => {
    if (!profile) return [];

    const items: string[] = [];

    if (isOwnProfile) {
      if (!hasText(profile.avatar_url)) items.push("Upload a profile photo");
      if (!hasText(profile.bio)) items.push("Write a short bio");
      if (!hasText(profile.gender)) items.push("Add your gender");
      if (!hasText(profile.date_of_birth)) items.push("Add your date of birth");

      if (
        !hasText(profile.city) ||
        !hasText(profile.region) ||
        !hasText(profile.country)
      ) {
        items.push("Add your city, region, and country");
      }

      if (!hasText(profile.education)) items.push("Add your education");
      if (!hasText(profile.religion)) items.push("Add your religion");
      if (!photos.length) items.push("Upload gallery photos");

      if (!hasText(profile.verification_id_type)) {
        items.push("Select your ID type");
      }

      if (!hasText(profile.verification_id_image_url)) {
        items.push("Upload your ID card");
      }

      if (!hasText(profile.verification_selfie_url)) {
        items.push("Upload a selfie");
      }
    } else {
      if (!hasText(profile.avatar_url)) items.push("No profile photo");
      if (!hasText(profile.bio)) items.push("No bio");
      if (!hasText(profile.education)) items.push("No education");
      if (!hasText(profile.religion)) items.push("No religion");
      if (!photos.length) items.push("No gallery photos");
    }

    return items;
  };

  const profileNotes = getProfileNotes();

  const refreshCurrentProfileFromDb = async (userId: string) => {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("Failed to refresh profile:", error);
      showToast("Failed to refresh profile.", "error");
      return null;
    }

    if (data) {
      const nextProfile = data as VerificationUser;
      setProfile(nextProfile);
      setVerificationIdType(nextProfile.verification_id_type ?? "");
      return nextProfile;
    }

    return null;
  };

  const loadPhotos = async (userId: string) => {
    const result = await getUserPhotos(userId);

    if (result?.data) {
      const nextPhotos = result.data as PhotoItem[];
      setPhotos(nextPhotos);
      return nextPhotos;
    }

    setPhotos([]);
    return [];
  };

  const loadProfileViewData = async (userId: string) => {
    try {
      setLoadingViewers(true);

      const [countResult, unlockResult] = await Promise.all([
        getProfileViewCount(userId),
        hasActiveProfileViewUnlock(userId),
      ]);

      if (countResult.error) {
        console.error("Failed to load profile view count:", countResult.error);
      }

      if (unlockResult.error) {
        console.error("Failed to check profile view unlock:", unlockResult.error);
      }

      setProfileViewCount(countResult.count ?? 0);
      setViewersUnlocked(Boolean(unlockResult.unlocked));

      if (unlockResult.unlocked) {
        const viewersResult = await getProfileViewers(userId);

        if (viewersResult.error) {
          console.error("Failed to load profile viewers:", viewersResult.error);
          setProfileViewers([]);
        } else {
          setProfileViewers(
            (viewersResult.data ?? []) as unknown as ProfileViewRow[]
          );
        }
      } else {
        setProfileViewers([]);
      }
    } catch (error) {
      console.error("Unexpected profile view load error:", error);
      setProfileViewCount(0);
      setProfileViewers([]);
      setViewersUnlocked(false);
    } finally {
      setLoadingViewers(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      if (isOwnProfile && currentUser) {
        const userProfile = currentUser as VerificationUser;

        setProfile(userProfile);
        setVerificationIdType(userProfile.verification_id_type ?? "");

        setFormData({
          full_name: currentUser.full_name ?? "",
          bio: currentUser.bio ?? "",
          city: currentUser.city ?? "",
          region: currentUser.region ?? "",
          country: currentUser.country ?? "",
          education: currentUser.education ?? "",
          religion: currentUser.religion ?? "",
        });

        const [nextPhotos] = await Promise.all([
          loadPhotos(currentUser.id),
          loadProfileViewData(currentUser.id),
        ]);

        await syncProfileCompletion(currentUser.id, userProfile, nextPhotos);

        return;
      }

      if (id) {
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("id", id)
          .maybeSingle();

        if (error) {
          console.error("Failed to load profile:", error);
          setProfile(null);
          setPhotos([]);
          showToast("Failed to load profile.", "error");
          return;
        }

        if (data) {
          const userProfile = data as VerificationUser;
          setProfile(userProfile);
          setVerificationIdType(userProfile.verification_id_type ?? "");
          await loadPhotos(data.id);
        } else {
          setProfile(null);
          setPhotos([]);
        }
      }
    };

    void load();
  }, [id, currentUser, isOwnProfile]);

  useEffect(() => {
    const run = async () => {
      if (!currentUser?.id) return;
      if (!id) return;
      if (currentUser.id === id) return;

      const viewKey = `${currentUser.id}-${id}`;

      if (recordedViewRef.current === viewKey) {
        return;
      }

      recordedViewRef.current = viewKey;

      const { data, error } = await recordProfileView(currentUser.id, id);

      if (error) {
        console.error("Failed to record profile view:", error);
        recordedViewRef.current = null;
        return;
      }

      console.log("Profile view result:", data);
    };

    void run();
  }, [currentUser?.id, id]);

  useEffect(() => {
    if (!isOwnProfile && currentUser && id) {
      const run = async () => {
        const [{ matched }, likeCheck] = await Promise.all([
          checkIfMatched(currentUser.id, id),
          supabase
            .from("likes")
            .select("id")
            .eq("sender_id", currentUser.id)
            .eq("receiver_id", id)
            .maybeSingle(),
        ]);

        setIsMatched(matched);
        setHasLiked(!!likeCheck.data);
      };

      void run();
    } else {
      setIsMatched(false);
      setHasLiked(false);
    }
  }, [id, currentUser, isOwnProfile]);

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLike = async () => {
    if (!currentUser || !profile || isOwnProfile || hasLiked) return;

    try {
      setLiking(true);

      const res = await likeUser(currentUser.id, profile.id);

      if (res.error) {
        console.error("Failed to like profile:", res.error);
        showToast("Failed to like profile. Please try again.", "error");
        return;
      }

      setHasLiked(true);

      if (res.match) {
        showToast("🎉 It's a match!", "success");
        setIsMatched(true);
      } else {
        showToast("❤️ Profile liked!", "success");
      }
    } finally {
      setLiking(false);
    }
  };

  const handleMessage = async () => {
    if (!currentUser || !profile || isOwnProfile || !isMatched) return;

    try {
      setStartingChat(true);

      const { data, error } = await getOrCreateConversation(
        currentUser.id,
        profile.id
      );

      if (error || !data) {
        console.error("Failed to open conversation:", error);
        showToast("Failed to open chat. Please try again.", "error");
        return;
      }

      navigate(`/chat/${data.id}`);
    } finally {
      setStartingChat(false);
    }
  };

  const handleSave = async () => {
    if (!isOwnProfile || !currentUser) return;

    try {
      setSaving(true);

      const { error } = await updateProfile({
        full_name: formData.full_name,
        bio: formData.bio,
        city: formData.city,
        region: formData.region,
        country: formData.country,
        education: formData.education,
        religion: formData.religion,
      });

      if (error) {
        console.error("Failed to save profile:", error);
        showToast("Failed to save profile. Please try again.", "error");
        return;
      }

      const optimisticProfile = profile
        ? {
            ...profile,
            ...formData,
          }
        : null;

      if (optimisticProfile) {
        setProfile(optimisticProfile);
        await syncProfileCompletion(currentUser.id, optimisticProfile, photos);
      }

      setEditing(false);
      await refreshProfile();

      const freshProfile = await refreshCurrentProfileFromDb(currentUser.id);

      if (freshProfile) {
        await syncProfileCompletion(currentUser.id, freshProfile, photos);
      }

      showToast("Profile saved successfully.", "success");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!isOwnProfile || !currentUser || !e.target.files?.[0]) return;

    try {
      setUploading(true);

      await uploadAvatar(currentUser.id, e.target.files[0]);
      await refreshProfile();

      const freshProfile = await refreshCurrentProfileFromDb(currentUser.id);

      if (freshProfile) {
        await syncProfileCompletion(currentUser.id, freshProfile, photos);
      }

      showToast("Profile photo updated successfully.", "success");
    } catch (error) {
      console.error("Avatar upload failed:", error);
      showToast("Failed to upload profile photo.", "error");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!isOwnProfile || !currentUser || !e.target.files?.[0]) return;

    try {
      setUploading(true);

      await uploadPhoto(currentUser.id, e.target.files[0]);
      const nextPhotos = await loadPhotos(currentUser.id);

      if (profile) {
        await syncProfileCompletion(currentUser.id, profile, nextPhotos);
      }

      showToast("Photo uploaded successfully.", "success");
    } catch (error) {
      console.error("Photo upload failed:", error);
      showToast("Failed to upload photo.", "error");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleIdTypeChange = async (value: GhanaIdType | "") => {
    if (!isOwnProfile || !currentUser) return;

    setVerificationIdType(value);

    if (!value) return;

    const nextStatus =
      profile?.verification_status === "verified" || profile?.verified
        ? "verified"
        : "not_submitted";

    const nextProfile = profile
      ? {
          ...profile,
          verification_id_type: value,
          verification_status: nextStatus as VerificationStatus,
          verification_note: null,
          submitted_for_verification_at: null,
        }
      : null;

    if (nextProfile) {
      setProfile(nextProfile);
    }

    const { error } = await supabase
      .from("users")
      .update({
        verification_id_type: value,
        verification_status: nextStatus,
        verification_note: null,
        submitted_for_verification_at: null,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", currentUser.id);

    if (error) {
      console.error("Failed to save ID type:", error);
      showToast("Failed to save ID type. Please try again.", "error");
      return;
    }

    await refreshProfile();

    const freshProfile = await refreshCurrentProfileFromDb(currentUser.id);

    if (freshProfile) {
      await syncProfileCompletion(currentUser.id, freshProfile, photos);
    }

    showToast("ID type saved successfully.", "success");
  };

  const uploadVerificationFile = async (
    file: File,
    folder: "id-card" | "selfie"
  ) => {
    if (!currentUser?.id) return null;

    if (!file.type.startsWith("image/")) {
      showToast("Please upload a valid image file.", "error");
      return null;
    }

    const safeName = sanitizeFileName(file.name);
    const filePath = `${currentUser.id}/${folder}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from(VERIFICATION_BUCKET)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Verification upload failed:", uploadError);
      showToast("Failed to upload image. Please try again.", "error");
      return null;
    }

    const { data } = supabase.storage
      .from(VERIFICATION_BUCKET)
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleIdCardUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!isOwnProfile || !currentUser || !e.target.files?.[0]) return;

    try {
      setIdUploading(true);

      const publicUrl = await uploadVerificationFile(
        e.target.files[0],
        "id-card"
      );

      if (!publicUrl) return;

      const { error } = await supabase
        .from("users")
        .update({
          verification_id_image_url: publicUrl,
          verification_image_url: publicUrl,
          verification_status: "not_submitted",
          verification_note: null,
          submitted_for_verification_at: null,
          verified: false,
          verified_at: null,
          verified_by: null,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", currentUser.id);

      if (error) {
        console.error("Failed to save ID card image:", error);
        showToast("ID uploaded but could not be saved.", "error");
        return;
      }

      await refreshProfile();

      const freshProfile = await refreshCurrentProfileFromDb(currentUser.id);

      if (freshProfile) {
        await syncProfileCompletion(currentUser.id, freshProfile, photos);
      }

      showToast("ID card uploaded successfully.", "success");
    } finally {
      setIdUploading(false);
      e.target.value = "";
    }
  };

  const handleSelfieUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!isOwnProfile || !currentUser || !e.target.files?.[0]) return;

    try {
      setSelfieUploading(true);

      const publicUrl = await uploadVerificationFile(
        e.target.files[0],
        "selfie"
      );

      if (!publicUrl) return;

      const { error } = await supabase
        .from("users")
        .update({
          verification_selfie_url: publicUrl,
          verification_status: "not_submitted",
          verification_note: null,
          submitted_for_verification_at: null,
          verified: false,
          verified_at: null,
          verified_by: null,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", currentUser.id);

      if (error) {
        console.error("Failed to save selfie:", error);
        showToast("Selfie uploaded but could not be saved.", "error");
        return;
      }

      await refreshProfile();

      const freshProfile = await refreshCurrentProfileFromDb(currentUser.id);

      if (freshProfile) {
        await syncProfileCompletion(currentUser.id, freshProfile, photos);
      }

      showToast("Selfie uploaded successfully.", "success");
    } finally {
      setSelfieUploading(false);
      e.target.value = "";
    }
  };

  const handleSubmitVerification = async () => {
    if (!isOwnProfile || !currentUser || !profile) return;

    if (
      !hasText(profile.full_name) ||
      !hasText(profile.avatar_url) ||
      !hasText(profile.city) ||
      !hasText(profile.region) ||
      !hasText(profile.country)
    ) {
      showToast(
        "Please complete your name, profile photo, city, and country before submitting.",
        "error"
      );
      return;
    }

    if (!hasText(profile.verification_id_type)) {
      showToast("Please select the type of ID you are uploading.", "error");
      return;
    }

    if (!hasText(profile.verification_id_image_url)) {
      showToast("Please upload your ID card before submitting.", "error");
      return;
    }

    if (!hasText(profile.verification_selfie_url)) {
      showToast("Please upload a selfie before submitting.", "error");
      return;
    }

    try {
      setVerificationSubmitting(true);

      const { error } = await supabase
        .from("users")
        .update({
          verification_status: "pending",
          verification_note: null,
          submitted_for_verification_at: new Date().toISOString(),
          verified: false,
          verified_at: null,
          verified_by: null,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", currentUser.id);

      if (error) {
        console.error("Failed to submit verification:", error);
        showToast("Failed to submit verification. Please try again.", "error");
        return;
      }

      await refreshProfile();

      const freshProfile = await refreshCurrentProfileFromDb(currentUser.id);

      if (freshProfile) {
        await syncProfileCompletion(currentUser.id, freshProfile, photos);
      }

      showToast(
        "Verification submitted successfully. Admin will review it soon.",
        "success"
      );
    } finally {
      setVerificationSubmitting(false);
    }
  };

  const handleDeletePhoto = async (photoId: string, url: string) => {
    if (!isOwnProfile || !profile || !currentUser) return;

    const confirmed = window.confirm("Delete this photo?");
    if (!confirmed) return;

    await deletePhoto(photoId, url);

    const nextPhotos = await loadPhotos(profile.id);
    await syncProfileCompletion(currentUser.id, profile, nextPhotos);

    showToast("Photo deleted successfully.", "success");
  };

  const handleUnlockViewers = async () => {
    if (!currentUser?.id) return;

    try {
      setUnlockingViewers(true);

      const { data, error } = await unlockProfileViewers(currentUser.id, 10);

      if (error) {
        console.error("Failed to unlock viewers:", error);
        showToast("Failed to unlock viewers. Please try again.", "error");
        return;
      }

      if (!isUnlockResult(data)) {
        showToast("Unexpected unlock response. Please try again.", "error");
        return;
      }

      if (!data.success) {
        showToast(data.message || "Insufficient credits.", "error");
        return;
      }

      setViewersUnlocked(true);
      await loadProfileViewData(currentUser.id);
      showToast("Profile viewers unlocked for 24 hours.", "success");
    } finally {
      setUnlockingViewers(false);
    }
  };

  const handleCancelEdit = () => {
    if (!profile) return;

    setFormData({
      full_name: profile.full_name ?? "",
      bio: profile.bio ?? "",
      city: profile.city ?? "",
      region: profile.region ?? "",
      country: profile.country ?? "",
      education: profile.education ?? "",
      religion: profile.religion ?? "",
    });

    setEditing(false);
  };

  if (!profile) {
    return <div className="p-10 text-center">Loading...</div>;
  }

  const verified = isProfileVerified(profile);

  const canSubmitVerification =
    hasText(profile.full_name) &&
    hasText(profile.avatar_url) &&
    hasText(profile.city) &&
    hasText(profile.region) &&
    hasText(profile.country) &&
    hasText(profile.verification_id_type) &&
    hasText(profile.verification_id_image_url) &&
    hasText(profile.verification_selfie_url) &&
    profile.verification_status !== "pending" &&
    !verified;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24">
      {toast && (
        <div
          className={`fixed right-4 top-20 z-[9999] max-w-sm rounded-2xl border px-5 py-4 text-sm shadow-xl ${
            toast.type === "success"
              ? "border-green-100 bg-green-50 text-green-700"
              : toast.type === "error"
              ? "border-red-100 bg-red-50 text-red-700"
              : "border-blue-100 bg-blue-50 text-blue-700"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <p className="leading-6">{toast.message}</p>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="rounded-full p-1 opacity-70 hover:bg-white hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="relative h-56 rounded-b-3xl bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-500 shadow-lg" />

      <div className="relative -mt-16 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-end gap-4">
                <div className="relative">
                  <img
                    src={getAvatarUrl(profile.avatar_url ?? "")}
                    alt={profile.full_name ?? "Profile"}
                    className="h-32 w-32 rounded-2xl border-4 border-white bg-gray-100 object-cover shadow-md"
                  />

                  {verified && (
                    <div className="absolute -right-2 -top-2 rounded-full bg-blue-500 p-1.5 text-white shadow">
                      <BadgeCheck className="h-4 w-4" />
                    </div>
                  )}

                  {isOwnProfile && (
                    <label className="absolute -bottom-2 -right-2 cursor-pointer rounded-full border border-gray-200 bg-white p-2 shadow hover:bg-gray-50">
                      <Camera className="h-4 w-4 text-gray-700" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                <div>
                  {editing ? (
                    <input
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleInputChange}
                      className="border-b border-gray-300 text-2xl font-bold focus:border-rose-500 focus:outline-none"
                    />
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-3xl font-bold text-gray-900">
                        {profile.full_name ?? "No Name"}
                      </h1>

                      {verified && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-sm font-medium text-blue-600">
                          <BadgeCheck className="h-4 w-4" />
                          Verified
                        </span>
                      )}

                      {verificationConfig && !verified && (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium ${verificationConfig.badgeClass}`}
                        >
                          <VerificationIcon className="h-3.5 w-3.5" />
                          {verificationConfig.label}
                        </span>
                      )}
                    </div>
                  )}

                  <p className="mt-1 text-gray-500">
                    {profile.date_of_birth
                      ? `${calculateAge(profile.date_of_birth)} years old`
                      : ""}
                  </p>

                  <div className="mt-3 flex items-center gap-2 text-gray-600">
                    <MapPin className="h-4 w-4" />
                    {editing ? (
                      <div className="flex flex-wrap gap-2">
                        <input
                          name="city"
                          value={formData.city}
                          onChange={handleInputChange}
                          placeholder="City"
                          className="border-b border-gray-300 focus:border-rose-500 focus:outline-none"
                        />
                        <input
                          name="region"
                          value={formData.region}
                          onChange={handleInputChange}
                          placeholder="Region"
                          className="border-b border-gray-300 focus:border-rose-500 focus:outline-none"
                        />
                        <input
                          name="country"
                          value={formData.country}
                          onChange={handleInputChange}
                          placeholder="Country"
                          className="border-b border-gray-300 focus:border-rose-500 focus:outline-none"
                        />
                      </div>
                    ) : (
                      <span>
                        {[profile.city, profile.region, profile.country]
                          .filter(Boolean)
                          .join(", ") || "Unknown"}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {isOwnProfile && (
                <div className="flex gap-3">
                  {editing ? (
                    <>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200"
                      >
                        <X className="h-4 w-4" />
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="inline-flex items-center gap-2 rounded-lg bg-rose-500 px-4 py-2 text-white hover:bg-rose-600 disabled:opacity-60"
                      >
                        <Save className="h-4 w-4" />
                        {saving ? "Saving..." : "Save"}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-white hover:bg-black"
                    >
                      <Edit2 className="h-4 w-4" />
                      Edit Profile
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="mb-3 text-lg font-semibold text-gray-900">About</h3>

            {editing ? (
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                rows={5}
                placeholder="Tell people about yourself..."
                className="w-full rounded-xl border border-gray-200 p-3 focus:outline-none focus:ring-2 focus:ring-rose-200"
              />
            ) : (
              <p className="leading-7 text-gray-600">
                {profile.bio || "No bio"}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              Details
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="mb-1 text-sm text-gray-500">Education</p>
                {editing ? (
                  <select
                    name="education"
                    value={formData.education}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-gray-300 px-2 py-1 focus:border-rose-500 focus:outline-none"
                  >
                    <option value="">Select education</option>
                    {EDUCATION_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="font-medium text-gray-800">
                    {profile.education || "No education"}
                  </p>
                )}
              </div>

              <div className="rounded-xl bg-gray-50 p-4">
                <p className="mb-1 text-sm text-gray-500">Religion</p>
                {editing ? (
                  <select
                    name="religion"
                    value={formData.religion}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-gray-300 px-2 py-1 focus:border-rose-500 focus:outline-none"
                  >
                    <option value="">Select religion</option>
                    {RELIGION_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="font-medium text-gray-800">
                    {profile.religion || "No religion"}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Photos</h3>

              {isOwnProfile && (
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-rose-50 px-4 py-2 text-rose-600 hover:bg-rose-100">
                  <Plus className="h-4 w-4" />
                  {uploading ? "Uploading..." : "Add Photo"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {photos.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-500">
                {isOwnProfile ? "No photos uploaded yet" : "No gallery photos"}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {photos.map((photo) => (
                  <div key={photo.id} className="group relative">
                    <img
                      src={photo.photo_url}
                      alt="Profile"
                      className="h-40 w-full rounded-xl object-cover"
                    />

                    {isOwnProfile && (
                      <button
                        type="button"
                        onClick={() =>
                          handleDeletePhoto(photo.id, photo.photo_url)
                        }
                        className="absolute right-2 top-2 rounded-full bg-black/60 p-2 text-white opacity-0 transition group-hover:opacity-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {isOwnProfile ? (
            <>
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">
                    Profile Completion
                  </h3>
                  <span className="text-sm text-gray-500">{completion}%</span>
                </div>

                <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className={`${strength.color} h-full transition-all duration-500`}
                    style={{ width: `${completion}%` }}
                  />
                </div>

                <p className="mt-3 text-sm text-gray-600">
                  Strength:{" "}
                  <span className="font-semibold">{strength.label}</span>
                </p>

                {profileNotes.length > 0 ? (
                  <div className="mt-4">
                    <p className="mb-2 text-sm font-medium text-gray-800">
                      Improve your profile
                    </p>
                    <ul className="space-y-2 text-sm text-gray-600">
                      {profileNotes.map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <span className="mt-1 h-2 w-2 rounded-full bg-rose-500" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl bg-green-50 p-4 text-sm font-medium text-green-700">
                    🎉 Your profile is 100% complete.
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="flex items-center gap-2 font-semibold text-gray-900">
                      <Eye className="h-5 w-5 text-rose-500" />
                      Who Viewed Me
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      See how many people checked your profile. Unlock the list
                      for 10 credits.
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl bg-gradient-to-br from-rose-50 to-pink-50 p-5">
                  <p className="text-sm text-gray-500">Profile views</p>
                  <h2 className="mt-1 text-4xl font-bold text-gray-900">
                    {loadingViewers ? "..." : profileViewCount}
                  </h2>
                </div>

                {!viewersUnlocked ? (
                  <div className="mt-4 rounded-2xl border border-dashed border-gray-300 p-5 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-600">
                      <LockKeyhole className="h-6 w-6" />
                    </div>
                    <p className="font-semibold text-gray-900">
                      Viewer list is locked
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      Spend 10 credits to unlock viewers for 24 hours.
                    </p>

                    <button
                      type="button"
                      onClick={handleUnlockViewers}
                      disabled={unlockingViewers || profileViewCount === 0}
                      className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-rose-500 px-5 py-3 text-sm font-semibold text-white hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Unlock className="h-4 w-4" />
                      {unlockingViewers
                        ? "Unlocking..."
                        : "Unlock for 10 credits"}
                    </button>
                  </div>
                ) : (
                  <div className="mt-4">
                    <p className="mb-3 text-sm font-medium text-gray-800">
                      Recent viewers
                    </p>

                    {profileViewers.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-gray-300 p-5 text-center text-sm text-gray-500">
                        No viewers yet.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {profileViewers.slice(0, 10).map((viewer, index) => (
                          <div
                            key={viewer.id}
                            className="flex items-center justify-between rounded-xl bg-gray-50 p-4"
                          >
                            <div>
                              <p className="font-medium text-gray-900">
                                Viewer #{index + 1}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(
                                  viewer.created_at
                                ).toLocaleString()}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                navigate(`/profile/${viewer.viewer_id}`)
                              }
                              className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-rose-600 shadow-sm hover:bg-rose-50"
                            >
                              View
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Identity Verification
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Verified users build more trust, get better responses, and
                      help TrustPoint reduce fake accounts.
                    </p>
                  </div>

                  {verificationConfig && (
                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium ${verificationConfig.badgeClass}`}
                    >
                      <VerificationIcon className="h-3.5 w-3.5" />
                      {verificationConfig.label}
                    </span>
                  )}
                </div>

                {verificationConfig && (
                  <div
                    className={`mb-4 rounded-xl border p-4 text-sm ${verificationConfig.boxClass}`}
                  >
                    <div className="flex items-start gap-2">
                      <VerificationIcon className="mt-0.5 h-4 w-4 shrink-0" />
                      <div>
                        <p className="font-semibold">
                          {verificationConfig.title}
                        </p>
                        <p className="mt-1">{verificationConfig.description}</p>

                        {profile.verification_status === "rejected" && (
                          <div className="mt-3 rounded-lg bg-white/70 p-3 text-sm">
                            <p className="font-semibold">Admin note:</p>
                            <p className="mt-1">
                              {profile.verification_note ||
                                "Your verification was rejected. Please upload a clearer ID card and selfie, then submit again."}
                            </p>
                          </div>
                        )}

                        {profile.submitted_for_verification_at &&
                          profile.verification_status === "pending" && (
                            <p className="mt-2 text-xs">
                              Submitted on{" "}
                              {new Date(
                                profile.submitted_for_verification_at
                              ).toLocaleString()}
                            </p>
                          )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Select ID Type
                  </label>

                  <select
                    value={verificationIdType}
                    onChange={(e) =>
                      void handleIdTypeChange(e.target.value as GhanaIdType | "")
                    }
                    disabled={
                      profile.verification_status === "pending" || verified
                    }
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-rose-400 disabled:cursor-not-allowed disabled:bg-gray-50"
                  >
                    <option value="">Select ID type</option>
                    {ID_TYPES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-4 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-gray-700" />
                      <h4 className="text-sm font-semibold text-gray-900">
                        ID Card Image
                      </h4>
                    </div>

                    {profile.verification_id_image_url ? (
                      <img
                        src={profile.verification_id_image_url}
                        alt="Uploaded ID card"
                        className="mb-3 h-44 w-full rounded-xl object-cover"
                      />
                    ) : (
                      <div className="mb-3 flex h-44 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white text-center text-sm text-gray-500">
                        No ID card uploaded
                      </div>
                    )}

                    <label
                      className={`flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 ${
                        profile.verification_status === "pending" || verified
                          ? "cursor-not-allowed opacity-60"
                          : "cursor-pointer"
                      }`}
                    >
                      <Upload className="h-4 w-4" />
                      {idUploading
                        ? "Uploading..."
                        : profile.verification_id_image_url
                        ? "Replace ID Card"
                        : "Upload ID Card"}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleIdCardUpload}
                        disabled={
                          idUploading ||
                          profile.verification_status === "pending" ||
                          verified
                        }
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <UserRoundCheck className="h-4 w-4 text-gray-700" />
                      <h4 className="text-sm font-semibold text-gray-900">
                        Selfie Photo
                      </h4>
                    </div>

                    {profile.verification_selfie_url ? (
                      <img
                        src={profile.verification_selfie_url}
                        alt="Uploaded selfie"
                        className="mb-3 h-44 w-full rounded-xl object-cover"
                      />
                    ) : (
                      <div className="mb-3 flex h-44 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white text-center text-sm text-gray-500">
                        No selfie uploaded
                      </div>
                    )}

                    <label
                      className={`flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 ${
                        profile.verification_status === "pending" || verified
                          ? "cursor-not-allowed opacity-60"
                          : "cursor-pointer"
                      }`}
                    >
                      <Camera className="h-4 w-4" />
                      {selfieUploading
                        ? "Uploading..."
                        : profile.verification_selfie_url
                        ? "Replace Selfie"
                        : "Upload Selfie"}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleSelfieUpload}
                        disabled={
                          selfieUploading ||
                          profile.verification_status === "pending" ||
                          verified
                        }
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
                  <p>
                    <span className="font-semibold text-gray-800">
                      Selected ID:
                    </span>{" "}
                    {getIdTypeLabel(profile.verification_id_type)}
                  </p>
                  <p className="mt-1">
                    Admin will compare the face on your selected ID with your
                    selfie before approving your account.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSubmitVerification}
                  disabled={
                    verificationSubmitting ||
                    idUploading ||
                    selfieUploading ||
                    !canSubmitVerification
                  }
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-rose-500 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ShieldCheck className="h-4 w-4" />
                  {verificationSubmitting
                    ? "Submitting..."
                    : profile.verification_status === "pending"
                    ? "Pending Admin Review"
                    : verified
                    ? "Already Verified"
                    : profile.verification_status === "rejected"
                    ? "Re-submit for Verification"
                    : "Submit for Verification"}
                </button>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="mb-4 font-semibold text-gray-900">
                Profile Summary
              </h3>

              <div className="space-y-4">
                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="mb-1 text-sm text-gray-500">Verification</p>
                  <p className="flex items-center gap-2 font-medium text-gray-800">
                    {verified ? (
                      <>
                        <BadgeCheck className="h-4 w-4 text-blue-600" />
                        Verified
                      </>
                    ) : (
                      <>
                        <ShieldQuestion className="h-4 w-4 text-gray-500" />
                        Not verified
                      </>
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="mb-1 text-sm text-gray-500">Bio</p>
                  <p className="font-medium text-gray-800">
                    {profile.bio || "No bio"}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="mb-1 text-sm text-gray-500">Location</p>
                  <p className="font-medium text-gray-800">
                    {[profile.city, profile.region, profile.country]
                      .filter(Boolean)
                      .join(", ") || "No location"}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="mb-1 text-sm text-gray-500">Education</p>
                  <p className="font-medium text-gray-800">
                    {profile.education || "No education"}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="mb-1 text-sm text-gray-500">Religion</p>
                  <p className="font-medium text-gray-800">
                    {profile.religion || "No religion"}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="mb-1 text-sm text-gray-500">
                    Relationship Goal
                  </p>
                  <p className="font-medium capitalize text-gray-800">
                    {profile.relationship_goal || "No relationship goal"}
                  </p>
                </div>

                {profileNotes.length > 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-200 p-4">
                    <p className="mb-2 text-sm font-medium text-gray-800">
                      Missing profile information
                    </p>
                    <ul className="space-y-2 text-sm text-gray-600">
                      {profileNotes.map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <span className="mt-1 h-2 w-2 rounded-full bg-rose-500" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {!isOwnProfile && (
            <div className="sticky top-24 space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              {!hasLiked ? (
                <button
                  type="button"
                  onClick={handleLike}
                  disabled={liking}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-500 py-3 text-white hover:bg-rose-600 disabled:opacity-60"
                >
                  <Heart className="h-5 w-5" />
                  {liking ? "Liking..." : "Like"}
                </button>
              ) : (
                <div className="rounded-xl bg-rose-50 py-3 text-center font-medium text-rose-600">
                  Already liked
                </div>
              )}

              <button
                type="button"
                onClick={handleMessage}
                disabled={!isMatched || startingChat}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 py-3 text-white hover:bg-black disabled:opacity-40"
              >
                <MessageCircle className="h-5 w-5" />
                {startingChat ? "Opening chat..." : "Message"}
              </button>

              {!isMatched && (
                <p className="text-center text-xs text-gray-500">
                  You can message only after both of you match.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};