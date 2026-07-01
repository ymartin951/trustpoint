import { createClient } from "@supabase/supabase-js";

type MessageRecord = {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  content: string | null;
  image_url: string | null;
  created_at: string;
};

type WebhookPayload = {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: MessageRecord;
};

type SenderRow = {
  full_name: string | null;
};

type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const APP_BASE_URL = Deno.env.get("APP_BASE_URL")!;

Deno.serve(async (req) => {
  try {
    const payload: WebhookPayload = await req.json();

    if (payload.type !== "INSERT" || payload.table !== "messages") {
      return new Response("Skipped", { status: 200 });
    }

    const message = payload.record;

    if (!message.receiver_id) {
      return new Response("No receiver", { status: 200 });
    }

    // 🔹 Get sender name
    const { data: sender } = await supabase
      .from("users")
      .select("full_name")
      .eq("id", message.sender_id)
      .single<SenderRow>();

    const senderName = sender?.full_name || "Someone";

    // 🔹 Get subscriptions
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", message.receiver_id)
      .returns<PushSubscriptionRow[]>();

    if (!subs || subs.length === 0) {
      return new Response("No subscriptions", { status: 200 });
    }

    const body = message.image_url
      ? "📷 Sent you an image"
      : message.content || "New message";

    const notification = JSON.stringify({
      title: senderName,
      body,
      data: {
        url: `${APP_BASE_URL}/messages/${message.conversation_id}`,
      },
    });

    // 🚀 SEND PUSH (basic version without encryption)
    for (const sub of subs) {
      try {
        await fetch(sub.endpoint, {
          method: "POST",
          headers: {
            "TTL": "60",
            "Content-Type": "application/json",
          },
          body: notification,
        });
      } catch (err) {
        console.error("Push error:", err);
      }
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response("Error", { status: 500 });
  }
});