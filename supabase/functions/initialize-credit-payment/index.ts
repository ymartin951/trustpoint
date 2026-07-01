import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CREDIT_PACKAGES: Record<
  string,
  { credits: number; amountGhs: number; label: string }
> = {
  "50": {
    credits: 50,
    amountGhs: 5,
    label: "Starter",
  },
  "120": {
    credits: 120,
    amountGhs: 10,
    label: "Bonus",
  },
  "300": {
    credits: 300,
    amountGhs: 20,
    label: "Best Value",
  },
  "800": {
    credits: 800,
    amountGhs: 50,
    label: "Premium",
  },
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

    const body = await req.json();

    /**
     * Supports both:
     * 1. Existing credit page flow:
     *    { packageId: "300" }
     *
     * 2. New chat upsell flow:
     *    { credits: 300, returnUrl: "http://localhost:5173/chat/..." }
     */
    const packageId = String(body.packageId ?? body.credits ?? "");
    const selectedPackage = CREDIT_PACKAGES[packageId];

    if (!selectedPackage) {
      return jsonResponse({ error: "Invalid credit package" }, 400);
    }

    const origin = req.headers.get("origin") ?? "";
    const rawReturnUrl = String(body.returnUrl ?? "");

    const fallbackReturnUrl = origin ? `${origin}/credits` : undefined;

    const callbackUrl =
      rawReturnUrl.startsWith("http://") || rawReturnUrl.startsWith("https://")
        ? rawReturnUrl
        : fallbackReturnUrl;

    if (!callbackUrl) {
      return jsonResponse({ error: "Missing callback URL" }, 400);
    }

    const reference = `trustpoint_${user.id}_${Date.now()}`;
    const amountPesewas = selectedPackage.amountGhs * 100;

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
            credits: selectedPackage.credits,
            package_id: packageId,
            package_label: selectedPackage.label,
            amount_ghs: selectedPackage.amountGhs,
            source: body.source ?? "credits_page",
            return_url: callbackUrl,
          },
          channels: ["mobile_money", "card"],
        }),
      }
    );

    const result = await response.json();

    if (!response.ok || !result.status) {
      console.error("Paystack initialize error:", result);

      return jsonResponse(
        {
          error: result.message || "Failed to initialize payment",
        },
        400
      );
    }

    return jsonResponse({
      authorization_url: result.data.authorization_url,
      authorizationUrl: result.data.authorization_url,
      access_code: result.data.access_code,
      reference,
      package: {
        id: packageId,
        credits: selectedPackage.credits,
        amountGhs: selectedPackage.amountGhs,
        label: selectedPackage.label,
      },
    });
  } catch (error) {
    console.error("initialize-credit-payment error:", error);

    return jsonResponse({ error: "Unexpected server error" }, 500);
  }
});