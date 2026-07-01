import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { getConversations } from "../services/chatService";
import { getAvatarUrl } from "../lib/utils";

export const Inbox = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ Load conversations
  const loadConversations = async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await getConversations(user.id);

    if (!error && data) {
      setConversations(data);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadConversations();
  }, [user]);

  // 🔄 Realtime updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("inbox-updates")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        () => {
          loadConversations(); // refresh inbox on new message
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // 🔄 Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-b-2 border-rose-500 rounded-full" />
      </div>
    );
  }

  // 🚫 No conversations
  if (conversations.length === 0) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold">No messages yet</h2>
        <p className="text-gray-500 mt-2">
          Start liking people to get matches 💕
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Inbox</h1>

      <div className="space-y-3">
        {conversations.map((conv) => {
          const profile = conv.profile;
          const lastMessage = conv.lastMessage;

          return (
            <div
              key={conv.id}
              onClick={() => navigate(`/chat/${conv.id}`)}
              className="flex items-center gap-4 p-3 bg-white rounded-xl shadow cursor-pointer hover:bg-gray-50 transition"
            >
              {/* Avatar */}
              <img
                src={getAvatarUrl(profile?.avatar_url ?? "")}
                alt="avatar"
                className="w-14 h-14 rounded-full object-cover"
              />

              {/* Info */}
              <div className="flex-1">
                <h2 className="font-semibold">
                  {profile?.full_name ?? "Unknown"}
                </h2>

                <p className="text-sm text-gray-500 truncate">
                  {lastMessage?.content ?? "No messages yet"}
                </p>
              </div>

              {/* Time */}
              {lastMessage && (
                <span className="text-xs text-gray-400">
                  {new Date(lastMessage.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};