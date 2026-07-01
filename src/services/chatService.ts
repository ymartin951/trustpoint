import { supabase } from "../lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { Database } from "../lib/database.types";

type Conversation = Database["public"]["Tables"]["conversations"]["Row"];
type ConversationInsert =
  Database["public"]["Tables"]["conversations"]["Insert"];
type Message = Database["public"]["Tables"]["messages"]["Row"];
type MessageInsert = Database["public"]["Tables"]["messages"]["Insert"];
type User = Database["public"]["Tables"]["users"]["Row"];

export type ConversationProfile = Pick<
  User,
  "id" | "full_name" | "avatar_url"
>;

export type InboxConversation = Conversation & {
  otherUserId: string;
  profile: ConversationProfile | null;
  lastMessage: Message | null;
  unreadCount: number;
};

type TypingPresenceState = {
  user_id: string;
  is_typing: boolean;
  full_name?: string | null;
};

type OnlinePresencePayload = {
  user_id: string;
};

type ServiceResult<T> = {
  data: T;
  error: Error | null;
};

type ErrorOnlyResult = {
  error: Error | null;
};

const buildConversationPairFilter = (user1: string, user2: string) =>
  `and(user1_id.eq.${user1},user2_id.eq.${user2}),and(user1_id.eq.${user2},user2_id.eq.${user1})`;

const normalizeError = (error: unknown, fallback: string): Error => {
  if (error instanceof Error) return error;
  return new Error(fallback);
};

// ======================================================
// GET OR CREATE CONVERSATION
// ======================================================
export const getOrCreateConversation = async (
  user1: string,
  user2: string
): Promise<ServiceResult<Conversation | null>> => {
  if (!user1 || !user2) {
    return {
      data: null,
      error: new Error("Both user IDs are required."),
    };
  }

  if (user1 === user2) {
    return {
      data: null,
      error: new Error("A user cannot create a conversation with themselves."),
    };
  }

  const { data: existing, error: existingError } = await supabase
    .from("conversations")
    .select("*")
    .or(buildConversationPairFilter(user1, user2))
    .maybeSingle();

  if (existingError) {
    return {
      data: null,
      error: normalizeError(existingError, "Failed to load conversation."),
    };
  }

  if (existing) {
    return { data: existing, error: null };
  }

  const payload: ConversationInsert = {
    user1_id: user1,
    user2_id: user2,
  };

  const { data, error } = await supabase
    .from("conversations")
    .insert(payload)
    .select("*")
    .single();

  return {
    data: data ?? null,
    error: error
      ? normalizeError(error, "Failed to create conversation.")
      : null,
  };
};

// ======================================================
// GET SINGLE CONVERSATION
// ======================================================
export const getConversationById = async (
  conversationId: string
): Promise<ServiceResult<Conversation | null>> => {
  if (!conversationId) {
    return {
      data: null,
      error: new Error("Conversation ID is required."),
    };
  }

  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .maybeSingle();

  return {
    data: data ?? null,
    error: error
      ? normalizeError(error, "Failed to load conversation.")
      : null,
  };
};

// ======================================================
// SEND MESSAGE
// Supports text + optional image
// ======================================================
export const sendMessage = async (
  conversationId: string,
  senderId: string,
  content: string,
  imageUrl?: string
): Promise<ServiceResult<Message | null>> => {
  const trimmedContent = content.trim();

  if (!conversationId || !senderId) {
    return {
      data: null,
      error: new Error("Conversation ID and sender ID are required."),
    };
  }

  if (!trimmedContent && !imageUrl) {
    return {
      data: null,
      error: new Error("Message content or image is required."),
    };
  }

  const { data: conversation, error: conversationError } =
    await getConversationById(conversationId);

  if (conversationError || !conversation) {
    return {
      data: null,
      error: conversationError ?? new Error("Conversation not found."),
    };
  }

  let receiverId: string;

  if (conversation.user1_id === senderId) {
    receiverId = conversation.user2_id;
  } else if (conversation.user2_id === senderId) {
    receiverId = conversation.user1_id;
  } else {
    return {
      data: null,
      error: new Error("Sender is not part of this conversation."),
    };
  }

  const payload: MessageInsert = {
    conversation_id: conversationId,
    sender_id: senderId,
    receiver_id: receiverId,
    content: trimmedContent || "",
    message_text: trimmedContent || null,
    read: false,
    type: imageUrl ? "image" : "text",
    image_url: imageUrl ?? null,
  };

  const { data, error } = await supabase
    .from("messages")
    .insert(payload)
    .select("*")
    .single();

  return {
    data: data ?? null,
    error: error ? normalizeError(error, "Failed to send message.") : null,
  };
};

// ======================================================
// GET MESSAGES
// ======================================================
export const getMessages = async (
  conversationId: string
): Promise<ServiceResult<Message[]>> => {
  if (!conversationId) {
    return {
      data: [],
      error: new Error("Conversation ID is required."),
    };
  }

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  return {
    data: data ?? [],
    error: error ? normalizeError(error, "Failed to load messages.") : null,
  };
};

