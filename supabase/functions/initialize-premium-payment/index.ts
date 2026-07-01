import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const PREMIUM_PLAN = {
  planType: "premium",
  months: 1,
  amountGhs: 60,
  label: "TrustPoint Premium Monthly",
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (body: Record<string, unknown>, status = 200) => {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return jsonResponse({ error: "Missing authorization" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const body = await req.json().catch(() => ({}));

    const origin = req.headers.get("origin") ?? "";
    const rawReturnUrl = String(body.returnUrl ?? "");

    const fallbackReturnUrl = origin ? `${origin}/premium` : undefined;

    const callbackUrl =
      rawReturnUrl.startsWith("http://") || rawReturnUrl.startsWith("https://")
        ? rawReturnUrl
        : fallbackReturnUrl;

    if (!callbackUrl) {
      return jsonResponse({ error: "Missing callback URL" }, 400);
    }

    const reference = `trustpoint_premium_${user.id}_${Date.now()}`;
    const amountPesewas = PREMIUM_PLAN.amountGhs * 100;

    const response = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user.email,
          amount: amountPesewas,
          currency: "GHS",
          reference,
          callback_url: callbackUrl,
          metadata: {
            user_id: user.id,
            plan_type: PREMIUM_PLAN.planType,
            months: PREMIUM_PLAN.months,
            amount_ghs: PREMIUM_PLAN.amountGhs,
            package_label: PREMIUM_PLAN.label,
            source: body.source ?? "premium_page",
            return_url: callbackUrl,
          },
          channels: ["mobile_money", "card"],
        }),
      }
    );

    const result = await response.json();

    if (!response.ok || !result.status) {
      console.error("Paystack initialize premium error:", result);

      return jsonResponse(
        {
          error: result.message || "Failed to initialize premium payment",
        },
        400
      );
    }

    return jsonResponse({
      authorization_url: result.data.authorization_url,
      authorizationUrl: result.data.authorization_url,
      access_code: result.data.access_code,
      reference,
      plan: {
        type: PREMIUM_PLAN.planType,
        months: PREMIUM_PLAN.months,
        amountGhs: PREMIUM_PLAN.amountGhs,
        label: PREMIUM_PLAN.label,
      },
    });
  } catch (error) {
    console.error("initialize-premium-payment error:", error);

    return jsonResponse(
      {
        error: "Unexpected server error",
        details: String(error?.message ?? error),
      },
      500
    );
  }
});