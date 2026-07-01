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
    return new Response("ok", { headers: corsHeaders });
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
    const reference = String(body.reference ?? "").trim();

    if (!reference) {
      return jsonResponse({ error: "Missing payment reference" }, 400);
    }

    const { data: existingTransaction, error: existingError } = await supabase
      .from("credit_transactions")
      .select("id, payment_reference, subscription_expires_at")
      .eq("payment_reference", reference)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (existingTransaction) {
      const { data: subStatus } = await supabase.rpc("get_user_subscription", {
        p_user_id: user.id,
      });

      return jsonResponse({
        ok: true,
        already_processed: true,
        message: "Premium payment already verified.",
        reference,
        subscription: subStatus,
      });
    }

    const verifyResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const verifyResult = await verifyResponse.json();

    if (!verifyResponse.ok || !verifyResult.status) {
      console.error("Paystack premium verification failed:", verifyResult);

      return jsonResponse(
        {
          error: verifyResult.message || "Premium payment verification failed",
          reference,
        },
        400
      );
    }

    const payment = verifyResult.data;

    if (!payment || payment.status !== "success") {
      return jsonResponse(
        {
          error: "Payment was not successful",
          status: payment?.status ?? "unknown",
          reference,
        },
        400
      );
    }

    const metadata = payment.metadata || {};

    const paymentUserId = String(metadata.user_id || "");
    const planType = String(metadata.plan_type || "");
    const months = Number(metadata.months || 1);
    const packageLabel = String(
      metadata.package_label || "TrustPoint Premium Monthly"
    );

    if (paymentUserId !== user.id) {
      return jsonResponse(
        {
          error: "This payment does not belong to the logged-in user",
          reference,
        },
        403
      );
    }

    if (planType !== "premium") {
      return jsonResponse(
        {
          error: "Invalid premium plan metadata",
          reference,
        },
        400
      );
    }

    if (!months || months < 1) {
      return jsonResponse(
        {
          error: "Invalid subscription duration",
          reference,
        },
        400
      );
    }

    const amountPaid = Number(payment.amount || 0) / 100;
    const currency = payment.currency || "GHS";

    const { data: activationResult, error: activationError } =
      await supabase.rpc("activate_premium_subscription", {
        p_user_id: user.id,
        p_months: months,
      });

    if (activationError) {
      throw activationError;
    }

    const activation = activationResult as {
      success?: boolean;
      expires_at?: string;
      message?: string;
    };

    if (!activation?.success) {
      return jsonResponse(
        {
          error: activation?.message || "Failed to activate premium",
          reference,
        },
        400
      );
    }

    const { error: transactionInsertError } = await supabase
      .from("credit_transactions")
      .insert({
        user_id: user.id,
        amount: 0,
        type: "premium_subscription",
        description: `${packageLabel} - Paystack payment ${reference}`,
        payment_reference: reference,
        amount_paid: amountPaid,
        currency,
        payment_provider: "paystack",
        subscription_plan: "premium",
        subscription_months: months,
        subscription_expires_at: activation.expires_at ?? null,
      });

    if (transactionInsertError) {
      const isDuplicate =
        transactionInsertError.code === "23505" ||
        String(transactionInsertError.message ?? "")
          .toLowerCase()
          .includes("duplicate");

      if (!isDuplicate) {
        throw transactionInsertError;
      }
    }

    const { data: subscription } = await supabase.rpc("get_user_subscription", {
      p_user_id: user.id,
    });

    return jsonResponse({
      ok: true,
      already_processed: false,
      message: "Premium activated successfully.",
      reference,
      subscription,
    });
  } catch (error) {
    console.error("verify-premium-payment error:", error);

    return jsonResponse(
      {
        error: "Unexpected server error",
        details: String(error?.message ?? error),
      },
      500
    );
  }
});