// ======================================================
// GET CONVERSATIONS (INBOX)
// ======================================================
export const getConversations = async (
  userId: string
): Promise<ServiceResult<InboxConversation[]>> => {
  if (!userId) {
    return {
      data: [],
      error: new Error("User ID is required."),
    };
  }

  const { data: conversations, error } = await supabase
    .from("conversations")
    .select("*")
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

  if (error) {
    return {
      data: [],
      error: normalizeError(error, "Failed to load conversations."),
    };
  }

  const results = await Promise.all(
    (conversations ?? []).map(async (conv): Promise<InboxConversation> => {
      const otherUserId =
        conv.user1_id === userId ? conv.user2_id : conv.user1_id;

      const [
        { data: profile },
        { data: lastMessage },
        { count: unreadCount },
      ] = await Promise.all([
        supabase
          .from("users")
          .select("id, full_name, avatar_url")
          .eq("id", otherUserId)
          .maybeSingle(),

        supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),

        supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("conversation_id", conv.id)
          .eq("receiver_id", userId)
          .eq("read", false),
      ]);

      return {
        ...conv,
        otherUserId,
        profile: (profile as ConversationProfile | null) ?? null,
        lastMessage: lastMessage ?? null,
        unreadCount: unreadCount ?? 0,
      };
    })
  );

  const sortedResults = results.sort((a, b) => {
    const aTime = a.lastMessage
      ? new Date(a.lastMessage.created_at).getTime()
      : 0;
    const bTime = b.lastMessage
      ? new Date(b.lastMessage.created_at).getTime()
      : 0;

    if (bTime !== aTime) {
      return bTime - aTime;
    }

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return { data: sortedResults, error: null };
};

// ======================================================
// REALTIME MESSAGE INSERTS
// ======================================================
export const subscribeToMessages = (
  conversationId: string,
  callback: (message: Message) => void
): RealtimeChannel => {
  const channel = supabase.channel(`chat-${conversationId}`);

  channel.on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "messages",
      filter: `conversation_id=eq.${conversationId}`,
    },
    (payload) => {
      console.log("[Realtime][INSERT]", payload.new);
      callback(payload.new as Message);
    }
  );

  channel.subscribe((status) => {
    console.log(`[Realtime][chat-${conversationId}]`, status);
  });

  return channel;
};

// ======================================================
// REALTIME MESSAGE UPDATES (SEEN STATUS)
// ======================================================
export const subscribeToMessageUpdates = (
  conversationId: string,
  callback: (message: Message) => void
): RealtimeChannel => {
  const channel = supabase.channel(`chat-updates-${conversationId}`);

  channel.on(
    "postgres_changes",
    {
      event: "UPDATE",
      schema: "public",
      table: "messages",
      filter: `conversation_id=eq.${conversationId}`,
    },
    (payload) => {
      console.log("[Realtime][UPDATE]", payload.new);
      callback(payload.new as Message);
    }
  );

  channel.subscribe((status) => {
    console.log(`[Realtime][chat-updates-${conversationId}]`, status);
  });

  return channel;
};

// ======================================================
// MARK CONVERSATION AS READ
// ======================================================
export const markConversationAsRead = async (
  conversationId: string,
  userId: string
): Promise<ErrorOnlyResult> => {
  if (!conversationId || !userId) {
    return {
      error: new Error("Conversation ID and user ID are required."),
    };
  }

  const { error } = await supabase
    .from("messages")
    .update({ read: true })
    .eq("conversation_id", conversationId)
    .neq("sender_id", userId)
    .eq("read", false);

  return {
    error: error
      ? normalizeError(error, "Failed to mark messages as read.")
      : null,
  };
};

// ======================================================
// OPEN CHAT FROM MATCH
// ======================================================
export const openConversationWithUser = async (
  currentUserId: string,
  otherUserId: string
): Promise<ServiceResult<Conversation | null>> => {
  if (!currentUserId || !otherUserId) {
    return {
      data: null,
      error: new Error("Both user IDs are required."),
    };
  }

  if (currentUserId === otherUserId) {
    return {
      data: null,
      error: new Error("You cannot open a conversation with yourself."),
    };
  }

  return getOrCreateConversation(currentUserId, otherUserId);
};

// ======================================================
// TYPING INDICATOR (REALTIME PRESENCE)
// ======================================================
export const createTypingChannel = (
  conversationId: string
): RealtimeChannel => {
  return supabase.channel(`typing-${conversationId}`, {
    config: {
      presence: {
        key: crypto.randomUUID(),
      },
    },
  });
};

export const trackTypingState = async (
  channel: RealtimeChannel,
  payload: TypingPresenceState
) => {
  return channel.track(payload);
};

export const stopTypingState = async (channel: RealtimeChannel) => {
  return channel.untrack();
};

export const getTypingUsersFromPresence = (
  presenceState: Record<string, Array<TypingPresenceState>>,
  currentUserId: string
) => {
  return Object.values(presenceState)
    .flat()
    .filter((entry) => entry.user_id !== currentUserId && entry.is_typing);
};

// ======================================================
// ONLINE STATUS / LAST SEEN
// ======================================================
export const createOnlineStatusChannel = (): RealtimeChannel => {
  return supabase.channel("global-online-status", {
    config: {
      presence: {
        key: crypto.randomUUID(),
      },
    },
  });
};

export const trackOnlineStatus = async (
  channel: RealtimeChannel,
  userId: string
) => {
  const payload: OnlinePresencePayload = {
    user_id: userId,
  };

  return channel.track(payload);
};

export const untrackOnlineStatus = async (channel: RealtimeChannel) => {
  return channel.untrack();
};

export const getOnlineUsersFromPresence = (
  presenceState: Record<string, Array<{ user_id: string }>>
): string[] => {
  return Object.values(presenceState)
    .flat()
    .map((entry) => entry.user_id)
    .filter(Boolean);
};

export const updateLastSeen = async (
  userId: string
): Promise<ErrorOnlyResult> => {
  if (!userId) {
    return {
      error: new Error("User ID is required."),
    };
  }

  const { error } = await supabase
    .from("users")
    .update({
      last_seen_at: new Date().toISOString(),
    })
    .eq("id", userId);

  return {
    error: error ? normalizeError(error, "Failed to update last seen.") : null,
  };
};