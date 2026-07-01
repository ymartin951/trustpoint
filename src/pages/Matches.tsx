import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, BadgeCheck } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { getAvatarUrl } from "../lib/utils";
import { openConversationWithUser } from "../services/chatService";
import type { Database } from "../lib/database.types";

type MatchRow = Database["public"]["Tables"]["matches"]["Row"];
type UserRow = Database["public"]["Tables"]["users"]["Row"];

type MatchedProfile = Pick<
  UserRow,
  | "id"
  | "full_name"
  | "avatar_url"
  | "bio"
  | "city"
  | "country"
  | "verified"
  | "verification_status"
>;

type MatchCard = {
  match: MatchRow;
  profile: MatchedProfile | null;
};

export const Matches = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [matches, setMatches] = useState<MatchCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingChatUserId, setStartingChatUserId] = useState<string | null>(null);

  const isVerified = (profile: any) =>
    profile?.verified || profile?.verification_status === "verified";

  useEffect(() => {
    let isMounted = true;

    const loadMatches = async () => {
      if (!user?.id) {
        setMatches([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      const { data: matchRows, error } = await supabase
        .from("matches")
        .select("*")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (!isMounted) return;

      if (error) {
        console.error(error);
        setMatches([]);
        setLoading(false);
        return;
      }

      const validatedMatches = await Promise.all(
        (matchRows ?? []).map(async (match): Promise<MatchCard | null> => {
          const otherUserId =
            match.user1_id === user.id ? match.user2_id : match.user1_id;

          const [{ data: likeA }, { data: likeB }, { data: profile }] =
            await Promise.all([
              supabase
                .from("likes")
                .select("id")
                .eq("sender_id", user.id)
                .eq("receiver_id", otherUserId)
                .maybeSingle(),
              supabase
                .from("likes")
                .select("id")
                .eq("sender_id", otherUserId)
                .eq("receiver_id", user.id)
                .maybeSingle(),
              supabase
                .from("users")
                .select(
                  "id, full_name, avatar_url, bio, city, country, verified, verification_status"
                )
                .eq("id", otherUserId)
                .maybeSingle(),
            ]);

          if (!likeA || !likeB) return null;

          return {
            match,
            profile: profile ?? null,
          };
        })
      );

      if (!isMounted) return;

      setMatches(validatedMatches.filter(Boolean) as MatchCard[]);
      setLoading(false);
    };

    void loadMatches();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const handleMessageMatch = async (otherUserId: string) => {
    if (!user?.id || !otherUserId) return;
    if (startingChatUserId === otherUserId) return;

    setStartingChatUserId(otherUserId);

    const { data, error } = await openConversationWithUser(user.id, otherUserId);

    if (error || !data) {
      console.error(error);
      setStartingChatUserId(null);
      return;
    }

    setTimeout(() => {
      navigate(`/chat/${data.id}`);
    }, 200);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-rose-500" />
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-xl font-semibold">No matches yet</h2>
        <p className="mt-2 text-gray-500">
          Keep exploring profiles to find your perfect connection 💕
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-4">
      <h1 className="mb-6 text-2xl font-bold">Your Matches</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {matches.map(({ match, profile }) => {
          const profileId = profile?.id;
          const verified = isVerified(profile);

          return (
            <div
              key={match.id}
              className="overflow-hidden rounded-2xl bg-white shadow transition hover:shadow-md"
            >
              <div className="relative">
                <img
                  src={getAvatarUrl(profile?.avatar_url ?? "")}
                  className="h-64 w-full object-cover"
                />

                {/* VERIFIED BADGE (IMAGE) */}
                {verified && (
                  <div className="absolute top-2 right-2 rounded-full bg-blue-500 p-1 text-white">
                    <BadgeCheck size={14} />
                  </div>
                )}
              </div>

              <div className="p-4">
                {/* NAME + VERIFIED */}
                <div className="flex items-center gap-1">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {profile?.full_name ?? "Unknown"}
                  </h2>

                  {verified && (
                    <BadgeCheck size={16} className="text-blue-500" />
                  )}
                </div>

                <p className="mt-1 text-sm text-gray-500">
                  {[profile?.city, profile?.country]
                    .filter(Boolean)
                    .join(", ") || "Location not added"}
                </p>

                <p className="mt-3 line-clamp-3 text-sm text-gray-600">
                  {profile?.bio ?? "No bio"}
                </p>

                <button
                  onClick={() => profileId && handleMessageMatch(profileId)}
                  disabled={!profileId || startingChatUserId === profileId}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rose-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-rose-600 disabled:opacity-50"
                >
                  <MessageCircle className="h-4 w-4" />
                  {startingChatUserId === profileId ? "Opening..." : "Message"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};