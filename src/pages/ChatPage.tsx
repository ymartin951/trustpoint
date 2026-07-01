import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  ImagePlus,
  Loader2,
  Send,
  X,
} from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { Database } from "../lib/database.types";
import { useAuth } from "../context/AuthContext";
import { useUnreadMessages } from "../context/UnreadMessagesContext";
import {
  createOnlineStatusChannel,
  createTypingChannel,
  getConversationById,
  getMessages,
  getOnlineUsersFromPresence,
  getTypingUsersFromPresence,
  markConversationAsRead,
  stopTypingState,
  subscribeToMessages,
  subscribeToMessageUpdates,
  trackOnlineStatus,
  trackTypingState,
  untrackOnlineStatus,
} from "../services/chatService";
import { sendCreditMessage } from "../services/creditService";
import { supabase } from "../lib/supabase";
import { getAvatarUrl } from "../lib/utils";
import { containsBlockedContent } from "../utils/messageFilter";

type BaseMessage = Database["public"]["Tables"]["messages"]["Row"];
type User = Database["public"]["Tables"]["users"]["Row"];
type Conversation = Database["public"]["Tables"]["conversations"]["Row"];

type ChatMessage = BaseMessage & {
  type?: "text" | "image" | null;
  image_url?: string | null;
  message_text?: string | null;
  receiver_id?: string;
};

type ChatPartner = Pick<
  User,
  | "id"
  | "full_name"
  | "avatar_url"
  | "last_seen_at"
  | "verified"
  | "verification_status"
>;

type TypingPresenceEntry = {
  user_id: string;
  is_typing: boolean;
  full_name?: string | null;
};

type TypingPresenceState = Record<string, TypingPresenceEntry[]>;
type OnlinePresenceState = Record<string, Array<{ user_id: string }>>;

type UpsellReason = "low" | "failed" | null;

type CreditBundle = {
  credits: number;
  price: number;
  label: string;
  description: string;
  bestValue?: boolean;
};

type PaymentNotice = {
  type: "success" | "error" | "info";
  message: string;
} | null;

const CHAT_MEDIA_BUCKET = "chat-images";

const CREDIT_BUNDLES: CreditBundle[] = [
  {
    credits: 50,
    price: 5,
    label: "Starter",
    description: "Quick top-up",
  },
  {
    credits: 300,
    price: 20,
    label: "Best Value",
    description: "Most popular",
    bestValue: true,
  },
  {
    credits: 800,
    price: 50,
    label: "Premium",
    description: "Chat longer",
  },
];

const isVerifiedUser = (item?: {
  verified?: boolean | null;
  verification_status?: string | null;
} | null) => {
  return Boolean(item?.verified || item?.verification_status === "verified");
};

