import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Heart,
  MapPin,
  BadgeCheck,
  RefreshCw,
  Rocket,
  Crown,
  X,
  Zap,
  Users,
  Eye,
  MessageCircle,
  Activity,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { getDiscoveryProfiles } from "../services/userService";
import { likeUser } from "../services/matchService";
import { supabase } from "../lib/supabase";
import { getAvatarUrl, calculateAge } from "../lib/utils";
import type { Database } from "../lib/database.types";
import BoostCard from "../components/BoostCard";

type UserProfile = Database["public"]["Tables"]["users"]["Row"] & {
  is_boosted?: boolean | null;
  boost_expires_at?: string | null;
  profile_completion?: number | null;
};

type NoticeType = "success" | "error" | "premium" | "info";

type NoticeState = {
  type: NoticeType;
  title: string;
  message: string;
};

type SuperLikeResult = {
  success: boolean;
  message?: string;
  needs_credits?: boolean;
  cost?: number;
  used_credits?: boolean;
  remaining_free_today?: number;
};

type ActivitySummary = {
  success?: boolean;
  new_users_today?: number;
  profile_views_today?: number;
  likes_received_today?: number;
  super_likes_today?: number;
  unread_messages?: number;
  active_users_recently?: number;
};

export const Discover = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [activity, setActivity] = useState<ActivitySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [likingId, setLikingId] = useState<string | null>(null);
  const [superLikingId, setSuperLikingId] = useState<string | null>(null);
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);
  const [notice, setNotice] = useState<NoticeState | null>(null);

  const showNotice = (nextNotice: NoticeState) => {
    setNotice(nextNotice);
    window.setTimeout(() => setNotice(null), 5000);
  };

  const isVerified = (profile: UserProfile) =>
    profile.verified === true || profile.verification_status === "verified";

  const isBoostActive = (profile: UserProfile) => {
    if (!profile.is_boosted || !profile.boost_expires_at) return false;
    return new Date(profile.boost_expires_at).getTime() > Date.now();
  };

  const isRecentlyActive = (profile: UserProfile) => {
    if (!profile.last_seen_at) return false;

    const lastSeenTime = new Date(profile.last_seen_at).getTime();
    if (Number.isNaN(lastSeenTime)) return false;

    const diffMinutes = (Date.now() - lastSeenTime) / 60000;
    return diffMinutes <= 10;
  };

  const getPriorityScore = (profile: UserProfile) => {
    let score = 0;

    if (isBoostActive(profile)) score += 100;
    if (isVerified(profile)) score += 50;

    if (profile.last_seen_at) {
      const lastSeenTime = new Date(profile.last_seen_at).getTime();

      if (!Number.isNaN(lastSeenTime)) {
        const diffMinutes = (Date.now() - lastSeenTime) / 60000;

        if (diffMinutes <= 10) score += 30;
        else if (diffMinutes <= 60) score += 20;
        else if (diffMinutes <= 24 * 60) score += 10;
      }
    }

    score += Number(profile.profile_completion ?? 0);

    return score;
  };

  const sortProfilesByPriority = (items: UserProfile[]) => {
    return [...items].sort((a, b) => {
      const scoreDifference = getPriorityScore(b) - getPriorityScore(a);
      if (scoreDifference !== 0) return scoreDifference;

      const aLastSeen = new Date(a.last_seen_at ?? 0).getTime();
      const bLastSeen = new Date(b.last_seen_at ?? 0).getTime();

      return bLastSeen - aLastSeen;
    });
  };

  const getTargetGender = async (userId: string) => {
    const { data, error } = await supabase
      .from("users")
      .select("gender")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("Failed to fetch logged-in user gender:", error);
      return null;
    }

    if (data?.gender === "male") return "female";
    if (data?.gender === "female") return "male";

    return null;
  };

  const loadProfiles = useCallback(async () => {
    if (!user?.id) {
      setProfiles([]);
      setLikedIds([]);
      setActivity(null);
      setLoading(false);
      setErrorMessage("You need to be signed in to discover profiles.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const [targetGender, discoveryResult, likedResult, activityResult] =
        await Promise.all([
          getTargetGender(user.id),
          getDiscoveryProfiles(user.id, {}),
          supabase
            .from("likes")
            .select("receiver_id")
            .eq("sender_id", user.id),
          supabase.rpc("get_user_activity_summary", {
            p_user_id: user.id,
          }),
        ]);

      const { data, error } = discoveryResult;

      if (error) {
        console.error(error);
        setProfiles([]);
        setErrorMessage("Failed to load profiles");
        return;
      }

      if (activityResult.error) {
        console.error("Failed to load activity summary:", activityResult.error);
        setActivity(null);
      } else {
        const activityData = activityResult.data as ActivitySummary | null;

        if (activityData?.success) {
          setActivity(activityData);
        } else {
          setActivity(null);
        }
      }

      const safeProfiles = ((data ?? []) as UserProfile[]).filter((profile) => {
        if (profile.id === user.id) return false;
        if (!targetGender) return true;
        return profile.gender === targetGender;
      });

      setProfiles(sortProfilesByPriority(safeProfiles));

      const existingLikedIds = (likedResult.data ?? []).map(
        (row) => row.receiver_id
      );

      setLikedIds(existingLikedIds);
    } catch (error) {
      console.error(error);
      setProfiles([]);
      setActivity(null);
      setErrorMessage("Something went wrong while loading profiles.");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void loadProfiles();
  }, [loadProfiles]);

  const handleLike = async (targetId: string) => {
    if (!user?.id) return;

    try {
      setLikingId(targetId);

      const result = await likeUser(user.id, targetId);

      if (result.limitReached) {
        showNotice({
          type: "premium",
          title: "Daily like limit reached",
          message:
            result.message ||
            "Upgrade to Premium to enjoy unlimited likes every day.",
        });
        return;
      }

      if (result.error) {
        showNotice({
          type: "error",
          title: "Could not like profile",
          message: result.message || "Please try again.",
        });
        return;
      }

      if (result.liked) {
        setLikedIds((prev) =>
          prev.includes(targetId) ? prev : [...prev, targetId]
        );
      }

      if (result.match) {
        showNotice({
          type: "success",
          title: "🎉 It's a match!",
          message: "You both liked each other. You can now start chatting.",
        });

        setProfiles((prev) => prev.filter((profile) => profile.id !== targetId));
      } else {
        showNotice({
          type: "success",
          title: "Profile liked",
          message: "Your like has been sent successfully.",
        });
      }

      void loadProfiles();
    } catch (error) {
      console.error(error);
      showNotice({
        type: "error",
        title: "Something went wrong",
        message: "We could not like this profile. Please try again.",
      });
    } finally {
      setLikingId(null);
    }
  };

  const handleSuperLike = async (targetId: string) => {
    if (!user?.id) return;

    try {
      setSuperLikingId(targetId);

      const { data, error } = await supabase.rpc("send_super_like", {
        target_user_id: targetId,
        super_like_message: null,
      });

      if (error) {
        console.error(error);
        showNotice({
          type: "error",
          title: "Super Like failed",
          message: "Please try again.",
        });
        return;
      }

      const result = data as SuperLikeResult | null;

      if (!result?.success) {
        showNotice({
          type: result?.needs_credits ? "premium" : "error",
          title: result?.needs_credits ? "Need credits" : "Super Like failed",
          message:
            result?.message ||
            "We could not send this Super Like. Please try again.",
        });
        return;
      }

      showNotice({
        type: "success",
        title: "Super Like sent 💙",
        message: result.message || "Your Super Like has been sent successfully.",
      });

      void loadProfiles();
    } catch (error) {
      console.error(error);
      showNotice({
        type: "error",
        title: "Something went wrong",
        message: "We could not send this Super Like. Please try again.",
      });
    } finally {
      setSuperLikingId(null);
    }
  };

  const handleOpenProfile = (profileId: string) => {
    navigate(`/profile/${profileId}`);
  };

  const filteredProfiles = showVerifiedOnly
    ? profiles.filter((profile) => isVerified(profile))
    : profiles;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-rose-500" />
      </div>
    );
  }

  return (
    <div className="relative px-6 py-6">
      {notice && (
        <div
          className={`fixed right-4 top-20 z-[9999] max-w-sm rounded-2xl border p-4 shadow-xl ${
            notice.type === "success"
              ? "border-green-100 bg-green-50 text-green-700"
              : notice.type === "premium"
              ? "border-yellow-200 bg-yellow-50 text-yellow-800"
              : notice.type === "error"
              ? "border-red-100 bg-red-50 text-red-700"
              : "border-blue-100 bg-blue-50 text-blue-700"
          }`}
        >
          <div className="flex items-start gap-3">
            {notice.type === "premium" && (
              <div className="rounded-full bg-yellow-100 p-2 text-yellow-700">
                <Crown size={18} />
              </div>
            )}

            <div className="flex-1">
              <p className="font-semibold">{notice.title}</p>
              <p className="mt-1 text-sm leading-5">{notice.message}</p>

              {notice.type === "premium" && (
                <button
                  type="button"
                  onClick={() => navigate("/premium")}
                  className="mt-3 rounded-xl bg-yellow-500 px-4 py-2 text-sm font-semibold text-white hover:bg-yellow-600"
                >
                  Upgrade to Premium
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setNotice(null)}
              className="rounded-full p-1 opacity-70 hover:bg-white hover:opacity-100"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Discover</h1>
          <p className="mt-1 text-sm text-gray-500">
            Find active, verified, and boosted profiles.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setShowVerifiedOnly((prev) => !prev)}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition ${
              showVerifiedOnly
                ? "border-blue-500 bg-blue-500 text-white"
                : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            <BadgeCheck size={16} />
            {showVerifiedOnly ? "Verified Only" : "All Users"}
          </button>

          <button
            type="button"
            onClick={() => void loadProfiles()}
            className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {activity && (
        <div className="mb-8 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                <Activity className="h-5 w-5 text-rose-500" />
                Activity Today
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Live signals that help you know what is happening around your
                profile.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-2xl bg-rose-50 p-4 text-center">
              <Users className="mx-auto mb-2 h-5 w-5 text-rose-600" />
              <p className="text-xs text-gray-500">New Users</p>
              <p className="mt-1 text-xl font-bold text-gray-900">
                {activity.new_users_today ?? 0}
              </p>
            </div>

            <div className="rounded-2xl bg-pink-50 p-4 text-center">
              <Eye className="mx-auto mb-2 h-5 w-5 text-pink-600" />
              <p className="text-xs text-gray-500">Profile Views</p>
              <p className="mt-1 text-xl font-bold text-gray-900">
                {activity.profile_views_today ?? 0}
              </p>
            </div>

            <div className="rounded-2xl bg-red-50 p-4 text-center">
              <Heart className="mx-auto mb-2 h-5 w-5 text-red-600" />
              <p className="text-xs text-gray-500">Likes</p>
              <p className="mt-1 text-xl font-bold text-gray-900">
                {activity.likes_received_today ?? 0}
              </p>
            </div>

            <div className="rounded-2xl bg-blue-50 p-4 text-center">
              <Zap className="mx-auto mb-2 h-5 w-5 text-blue-600" />
              <p className="text-xs text-gray-500">Super Likes</p>
              <p className="mt-1 text-xl font-bold text-blue-600">
                {activity.super_likes_today ?? 0}
              </p>
            </div>

            <div className="rounded-2xl bg-green-50 p-4 text-center">
              <MessageCircle className="mx-auto mb-2 h-5 w-5 text-green-600" />
              <p className="text-xs text-gray-500">Unread</p>
              <p className="mt-1 text-xl font-bold text-green-600">
                {activity.unread_messages ?? 0}
              </p>
            </div>

            <div className="rounded-2xl bg-emerald-50 p-4 text-center">
              <Activity className="mx-auto mb-2 h-5 w-5 text-emerald-600" />
              <p className="text-xs text-gray-500">Active Now</p>
              <p className="mt-1 text-xl font-bold text-emerald-600">
                {activity.active_users_recently ?? 0}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8">
        <BoostCard />
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-6 py-5 text-center">
          <p className="text-sm text-red-600">{errorMessage}</p>
        </div>
      ) : filteredProfiles.length === 0 ? (
        <div className="rounded-2xl border bg-white px-6 py-10 text-center text-gray-500">
          {showVerifiedOnly
            ? "No verified profiles found."
            : "No matching profiles found."}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filteredProfiles.map((profile) => {
            const isLiked = likedIds.includes(profile.id);
            const verified = isVerified(profile);
            const boosted = isBoostActive(profile);
            const active = isRecentlyActive(profile);

            return (
              <div
                key={profile.id}
                className="group cursor-pointer overflow-hidden rounded-2xl bg-white shadow transition hover:shadow-lg"
                onClick={() => handleOpenProfile(profile.id)}
              >
                <div className="relative">
                  <img
                    src={getAvatarUrl(profile.avatar_url ?? "")}
                    alt={profile.full_name ?? "User profile"}
                    className="h-60 w-full object-cover"
                  />

                  {boosted && (
                    <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-yellow-400 px-2 py-1 text-xs font-bold text-gray-900 shadow">
                      <Rocket size={12} />
                      Boosted
                    </div>
                  )}

                  {verified && (
                    <div className="absolute right-2 top-2 rounded-full bg-blue-500 p-1 text-white shadow">
                      <BadgeCheck size={14} />
                    </div>
                  )}

                  {profile.date_of_birth && (
                    <div className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 text-xs text-white">
                      {calculateAge(profile.date_of_birth)} yrs
                    </div>
                  )}

                  {active && (
                    <div className="absolute bottom-2 right-2 rounded-full bg-green-500 px-2 py-1 text-[11px] font-medium text-white shadow">
                      ● Active
                    </div>
                  )}

                  <div className="absolute inset-0 flex items-end justify-center gap-2 bg-black/10 px-2 pb-4 opacity-0 transition group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleLike(profile.id);
                      }}
                      disabled={likingId === profile.id || isLiked}
                      className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-gray-800 shadow disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Heart size={16} />
                      {likingId === profile.id
                        ? "Liking..."
                        : isLiked
                        ? "Liked"
                        : "Like"}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleSuperLike(profile.id);
                      }}
                      disabled={superLikingId === profile.id}
                      className="flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Zap size={16} />
                      {superLikingId === profile.id
                        ? "Sending..."
                        : "Super Like"}
                    </button>
                  </div>
                </div>

                <div className="p-3">
                  <div className="flex items-center gap-1">
                    <h2 className="truncate text-sm font-semibold">
                      {profile.full_name ?? "No Name"}
                    </h2>

                    {verified && (
                      <BadgeCheck
                        size={14}
                        className="shrink-0 text-blue-500"
                      />
                    )}
                  </div>

                  <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                    <MapPin size={12} className="shrink-0" />
                    <span className="truncate">
                      {[profile.city, profile.country]
                        .filter(Boolean)
                        .join(", ") || "No location"}
                    </span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};