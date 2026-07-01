import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BadgeCheck,
  Coins,
  Crown,
  Heart,
  LockKeyhole,
  RefreshCw,
  Unlock,
  X,
  Zap,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { getLikesReceived, markLikesAsRead } from "../services/matchService";
import { getAvatarUrl } from "../lib/utils";
import { supabase } from "../lib/supabase";
import type { Database } from "../lib/database.types";

type UserRow = Database["public"]["Tables"]["users"]["Row"];

type LikeWithProfile = Database["public"]["Tables"]["likes"]["Row"] & {
  profile: UserRow | null;
};

type SuperLikeRow = Database["public"]["Tables"]["super_likes"]["Row"];

type ReceivedItem = {
  id: string;
  type: "like" | "super_like";
  sender_id: string;
  created_at: string;
  message?: string | null;
  profile: UserRow | null;
};

type AccessStatus = {
  hasAccess: boolean;
  isPremium: boolean;
  isUnlocked: boolean;
};

type UnlockLikesResult = {
  success: boolean;
  premium?: boolean;
  already_unlocked?: boolean;
  cost?: number;
  expires_at?: string;
  message?: string;
};

type NoticeType = "success" | "error" | "info";

type NoticeState = {
  type: NoticeType;
  message: string;
};

const UNLOCK_COST = 10;

const formatTimeAgo = (dateString: string) => {
  const now = new Date().getTime();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;

  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);

  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  return `${days}d`;
};

const isVerifiedProfile = (profile: UserRow | null) => {
  return profile?.verified === true || profile?.verification_status === "verified";
};

const isUnlockLikesResult = (value: unknown): value is UnlockLikesResult => {
  return typeof value === "object" && value !== null && "success" in value;
};

