import { supabase } from "../lib/supabase";
import type { Database } from "../lib/database.types";

type LikeRow = Database["public"]["Tables"]["likes"]["Row"];
type MatchRow = Database["public"]["Tables"]["matches"]["Row"];
type UserRow = Database["public"]["Tables"]["users"]["Row"];

type LikeWithProfile = LikeRow & {
  profile: UserRow | null;
};

type MatchWithProfile = MatchRow & {
  profile: UserRow | null;
};

const FREE_DAILY_LIKE_LIMIT = 10;

const getTodayDate = () => {
  return new Date().toISOString().split("T")[0];
};

const isUserPremium = async (userId: string) => {
  const { data, error } = await (supabase.rpc as any)("has_active_premium", {
    p_user_id: userId,
  });

  if (error) {
    console.error("Error checking premium status:", error);
    return false;
  }

  return Boolean(data);
};

const incrementDailyLikeCount = async (userId: string) => {
  const today = getTodayDate();

  const { data: existing, error: fetchError } = await supabase
    .from("daily_likes")
    .select("id, likes_count")
    .eq("user_id", userId)
    .eq("date", today)
    .maybeSingle();

  if (fetchError) {
    console.error("Error fetching daily likes:", fetchError);
    return { error: fetchError };
  }

  if (!existing) {
    const { error } = await supabase.from("daily_likes").insert({
      user_id: userId,
      date: today,
      likes_count: 1,
    });

    return { error };
  }

  const { error } = await supabase
    .from("daily_likes")
    .update({
      likes_count: Number(existing.likes_count || 0) + 1,
    })
    .eq("id", existing.id);

  return { error };
};

export const getDailyLikesRemaining = async (userId: string) => {
  const premium = await isUserPremium(userId);

  if (premium) {
    return {
      remaining: -1,
      isPremium: true,
      limit: null,
      used: 0,
      error: null,
    };
  }

  const today = getTodayDate();

  const { data: dailyLikes, error } = await supabase
    .from("daily_likes")
    .select("likes_count")
    .eq("user_id", userId)
    .eq("date", today)
    .maybeSingle();

  if (error) {
    console.error("Error loading daily likes remaining:", error);

    return {
      remaining: 0,
      isPremium: false,
      limit: FREE_DAILY_LIKE_LIMIT,
      used: 0,
      error,
    };
  }

  const used = Number(dailyLikes?.likes_count || 0);
  const remaining = Math.max(0, FREE_DAILY_LIKE_LIMIT - used);

  return {
    remaining,
    isPremium: false,
    limit: FREE_DAILY_LIKE_LIMIT,
    used,
    error: null,
  };
};

