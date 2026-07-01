import { supabase } from "../lib/supabase";
import type { Database } from "../lib/database.types";

type MessageRow = Database["public"]["Tables"]["messages"]["Row"];
type CreditTransaction =
  Database["public"]["Tables"]["credit_transactions"]["Row"];

export const getCreditBalance = async (userId: string) => {
  const { data, error } = await supabase
    .from("credit_wallets")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle();

  return {
    balance: data?.balance ?? 0,
    error,
  };
};

export const getCreditTransactions = async (userId: string) => {
  const { data, error } = await supabase
    .from("credit_transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return {
    data: (data ?? []) as CreditTransaction[],
    error,
  };
};

export const sendCreditMessage = async ({
  conversationId,
  senderId,
  receiverId,
  content,
  imageUrl = null,
  messageType = "text",
}: {
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  imageUrl?: string | null;
  messageType?: "text" | "image";
}) => {
  const { data, error } = await supabase.rpc("send_credit_message", {
    p_conversation_id: conversationId,
    p_sender_id: senderId,
    p_receiver_id: receiverId,
    p_content: content,
    p_image_url: imageUrl,
    p_message_type: messageType,
  });

  return {
    data: data as MessageRow | null,
    error,
  };
};


export const initializeCreditPayment = async (packageId: string) => {
  const { data, error } = await supabase.functions.invoke(
    "initialize-credit-payment",
    {
      body: { packageId },
    }
  );

  return {
    authorizationUrl: data?.authorization_url as string | undefined,
    reference: data?.reference as string | undefined,
    error,
  };
};

export const verifyCreditPayment = async (reference: string) => {
  const { data, error } = await supabase.functions.invoke(
    "verify-credit-payment",
    {
      body: { reference },
    }
  );

  return {
    data,
    error,
  };
};