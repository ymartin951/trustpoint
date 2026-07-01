import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import {
  getConversations,
  type InboxConversation,
} from "../services/chatService";
import { getAvatarUrl } from "../lib/utils";

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  content: string | null;
  image_url?: string | null;
  created_at: string;
  read?: boolean | null;
};

type ConversationRow = {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
};

export const InboxPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState<InboxConversation[]>([]);
  const [loading, setLoading] = useState(true);

  const isMountedRef = useRef(true);
  const reloadTimerRef = useRef<number | null>(null);

  const userId = user?.id ?? null;

  const loadConversations = useCallback(
    async (showLoader = true) => {
      if (!userId) {
        if (!isMountedRef.current) return;
        setConversations([]);
        setLoading(false);
        return;
      }

      if (showLoader && isMountedRef.current) {
        setLoading(true);
      }

      const { data, error } = await getConversations(userId);

      if (!isMountedRef.current) return;

      if (error) {
        console.error("Failed to load conversations:", error);
        setConversations([]);
      } else {
        setConversations(data);
      }

      if (showLoader) {
        setLoading(false);
      }
    },
    [userId]
  );

  const scheduleReload = useCallback(() => {
    if (reloadTimerRef.current) {
      window.clearTimeout(reloadTimerRef.current);
    }

    reloadTimerRef.current = window.setTimeout(() => {
      void loadConversations(false);
    }, 120);
  }, [loadConversations]);

  const isRelevantMessage = useCallback(
    (message: Partial<MessageRow> | null | undefined) => {
      if (!message || !userId) return false;

      return (
        message.sender_id === userId ||
        message.receiver_id === userId
      );
    },
    [userId]
  );

  const isRelevantConversation = useCallback(
    (conversation: Partial<ConversationRow> | null | undefined) => {
      if (!conversation || !userId) return false;

      return (
        conversation.user1_id === userId ||
        conversation.user2_id === userId
      );
    },
    [userId]
  );

  useEffect(() => {
    isMountedRef.current = true;
    void loadConversations(true);

    return () => {
      isMountedRef.current = false;

      if (reloadTimerRef.current) {
        window.clearTimeout(reloadTimerRef.current);
      }
    };
  }, [loadConversations]);

  useEffect(() => {
    if (!userId) return;

    const inboxChannel: RealtimeChannel = supabase.channel(`inbox:${userId}`);

    inboxChannel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const newMessage = payload.new as MessageRow;
          if (!isRelevantMessage(newMessage)) return;
          scheduleReload();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const updatedMessage = payload.new as MessageRow;
          const oldMessage = payload.old as Partial<MessageRow>;
          if (
            !isRelevantMessage(updatedMessage) &&
            !isRelevantMessage(oldMessage)
          ) {
            return;
          }
          scheduleReload();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const oldMessage = payload.old as Partial<MessageRow>;
          if (!isRelevantMessage(oldMessage)) return;
          scheduleReload();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversations",
        },
        (payload) => {
          const newConversation = payload.new as ConversationRow;
          if (!isRelevantConversation(newConversation)) return;
          scheduleReload();
        }
      )
      .subscribe((status) => {
        console.log(`[Realtime][inbox:${userId}]`, status);
      });

    return () => {
      void supabase.removeChannel(inboxChannel);
    };
  }, [userId, isRelevantConversation, isRelevantMessage, scheduleReload]);

  const emptyState = useMemo(() => conversations.length === 0, [conversations]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-rose-500" />
      </div>
    );
  }

  if (emptyState) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-xl font-semibold">No messages yet</h2>
        <p className="mt-2 text-gray-500">
          Start liking people to get matches 💕
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-4">
      <h1 className="mb-6 text-2xl font-bold">Inbox</h1>

      <div className="space-y-3">
        {conversations.map((conv) => {
          const profile = conv.profile;
          const lastMessage = conv.lastMessage;
          const previewText = lastMessage
            ? lastMessage.image_url
              ? lastMessage.sender_id === userId
                ? "You sent a photo"
                : "Sent you a photo"
              : lastMessage.sender_id === userId
                ? `You: ${lastMessage.content ?? ""}`
                : (lastMessage.content ?? "")
            : "No messages yet";

          return (
            <button
              key={conv.id}
              type="button"
              onClick={() => navigate(`/chat/${conv.id}`)}
              className="flex w-full items-center gap-4 rounded-xl bg-white p-3 text-left shadow transition hover:bg-gray-50"
            >
              <img
                src={getAvatarUrl(profile?.avatar_url ?? "")}
                alt={profile?.full_name ?? "User avatar"}
                className="h-14 w-14 rounded-full object-cover"
              />

              <div className="min-w-0 flex-1">
                <h2 className="font-semibold">
                  {profile?.full_name ?? "Unknown"}
                </h2>

                <p
                  className={`truncate text-sm ${
                    conv.unreadCount > 0
                      ? "font-semibold text-gray-900"
                      : "text-gray-500"
                  }`}
                >
                  {previewText}
                </p>
              </div>

              <div className="flex flex-col items-end gap-1">
                {lastMessage ? (
                  <span className="text-xs text-gray-400">
                    {new Date(lastMessage.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                ) : null}

                {conv.unreadCount > 0 ? (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-2 text-xs font-semibold text-white">
                    {conv.unreadCount}
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};