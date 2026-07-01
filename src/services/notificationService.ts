import { supabase } from "../lib/supabase";
import type { Database } from "../lib/database.types";

type UserRow = Database["public"]["Tables"]["users"]["Row"];

export type NotificationType = "like" | "message" | "super_like" | "profile_view";

export type AppNotification = {
  id: string;
  type: NotificationType;
  created_at: string;
  title: string;
  body: string;
  avatar_url: string | null;
  actor_id: string | null;
  conversation_id?: string | null;
  is_read: boolean;
};

const getUserProfile = async (userId: string | null | undefined) => {
  if (!userId) return null;

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load notification user profile:", error);
    return null;
  }

  return data as UserRow | null;
};

const buildNotifications = async ({
  likes,
  messages,
  superLikes,
  profileViews,
}: {
  likes: any[];
  messages: any[];
  superLikes: any[];
  profileViews: any[];
}): Promise<AppNotification[]> => {
  const likeNotifications: AppNotification[] = await Promise.all(
    likes.map(async (like) => {
      const userProfile = await getUserProfile(like.sender_id);

      return {
        id: like.id,
        type: "like",
        created_at: like.created_at,
        title: userProfile?.full_name ?? "Someone",
        body: "liked your profile ❤️",
        avatar_url: userProfile?.avatar_url ?? null,
        actor_id: like.sender_id,
        is_read: Boolean(like.is_read),
      };
    })
  );

  const superLikeNotifications: AppNotification[] = await Promise.all(
    superLikes.map(async (superLike) => {
      const userProfile = await getUserProfile(superLike.sender_id);

      return {
        id: superLike.id,
        type: "super_like",
        created_at: superLike.created_at,
        title: userProfile?.full_name ?? "Someone",
        body: superLike.message
          ? `Super liked you 💙: "${superLike.message}"`
          : "Super liked you 💙",
        avatar_url: userProfile?.avatar_url ?? null,
        actor_id: superLike.sender_id,
        is_read: Boolean(superLike.is_read),
      };
    })
  );

  const messageNotifications: AppNotification[] = await Promise.all(
    messages.map(async (message) => {
      const userProfile = await getUserProfile(message.sender_id);

      return {
        id: message.id,
        type: "message",
        created_at: message.created_at,
        title: userProfile?.full_name ?? "Someone",
        body: message.image_url
          ? "sent you an image 📷"
          : message.content || "sent you a message",
        avatar_url: userProfile?.avatar_url ?? null,
        actor_id: message.sender_id,
        conversation_id: message.conversation_id,
        is_read: Boolean(message.read),
      };
    })
  );

  const profileViewNotifications: AppNotification[] = await Promise.all(
    profileViews.map(async (notification) => {
      const viewerId =
        notification.actor_id ??
        notification.data?.viewer_id ??
        notification.data?.actor_id ??
        null;

      const userProfile = await getUserProfile(viewerId);

      return {
        id: notification.id,
        type: "profile_view",
        created_at: notification.created_at,
        title: userProfile?.full_name ?? notification.title ?? "Someone",
        body: notification.message ?? notification.body ?? "viewed your profile 👀",
        avatar_url: userProfile?.avatar_url ?? null,
        actor_id: viewerId,
        is_read: Boolean(notification.is_read),
      };
    })
  );

  return [
    ...profileViewNotifications,
    ...superLikeNotifications,
    ...likeNotifications,
    ...messageNotifications,
  ].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
};

export const getAllNotifications = async (userId: string) => {
  try {
    const [
      { data: likes, error: likesError },
      { data: messages, error: messagesError },
      { data: superLikes, error: superLikesError },
      { data: profileViews, error: profileViewsError },
    ] = await Promise.all([
      supabase
        .from("likes")
        .select("id, created_at, sender_id, is_read")
        .eq("receiver_id", userId)
        .limit(100),

      supabase
        .from("messages")
        .select(
          "id, created_at, sender_id, conversation_id, content, image_url, read"
        )
        .eq("receiver_id", userId)
        .limit(100),

      supabase
        .from("super_likes")
        .select("id, created_at, sender_id, is_read, message")
        .eq("receiver_id", userId)
        .limit(100),

      (supabase as any)
        .from("notifications")
        .select("id, type, title, message, data, is_read, created_at")
        .eq("user_id", userId)
        .eq("type", "profile_view")
        .limit(100),
    ]);

    const firstError =
      likesError || messagesError || superLikesError || profileViewsError;

    if (firstError) {
      console.error("Failed to load notifications:", firstError);
      return { data: [], error: firstError };
    }

    const notifications = await buildNotifications({
      likes: likes ?? [],
      messages: messages ?? [],
      superLikes: superLikes ?? [],
      profileViews: profileViews ?? [],
    });

    return { data: notifications, error: null };
  } catch (error) {
    console.error("Unexpected notification load error:", error);
    return { data: [], error };
  }
};

export const getUnreadNotificationsCount = async (userId: string) => {
  try {
    const [
      { count: likesCount },
      { count: messagesCount },
      { count: superLikesCount },
      { count: profileViewsCount },
    ] = await Promise.all([
      supabase
        .from("likes")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", userId)
        .eq("is_read", false),

      supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", userId)
        .eq("read", false),

      supabase
        .from("super_likes")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", userId)
        .eq("is_read", false),

      (supabase as any)
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("type", "profile_view")
        .eq("is_read", false),
    ]);

    return {
      count:
        (likesCount ?? 0) +
        (messagesCount ?? 0) +
        (superLikesCount ?? 0) +
        (profileViewsCount ?? 0),
      error: null,
    };
  } catch (error) {
    console.error("Failed to load unread notification count:", error);
    return { count: 0, error };
  }
};

export const markLikeNotificationAsRead = async (
  likeId: string,
  userId: string
) => {
  const { error } = await supabase
    .from("likes")
    .update({ is_read: true })
    .eq("id", likeId)
    .eq("receiver_id", userId);

  return { error };
};

export const markSuperLikeAsRead = async (id: string, userId: string) => {
  const { error } = await supabase
    .from("super_likes")
    .update({ is_read: true })
    .eq("id", id)
    .eq("receiver_id", userId);

  return { error };
};

export const markConversationMessagesAsRead = async (
  conversationId: string,
  userId: string
) => {
  const { error } = await supabase
    .from("messages")
    .update({ read: true })
    .eq("conversation_id", conversationId)
    .eq("receiver_id", userId)
    .eq("read", false);

  return { error };
};

export const markProfileViewNotificationAsRead = async (
  notificationId: string,
  userId: string
) => {
  const { error } = await (supabase as any)
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("user_id", userId)
    .eq("type", "profile_view");

  return { error };
};

export const markAllNotificationsAsRead = async (userId: string) => {
  const [
    likesResult,
    messagesResult,
    superLikesResult,
    profileViewsResult,
  ] = await Promise.all([
    supabase
      .from("likes")
      .update({ is_read: true })
      .eq("receiver_id", userId)
      .eq("is_read", false),

    supabase
      .from("messages")
      .update({ read: true })
      .eq("receiver_id", userId)
      .eq("read", false),

    supabase
      .from("super_likes")
      .update({ is_read: true })
      .eq("receiver_id", userId)
      .eq("is_read", false),

    (supabase as any)
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false),
  ]);

  const error =
    likesResult.error ||
    messagesResult.error ||
    superLikesResult.error ||
    profileViewsResult.error;

  return { error };
};