export const likeUser = async (senderId: string, receiverId: string) => {
  try {
    if (!senderId || !receiverId) {
      return {
        match: false,
        liked: false,
        limitReached: false,
        message: "Missing user information.",
        error: new Error("Missing senderId or receiverId"),
      };
    }

    if (senderId === receiverId) {
      return {
        match: false,
        liked: false,
        limitReached: false,
        message: "You cannot like your own profile.",
        error: new Error("Users cannot like themselves"),
      };
    }

    const { data: existingLike, error: existingLikeError } = await supabase
      .from("likes")
      .select("id")
      .eq("sender_id", senderId)
      .eq("receiver_id", receiverId)
      .maybeSingle();

    if (existingLikeError) {
      console.error("Error checking existing like:", existingLikeError);

      return {
        match: false,
        liked: false,
        limitReached: false,
        message: "Failed to check like status.",
        error: existingLikeError,
      };
    }

    if (existingLike) {
      const { data: reverseLike, error: reverseError } = await supabase
        .from("likes")
        .select("id")
        .eq("sender_id", receiverId)
        .eq("receiver_id", senderId)
        .maybeSingle();

      if (reverseError) {
        console.error("Error checking reverse like:", reverseError);

        return {
          match: false,
          liked: true,
          limitReached: false,
          message: "You already liked this profile.",
          error: reverseError,
        };
      }

      return {
        match: Boolean(reverseLike),
        liked: true,
        limitReached: false,
        message: "You already liked this profile.",
        error: null,
      };
    }

    const premium = await isUserPremium(senderId);

    if (!premium) {
      const today = getTodayDate();

      const { data: dailyLikes, error: dailyLikesError } = await supabase
        .from("daily_likes")
        .select("likes_count")
        .eq("user_id", senderId)
        .eq("date", today)
        .maybeSingle();

      if (dailyLikesError) {
        console.error("Error checking daily like limit:", dailyLikesError);

        return {
          match: false,
          liked: false,
          limitReached: false,
          message: "Failed to check daily like limit.",
          error: dailyLikesError,
        };
      }

      const usedLikes = Number(dailyLikes?.likes_count || 0);

      if (usedLikes >= FREE_DAILY_LIKE_LIMIT) {
        return {
          match: false,
          liked: false,
          limitReached: true,
          message:
            "You have reached your free daily like limit. Upgrade to Premium for unlimited likes.",
          error: null,
        };
      }
    }

    const { error: likeError } = await supabase.from("likes").insert({
      sender_id: senderId,
      receiver_id: receiverId,
      is_read: false,
    });

    if (likeError) {
      console.error("Error inserting like:", likeError);

      return {
        match: false,
        liked: false,
        limitReached: false,
        message: "Failed to like profile.",
        error: likeError,
      };
    }

    if (!premium) {
      const { error: incrementError } = await incrementDailyLikeCount(senderId);

      if (incrementError) {
        console.error("Like was saved, but daily like count failed:", incrementError);
      }
    }

    const { data: reverseLike, error: checkError } = await supabase
      .from("likes")
      .select("id")
      .eq("sender_id", receiverId)
      .eq("receiver_id", senderId)
      .maybeSingle();

    if (checkError) {
      console.error("Error checking reverse like:", checkError);

      return {
        match: false,
        liked: true,
        limitReached: false,
        message: "Profile liked, but match check failed.",
        error: checkError,
      };
    }

    const isMatch = Boolean(reverseLike);

    if (isMatch) {
      const user1_id = [senderId, receiverId].sort()[0];
      const user2_id = [senderId, receiverId].sort()[1];

      const { data: existingMatch, error: existingMatchError } = await supabase
        .from("matches")
        .select("id")
        .eq("user1_id", user1_id)
        .eq("user2_id", user2_id)
        .maybeSingle();

      if (existingMatchError) {
        console.error("Error checking existing match:", existingMatchError);

        return {
          match: true,
          liked: true,
          limitReached: false,
          message: "It's a match, but match record check failed.",
          error: existingMatchError,
        };
      }

      if (!existingMatch) {
        const { error: matchInsertError } = await supabase
          .from("matches")
          .insert({
            user1_id,
            user2_id,
          });

        if (matchInsertError) {
          console.error("Error inserting match:", matchInsertError);

          return {
            match: true,
            liked: true,
            limitReached: false,
            message: "It's a match, but match record failed.",
            error: matchInsertError,
          };
        }
      }
    }

    return {
      match: isMatch,
      liked: true,
      limitReached: false,
      message: isMatch ? "It's a match!" : "Profile liked successfully.",
      error: null,
    };
  } catch (err: any) {
    console.error("Unexpected likeUser error:", err);

    return {
      match: false,
      liked: false,
      limitReached: false,
      message: "Something went wrong while liking this profile.",
      error: err,
    };
  }
};

export const unlikeUser = async (senderId: string, receiverId: string) => {
  const { error } = await supabase
    .from("likes")
    .delete()
    .eq("sender_id", senderId)
    .eq("receiver_id", receiverId);

  return { error };
};

export const getMatches = async (userId: string) => {
  const { data, error } = await supabase
    .from("matches")
    .select(
      `
      id,
      created_at,
      user1_id,
      user2_id
    `
    )
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

  if (error) return { data: null, error };

  const matchesWithProfiles: MatchWithProfile[] = await Promise.all(
    (data || []).map(async (match) => {
      const otherUserId =
        match.user1_id === userId ? match.user2_id : match.user1_id;

      const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("id", otherUserId)
        .maybeSingle();

      return {
        ...match,
        profile: profile ?? null,
      };
    })
  );

  return { data: matchesWithProfiles, error: null };
};

export const checkIfMatched = async (userId1: string, userId2: string) => {
  const user1_id = [userId1, userId2].sort()[0];
  const user2_id = [userId1, userId2].sort()[1];

  const { data, error } = await supabase
    .from("matches")
    .select("id")
    .eq("user1_id", user1_id)
    .eq("user2_id", user2_id)
    .maybeSingle();

  return { matched: Boolean(data), error };
};

export const getLikesReceived = async (userId: string) => {
  const { data, error } = await supabase
    .from("likes")
    .select(
      `
      id,
      created_at,
      sender_id,
      receiver_id,
      is_read
    `
    )
    .eq("receiver_id", userId)
    .order("created_at", { ascending: false });

  if (error) return { data: null, error };

  const likesWithProfiles: LikeWithProfile[] = await Promise.all(
    (data || []).map(async (like) => {
      const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("id", like.sender_id)
        .maybeSingle();

      return {
        ...like,
        profile: profile ?? null,
      };
    })
  );

  return { data: likesWithProfiles, error: null };
};

export const getTotalLikesCount = async (userId: string) => {
  const { count, error } = await supabase
    .from("likes")
    .select("*", { count: "exact", head: true })
    .eq("receiver_id", userId);

  return { count: count ?? 0, error };
};

export const getUnreadLikesCount = async (userId: string) => {
  const { count, error } = await supabase
    .from("likes")
    .select("*", { count: "exact", head: true })
    .eq("receiver_id", userId)
    .eq("is_read", false);

  return { count: count ?? 0, error };
};

export const markLikesAsRead = async (userId: string) => {
  const { error } = await supabase
    .from("likes")
    .update({ is_read: true })
    .eq("receiver_id", userId)
    .eq("is_read", false);

  return { error };
};