const formatLastSeen = (value: string | null) => {
  if (!value) return "Offline";

  const date = new Date(value);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  if (Number.isNaN(diffMs)) return "Offline";

  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return "Last seen just now";
  if (diffMinutes < 60) return `Last seen ${diffMinutes} min ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `Last seen ${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `Last seen ${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
};

const sanitizeFileName = (name: string) => {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
};

const getMessageStatusLabel = (msg: ChatMessage) => {
  return msg.read ? "Seen" : "Sent";
};

const sortMessages = (items: ChatMessage[]) => {
  return [...items].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
};

export const ChatPage = () => {
  const { user } = useAuth();
  const { refreshUnreadCount } = useUnreadMessages();
  const navigate = useNavigate();
  const { conversationId } = useParams<{ conversationId: string }>();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [partner, setPartner] = useState<ChatPartner | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [isPartnerOnline, setIsPartnerOnline] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const [showUpsell, setShowUpsell] = useState(false);
  const [upsellReason, setUpsellReason] = useState<UpsellReason>(null);
  const [startingPayment, setStartingPayment] = useState(false);

  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [paymentNotice, setPaymentNotice] = useState<PaymentNotice>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const typingChannelRef = useRef<RealtimeChannel | null>(null);
  const partnerPresenceChannelRef = useRef<RealtimeChannel | null>(null);
  const verifiedReferenceRef = useRef<string | null>(null);

  const partnerIsVerified = isVerifiedUser(partner);

  const canSend = useMemo(() => {
    return (messageText.trim().length > 0 || !!selectedImage) && !sending;
  }, [messageText, selectedImage, sending]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const upsertMessage = (incoming: ChatMessage) => {
    setMessages((prev) => {
      const existingIndex = prev.findIndex((msg) => msg.id === incoming.id);

      if (existingIndex === -1) {
        return sortMessages([...prev, incoming]);
      }

      const next = [...prev];
      next[existingIndex] = { ...next[existingIndex], ...incoming };
      return sortMessages(next);
    });
  };

  const replaceTempMessage = (tempId: string, realMessage: ChatMessage) => {
    setMessages((prev) => {
      const realExists = prev.some((msg) => msg.id === realMessage.id);

      if (realExists) {
        return sortMessages(
          prev
            .filter((msg) => msg.id !== tempId)
            .map((msg) =>
              msg.id === realMessage.id ? { ...msg, ...realMessage } : msg
            )
        );
      }

      return sortMessages(
        prev.map((msg) => (msg.id === tempId ? realMessage : msg))
      );
    });
  };

  const removeTempMessageById = (tempId: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
  };

  const openUpsell = (reason: Exclude<UpsellReason, null>) => {
    setUpsellReason(reason);
    setShowUpsell(true);
  };

  const closeUpsell = () => {
    setShowUpsell(false);
    setUpsellReason(null);
  };

  const cleanPaymentReferenceFromUrl = () => {
    const url = new URL(window.location.href);

    url.searchParams.delete("reference");
    url.searchParams.delete("trxref");

    window.history.replaceState({}, document.title, url.pathname + url.search);
  };

  const getCurrentChatReturnUrl = () => {
    const path = conversationId ? `/chat/${conversationId}` : "/notifications";
    return `${window.location.origin}${path}`;
  };

  const handleBuyCredits = async (bundle: CreditBundle) => {
    if (!user?.id) {
      alert("Please login again before buying credits.");
      return;
    }

    try {
      setStartingPayment(true);
      setPaymentNotice(null);

      const { data, error } = await supabase.functions.invoke(
        "initialize-credit-payment",
        {
          body: {
            packageId: String(bundle.credits),
            credits: bundle.credits,
            amount: bundle.price,
            returnUrl: getCurrentChatReturnUrl(),
            source: "chat_upsell",
          },
        }
      );

      if (error) {
        console.error("Failed to initialize payment:", error);
        alert("Failed to start payment. Please try again.");
        return;
      }

      const authorizationUrl =
        data?.authorization_url ??
        data?.authorizationUrl ??
        data?.data?.authorization_url ??
        data?.data?.authorizationUrl;

      if (!authorizationUrl) {
        console.error("Payment response missing authorization URL:", data);
        alert("Payment could not be started. Please try again.");
        return;
      }

      window.location.href = authorizationUrl;
    } catch (error) {
      console.error("Failed to start payment:", error);
      alert("Failed to start payment. Please try again.");
    } finally {
      setStartingPayment(false);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  useEffect(() => {
    if (!user?.id) return;

    const params = new URLSearchParams(window.location.search);
    const reference = params.get("reference") || params.get("trxref");

    if (!reference) return;
    if (verifiedReferenceRef.current === reference) return;

    verifiedReferenceRef.current = reference;

    const verifyPayment = async () => {
      try {
        setVerifyingPayment(true);
        setPaymentNotice({
          type: "info",
          message: "Verifying your payment...",
        });

        const { data, error } = await supabase.functions.invoke(
          "verify-credit-payment",
          {
            body: {
              reference,
            },
          }
        );

        if (error) {
          console.error("Payment verification failed:", error);

          setPaymentNotice({
            type: "error",
            message:
              "Payment was successful, but credit verification failed. Please refresh or contact support with your payment reference.",
          });

          return;
        }

        if (!data?.ok) {
          console.error("Payment verification returned invalid response:", data);

          setPaymentNotice({
            type: "error",
            message:
              data?.error ||
              "Payment could not be verified. Please contact support.",
          });

          return;
        }

        closeUpsell();

        const creditsAdded = Number(data?.credits_added ?? 0);
        const balance = Number(data?.balance ?? 0);

        if (data?.already_processed) {
          setPaymentNotice({
            type: "success",
            message: `Payment already verified. Your current balance is ${balance} credits.`,
          });
        } else {
          setPaymentNotice({
            type: "success",
            message: `Payment successful! ${creditsAdded} credits added. Your new balance is ${balance} credits.`,
          });
        }

        cleanPaymentReferenceFromUrl();

        window.setTimeout(() => {
          setPaymentNotice(null);
        }, 7000);
      } catch (error) {
        console.error("Payment verification error:", error);

        setPaymentNotice({
          type: "error",
          message:
            "Payment verification failed. Please refresh the page or contact support.",
        });
      } finally {
        setVerifyingPayment(false);
      }
    };

    void verifyPayment();
  }, [user?.id]);

  useEffect(() => {
    let isActive = true;

    const loadChat = async () => {
      if (!user?.id || !conversationId) {
        setLoading(false);
        return;
      }

      setLoading(true);

      const { data: conv, error: convError } =
        await getConversationById(conversationId);

      if (!isActive) return;

      if (convError || !conv) {
        console.error("Failed to load conversation:", convError);
        setConversation(null);
        setPartner(null);
        setMessages([]);
        setLoading(false);
        return;
      }

      if (conv.user1_id !== user.id && conv.user2_id !== user.id) {
        console.error("User is not part of this conversation");
        setConversation(null);
        setPartner(null);
        setMessages([]);
        setLoading(false);
        return;
      }

      setConversation(conv);

      const otherUserId =
        conv.user1_id === user.id ? conv.user2_id : conv.user1_id;

      const [
        { data: partnerData },
        { data: messagesData, error: messagesError },
      ] = await Promise.all([
        supabase
          .from("users")
          .select(
            "id, full_name, avatar_url, last_seen_at, verified, verification_status"
          )
          .eq("id", otherUserId)
          .maybeSingle(),
        getMessages(conversationId),
      ]);

      if (!isActive) return;

      setPartner((partnerData as ChatPartner | null) ?? null);

      if (messagesError) {
        console.error("Failed to load messages:", messagesError);
        setMessages([]);
      } else {
        setMessages(sortMessages((messagesData as ChatMessage[]) ?? []));
      }

      await markConversationAsRead(conversationId, user.id);
      await refreshUnreadCount();

      if (!isActive) return;
      setLoading(false);
    };

    void loadChat();

    return () => {
      isActive = false;
    };
  }, [conversationId, user?.id, refreshUnreadCount]);

  useEffect(() => {
    if (!conversationId || !user?.id) return;

    const channel = subscribeToMessages(conversationId, async (newMessage) => {
      const incoming = newMessage as ChatMessage;
      upsertMessage(incoming);

      if (incoming.sender_id !== user.id) {
        await markConversationAsRead(conversationId, user.id);
        await refreshUnreadCount();
      }
    });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, user?.id, refreshUnreadCount]);

  useEffect(() => {
    if (!conversationId) return;

    const channel = subscribeToMessageUpdates(
      conversationId,
      (updatedMessage) => {
        upsertMessage(updatedMessage as ChatMessage);
      }
    );

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId || !user?.id) return;

    const channel = createTypingChannel(conversationId);
    typingChannelRef.current = channel;

    const updateTypingState = () => {
      const state = channel.presenceState();

      const typingUsers = getTypingUsersFromPresence(
        state as unknown as TypingPresenceState,
        user.id
      );

      setIsOtherUserTyping(typingUsers.length > 0);
    };

    channel
      .on("presence", { event: "sync" }, updateTypingState)
      .on("presence", { event: "join" }, updateTypingState)
      .on("presence", { event: "leave" }, updateTypingState)
      .subscribe(async (status) => {
        console.log(`[Presence][typing:${conversationId}]`, status);

        if (status === "SUBSCRIBED") {
          await trackTypingState(channel, {
            user_id: user.id,
            is_typing: false,
          });
        }
      });

    return () => {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }

      void stopTypingState(channel);
      void supabase.removeChannel(channel);
      typingChannelRef.current = null;
    };
  }, [conversationId, user?.id]);

  useEffect(() => {
    if (!partner?.id || !user?.id) return;

    const channel = createOnlineStatusChannel();
    partnerPresenceChannelRef.current = channel;

    const updateOnlineState = () => {
      const state = channel.presenceState();

      const onlineUsers = getOnlineUsersFromPresence(
        state as unknown as OnlinePresenceState
      );

      setIsPartnerOnline(onlineUsers.includes(partner.id));
    };

    channel
      .on("presence", { event: "sync" }, updateOnlineState)
      .on("presence", { event: "join" }, updateOnlineState)
      .on("presence", { event: "leave" }, updateOnlineState)
      .subscribe(async (status) => {
        console.log("[Presence][online-status]", status);

        if (status === "SUBSCRIBED") {
          await trackOnlineStatus(channel, user.id);
        }
      });

    return () => {
      void untrackOnlineStatus(channel);
      void supabase.removeChannel(channel);
      partnerPresenceChannelRef.current = null;
    };
  }, [partner?.id, user?.id]);

  const handleTyping = async (value: string) => {
    setMessageText(value);

    const channel = typingChannelRef.current;
    if (!channel || !user?.id) return;

    await trackTypingState(channel, {
      user_id: user.id,
      is_typing: value.trim().length > 0,
    });

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = window.setTimeout(async () => {
      await trackTypingState(channel, {
        user_id: user.id,
        is_typing: false,
      });
    }, 900);
  };

  const handleImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image.");
      return;
    }

    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    setSelectedImage(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  };

  const clearSelectedImage = () => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    setSelectedImage(null);
    setImagePreviewUrl(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadSelectedImage = async () => {
    if (!selectedImage || !conversationId || !user?.id) return null;

    const safeName = sanitizeFileName(selectedImage.name);
    const filePath = `${conversationId}/${user.id}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from(CHAT_MEDIA_BUCKET)
      .upload(filePath, selectedImage, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from(CHAT_MEDIA_BUCKET)
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();

    if (!conversationId || !user?.id || !conversation) return;
    if (!messageText.trim() && !selectedImage) return;

    if (messageText.trim() && containsBlockedContent(messageText)) {
      alert(
        "Sharing phone numbers, social media handles, links, emails, or outside contact details is not allowed on this platform."
      );
      return;
    }

    setSending(true);
    setPaymentNotice(null);

    const currentText = messageText.trim();
    const tempId = `temp-${Date.now()}`;

    try {
      let imageUrl: string | undefined;

      if (selectedImage) {
        imageUrl = (await uploadSelectedImage()) ?? undefined;
      }

      const receiverId =
        conversation.user1_id === user.id
          ? conversation.user2_id
          : conversation.user1_id;

      const messageType: "text" | "image" = imageUrl ? "image" : "text";

      const optimisticMessage = {
        id: tempId,
        conversation_id: conversationId,
        sender_id: user.id,
        receiver_id: receiverId,
        content: currentText || "",
        message_text: currentText || null,
        image_url: imageUrl ?? null,
        created_at: new Date().toISOString(),
        read: false,
        type: messageType,
      } as ChatMessage;

      upsertMessage(optimisticMessage);

      setMessageText("");
      clearSelectedImage();

      const { data, error } = await sendCreditMessage({
        conversationId,
        senderId: user.id,
        receiverId,
        content: currentText,
        imageUrl: imageUrl ?? null,
        messageType,
      });

      if (error) {
        console.error("Failed to send credit message:", error);
        removeTempMessageById(tempId);

        const errorText = String(error?.message ?? "").toLowerCase();

        const isInsufficientCredits =
          errorText.includes("insufficient") ||
          errorText.includes("not enough") ||
          errorText.includes("credit");

        if (isInsufficientCredits) {
          openUpsell("failed");
          return;
        }

        alert("Failed to send message. Please try again.");
        return;
      }

      if (data) {
        replaceTempMessage(tempId, data as ChatMessage);
      }

      if (typingChannelRef.current) {
        await trackTypingState(typingChannelRef.current, {
          user_id: user.id,
          is_typing: false,
        });
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      removeTempMessageById(tempId);
      alert("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-rose-500" />
      </div>
    );
  }

  if (!conversation || !user?.id) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <button
          type="button"
          onClick={() => navigate("/notifications")}
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-rose-500"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to notifications
        </button>

        <div className="rounded-2xl bg-white p-8 text-center shadow">
          <h2 className="text-xl font-semibold text-gray-900">
            Conversation not found
          </h2>
          <p className="mt-2 text-gray-500">
            This conversation may not exist or you may not have access to it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-100px)] max-w-4xl flex-col rounded-2xl bg-white shadow">
      <div className="flex items-center gap-3 border-b px-4 py-4 sm:px-6">
        <button
          type="button"
          onClick={() => navigate("/notifications")}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100"
        >
          <ArrowLeft className="h-5 w-5 text-gray-700" />
        </button>

        <div className="relative">
          <img
            src={getAvatarUrl(partner?.avatar_url ?? "")}
            alt={partner?.full_name ?? "User avatar"}
            className="h-12 w-12 rounded-full object-cover"
          />
          {isPartnerOnline ? (
            <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-green-500" />
          ) : null}

          {partnerIsVerified ? (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white ring-2 ring-white">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </span>
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1">
            <h1 className="truncate text-lg font-semibold text-gray-900">
              {partner?.full_name ?? "Unknown User"}
            </h1>

            {partnerIsVerified ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Verified
              </span>
            ) : null}
          </div>

          <p className="text-sm text-gray-500">
            {isPartnerOnline
              ? "Online now"
              : formatLastSeen(partner?.last_seen_at ?? null)}
          </p>
        </div>

        {verifyingPayment ? (
          <div className="hidden items-center gap-2 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-600 sm:inline-flex">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Verifying payment
          </div>
        ) : null}
      </div>

      {paymentNotice ? (
        <div
          className={`border-b px-4 py-3 text-sm sm:px-6 ${
            paymentNotice.type === "success"
              ? "border-green-100 bg-green-50 text-green-700"
              : paymentNotice.type === "error"
              ? "border-red-100 bg-red-50 text-red-700"
              : "border-rose-100 bg-rose-50 text-rose-700"
          }`}
        >
          <div className="flex items-start gap-2">
            {paymentNotice.type === "success" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : paymentNotice.type === "info" ? (
              <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
            ) : (
              <X className="mt-0.5 h-4 w-4 shrink-0" />
            )}

            <p className="flex-1">{paymentNotice.message}</p>

            <button
              type="button"
              onClick={() => setPaymentNotice(null)}
              className="rounded-full p-1 hover:bg-black/5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto bg-rose-50/30 px-4 py-4 sm:px-6">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="rounded-2xl bg-white px-6 py-4 text-center shadow-sm">
              <h2 className="text-base font-semibold text-gray-900">
                No messages yet
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Say hello and start the conversation 💕
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => {
              const isMine = msg.sender_id === user.id;
              const isImageMessage = msg.type === "image" || !!msg.image_url;
              const isTempMessage = String(msg.id).startsWith("temp-");

              return (
                <div
                  key={msg.id}
                  className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[82%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[70%] ${
                      isMine
                        ? "rounded-br-md bg-rose-500 text-white"
                        : "rounded-bl-md bg-white text-gray-900"
                    } ${isTempMessage ? "opacity-80" : ""}`}
                  >
                    {isImageMessage && msg.image_url ? (
                      <div className="mb-2 overflow-hidden rounded-xl">
                        <img
                          src={msg.image_url}
                          alt="Shared media"
                          className="max-h-80 w-full rounded-xl object-cover"
                        />
                      </div>
                    ) : null}

                    {msg.content ? (
                      <p className="whitespace-pre-wrap break-words text-sm">
                        {msg.content}
                      </p>
                    ) : null}

                    <div
                      className={`mt-1 flex items-center gap-2 text-[11px] ${
                        isMine ? "justify-end text-rose-100" : "text-gray-400"
                      }`}
                    >
                      <span>
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>

                      {isMine ? (
                        <span className={msg.read ? "font-medium" : ""}>
                          {isTempMessage
                            ? "Sending..."
                            : getMessageStatusLabel(msg)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="min-h-[20px] px-4 pb-2 sm:px-6">
        {isOtherUserTyping ? (
          <p className="text-sm italic text-gray-500">
            {partner?.full_name ?? "Someone"} is typing...
          </p>
        ) : null}
      </div>

      {imagePreviewUrl ? (
        <div className="border-t bg-white px-4 py-3 sm:px-6">
          <div className="relative inline-block">
            <img
              src={imagePreviewUrl}
              alt="Preview"
              className="max-h-40 rounded-xl object-cover shadow"
            />
            <button
              type="button"
              onClick={clearSelectedImage}
              className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/75"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      {showUpsell ? (
        <div className="border-t bg-white px-4 py-4 sm:px-6">
          <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  You need more credits 💳
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  {upsellReason === "failed"
                    ? "You don’t have enough credits to send this message. Buy credits and continue chatting."
                    : "You’re running low on credits. Top up now so your conversation does not stop."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeUpsell}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-gray-500 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {CREDIT_BUNDLES.map((bundle) => (
                <button
                  key={bundle.credits}
                  type="button"
                  onClick={() => void handleBuyCredits(bundle)}
                  disabled={startingPayment}
                  className={`relative rounded-2xl p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    bundle.bestValue
                      ? "scale-[1.02] bg-rose-500 text-white shadow-lg hover:bg-rose-600"
                      : "border border-gray-200 bg-white text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  {bundle.bestValue ? (
                    <span className="absolute -top-2 right-3 rounded-full bg-yellow-300 px-2 py-0.5 text-[10px] font-bold text-gray-900">
                      BEST VALUE
                    </span>
                  ) : null}

                  <p className="text-lg font-bold">{bundle.credits} credits</p>
                  <p
                    className={`mt-1 text-sm ${
                      bundle.bestValue ? "text-rose-50" : "text-gray-500"
                    }`}
                  >
                    GHS {bundle.price}
                  </p>
                  <p
                    className={`mt-2 text-xs ${
                      bundle.bestValue ? "text-rose-50" : "text-gray-400"
                    }`}
                  >
                    {bundle.description}
                  </p>
                </button>
              ))}
            </div>

            <p className="mt-3 text-xs text-gray-500">
              Text messages cost 1 credit. Image messages cost 3 credits.
            </p>
          </div>
        </div>
      ) : null}

      <form
        onSubmit={handleSendMessage}
        className="border-t bg-white px-4 py-4 sm:px-6"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageSelect}
        />

        <div className="flex items-end gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending || verifyingPayment}
            className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ImagePlus className="h-5 w-5" />
          </button>

          <textarea
            value={messageText}
            onChange={(e) => void handleTyping(e.target.value)}
            placeholder="Type your message..."
            rows={1}
            disabled={verifyingPayment}
            className="max-h-32 min-h-[48px] flex-1 resize-none rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-rose-400 disabled:cursor-not-allowed disabled:bg-gray-50"
          />

          <button
            type="submit"
            disabled={!canSend || verifyingPayment}
            className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-rose-500 text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>

        <p className="mt-2 text-xs text-gray-500">
          Text messages cost 1 credit. Image messages cost 3 credits.
        </p>
      </form>
    </div>
  );
};