export const LikesReceived = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState<ReceivedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const [notice, setNotice] = useState<NoticeState | null>(null);

  const [access, setAccess] = useState<AccessStatus>({
    hasAccess: false,
    isPremium: false,
    isUnlocked: false,
  });

  const showNotice = (message: string, type: NoticeType = "info") => {
    setNotice({ message, type });

    window.setTimeout(() => {
      setNotice(null);
    }, 4500);
  };

  const loadAccess = async (userId: string): Promise<AccessStatus> => {
    const [premiumResult, unlockResult] = await Promise.all([
      (supabase.rpc as any)("has_active_premium", {
        p_user_id: userId,
      }),
      (supabase.rpc as any)("has_active_likes_received_unlock", {
        p_user_id: userId,
      }),
    ]);

    if (premiumResult.error) {
      console.error("Failed to check premium:", premiumResult.error);
    }

    if (unlockResult.error) {
      console.error("Failed to check likes unlock:", unlockResult.error);
    }

    const isPremium = Boolean(premiumResult.data);
    const isUnlocked = Boolean(unlockResult.data);

    return {
      hasAccess: isPremium || isUnlocked,
      isPremium,
      isUnlocked,
    };
  };

  const loadSuperLikes = async (userId: string): Promise<ReceivedItem[]> => {
    const { data, error } = await supabase
      .from("super_likes")
      .select("*")
      .eq("receiver_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load super likes:", error);
      return [];
    }

    const superLikes = (data ?? []) as SuperLikeRow[];

    if (superLikes.length === 0) return [];

    const senderIds = Array.from(
      new Set(superLikes.map((item) => item.sender_id))
    );

    const { data: profilesData, error: profilesError } = await supabase
      .from("users")
      .select("*")
      .in("id", senderIds);

    if (profilesError) {
      console.error("Failed to load super like profiles:", profilesError);
    }

    const profiles = ((profilesData ?? []) as UserRow[]).reduce<
      Record<string, UserRow>
    >((acc, profile) => {
      acc[profile.id] = profile;
      return acc;
    }, {});

    return superLikes.map((superLike) => ({
      id: superLike.id,
      type: "super_like",
      sender_id: superLike.sender_id,
      created_at: superLike.created_at,
      message: superLike.message,
      profile: profiles[superLike.sender_id] ?? null,
    }));
  };

  const loadLikes = async () => {
    if (!user?.id) {
      setItems([]);
      setAccess({
        hasAccess: false,
        isPremium: false,
        isUnlocked: false,
      });
      setLoading(false);
      return;
    }

    setLoading(true);

    await markLikesAsRead(user.id);
    window.dispatchEvent(new Event("likes-read"));
    window.dispatchEvent(new Event("notifications-read"));

    const [nextAccess, likesResult, superLikeItems] = await Promise.all([
      loadAccess(user.id),
      getLikesReceived(user.id),
      loadSuperLikes(user.id),
    ]);

    let normalLikeItems: ReceivedItem[] = [];

    if (likesResult.error) {
      console.error("Failed to load likes received:", likesResult.error);
    } else {
      normalLikeItems = ((likesResult.data ?? []) as LikeWithProfile[]).map(
        (like) => ({
          id: like.id,
          type: "like",
          sender_id: like.sender_id,
          created_at: like.created_at,
          profile: like.profile,
        })
      );
    }

    const mergedItems = [...superLikeItems, ...normalLikeItems].sort((a, b) => {
      if (a.type === "super_like" && b.type !== "super_like") return -1;
      if (a.type !== "super_like" && b.type === "super_like") return 1;

      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });

    setItems(mergedItems);
    setAccess(nextAccess);
    setLoading(false);
  };

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      if (!isMounted) return;
      await loadLikes();
    };

    void run();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const handleUnlockWithCredits = async () => {
    if (!user?.id) return;

    try {
      setUnlocking(true);

      const { data, error } = await (supabase.rpc as any)(
        "unlock_likes_received",
        {
          p_user_id: user.id,
          p_cost: UNLOCK_COST,
        }
      );

      if (error) {
        console.error("Failed to unlock likes received:", error);
        showNotice("Failed to unlock who liked you. Please try again.", "error");
        return;
      }

      if (!isUnlockLikesResult(data)) {
        console.error("Unexpected unlock response:", data);
        showNotice("Unexpected unlock response. Please try again.", "error");
        return;
      }

      if (!data.success) {
        showNotice(
          data.message ||
            "Insufficient credits. Upgrade to Premium or buy more credits.",
          "error"
        );
        return;
      }

      showNotice(
        data.message || "Who liked you unlocked for 24 hours.",
        "success"
      );

      await loadLikes();
    } finally {
      setUnlocking(false);
    }
  };

  const canSeeProfiles = access.hasAccess;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-rose-500" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-xl font-semibold">Likes Received</h2>
        <p className="mt-2 text-gray-500">
          When someone likes or super likes your profile, they will appear here ❤️
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {notice && (
        <div
          className={`fixed right-4 top-20 z-[9999] max-w-sm rounded-2xl border px-5 py-4 text-sm shadow-xl ${
            notice.type === "success"
              ? "border-green-100 bg-green-50 text-green-700"
              : notice.type === "error"
              ? "border-red-100 bg-red-50 text-red-700"
              : "border-blue-100 bg-blue-50 text-blue-700"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <p className="leading-6">{notice.message}</p>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="rounded-full p-1 opacity-70 hover:bg-white hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-rose-500" />
          <div>
            <h1 className="text-2xl font-bold">Likes Received</h1>
            <p className="mt-1 text-sm text-gray-500">
              {items.length}{" "}
              {items.length === 1 ? "person has" : "people have"} shown interest
              in your profile.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void loadLikes()}
          className="inline-flex items-center justify-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {!canSeeProfiles && (
        <div className="mb-6 overflow-hidden rounded-3xl border border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50 p-6 shadow-sm">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-yellow-100 text-yellow-700">
                <LockKeyhole className="h-7 w-7" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  See who liked you
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
                  People are already interested in you. Unlock this list for 24
                  hours using credits, or upgrade to Premium for unlimited
                  access.
                </p>

                <div className="mt-4 flex flex-wrap gap-3 text-sm">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 font-medium text-gray-700 shadow-sm">
                    <Coins className="h-4 w-4 text-yellow-600" />
                    Unlock for {UNLOCK_COST} credits
                  </span>

                  <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 font-medium text-gray-700 shadow-sm">
                    <Crown className="h-4 w-4 text-yellow-600" />
                    Premium gives unlimited access
                  </span>

                  <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 font-medium text-blue-700 shadow-sm">
                    <Zap className="h-4 w-4 text-blue-600" />
                    Super Likes appear first
                  </span>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-3 sm:flex-row md:flex-col">
              <button
                type="button"
                onClick={handleUnlockWithCredits}
                disabled={unlocking}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-500 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Unlock className="h-4 w-4" />
                {unlocking ? "Unlocking..." : `Use ${UNLOCK_COST} Credits`}
              </button>

              <button
                type="button"
                onClick={() => navigate("/premium")}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-black"
              >
                <Crown className="h-4 w-4" />
                Upgrade Premium
              </button>
            </div>
          </div>
        </div>
      )}

      {canSeeProfiles && (
        <div
          className={`mb-6 rounded-2xl border px-5 py-4 text-sm ${
            access.isPremium
              ? "border-yellow-200 bg-yellow-50 text-yellow-800"
              : "border-green-100 bg-green-50 text-green-700"
          }`}
        >
          {access.isPremium
            ? "👑 Premium active: you can see everyone who liked or super liked your profile."
            : "✅ Unlocked: you can see who liked or super liked your profile for 24 hours."}
        </div>
      )}

      <div className="space-y-3">
        {items.map((item, index) => {
          const profile = item.profile;
          const verified = isVerifiedProfile(profile);
          const isSuperLike = item.type === "super_like";

          if (!canSeeProfiles) {
            return (
              <div
                key={`${item.type}-${item.id}`}
                className={`relative overflow-hidden rounded-2xl bg-white p-3 shadow-sm ${
                  isSuperLike ? "ring-2 ring-blue-100" : ""
                }`}
              >
                <div className="flex items-center gap-3 blur-sm select-none">
                  <div className="h-14 w-14 rounded-full bg-gray-300" />

                  <div className="min-w-0 flex-1">
                    <div className="mb-2 h-4 w-40 rounded bg-gray-300" />
                    <div className="h-3 w-56 rounded bg-gray-200" />
                  </div>
                </div>

                <div className="absolute inset-0 flex items-center justify-center bg-white/50">
                  <div className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-gray-700 shadow">
                    {isSuperLike ? "Super Like locked" : `Liker #${index + 1} locked`}
                  </div>
                </div>
              </div>
            );
          }

          return (
            <button
              key={`${item.type}-${item.id}`}
              type="button"
              onClick={() => navigate(`/profile/${item.sender_id}`)}
              className={`flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-sm transition hover:shadow-md ${
                isSuperLike ? "border border-blue-100 bg-blue-50/50" : ""
              }`}
            >
              <div className="relative shrink-0">
                <img
                  src={getAvatarUrl(profile?.avatar_url ?? "")}
                  alt={profile?.full_name ?? "Profile"}
                  className="h-14 w-14 rounded-full object-cover"
                />

                {isSuperLike && (
                  <div className="absolute -right-1 -top-1 rounded-full bg-blue-600 p-1 text-white shadow">
                    <Zap className="h-3 w-3" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="truncate text-sm font-semibold text-gray-900">
                    {profile?.full_name ?? "Unknown"}
                  </h2>

                  {verified && (
                    <BadgeCheck className="h-4 w-4 shrink-0 text-blue-500" />
                  )}

                  <span className="text-xs text-gray-400">
                    {formatTimeAgo(item.created_at)}
                  </span>
                </div>

                {isSuperLike ? (
                  <div className="mt-1">
                    <p className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
                      <Zap className="h-3 w-3" />
                      Super liked you 💙
                    </p>

                    {item.message && (
                      <p className="mt-2 truncate text-sm text-gray-600">
                        “{item.message}”
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="truncate text-sm text-gray-600">
                    liked your profile ❤️
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};