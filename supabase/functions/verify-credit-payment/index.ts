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

    /**
     * STEP 1:
     * Check if this payment has already been processed.
     * This prevents duplicate crediting.
     */
    const { data: existingTransaction, error: existingError } = await supabase
      .from("credit_transactions")
      .select("id, amount, payment_reference")
      .eq("payment_reference", reference)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (existingTransaction) {
      const { data: existingWallet } = await supabase
        .from("credit_wallets")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle();

      return jsonResponse({
        ok: true,
        already_processed: true,
        message: "Payment already verified.",
        credits_added: 0,
        balance: existingWallet?.balance ?? 0,
        reference,
      });
    }

    /**
     * STEP 2:
     * Verify payment directly from Paystack.
     */
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
      console.error("Paystack verification failed:", verifyResult);

      return jsonResponse(
        {
          error: verifyResult.message || "Payment verification failed",
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

    /**
     * STEP 3:
     * Validate payment metadata.
     */
    const metadata = payment.metadata || {};
    const credits = Number(metadata.credits || 0);
    const paymentUserId = String(metadata.user_id || "");

    if (!credits || credits <= 0) {
      return jsonResponse(
        {
          error: "Invalid credit amount in payment metadata",
          reference,
        },
        400
      );
    }

    if (paymentUserId !== user.id) {
      return jsonResponse(
        {
          error: "This payment does not belong to the logged-in user",
          reference,
        },
        403
      );
    }

    const amountPaid = Number(payment.amount || 0) / 100;
    const currency = payment.currency || "GHS";
    const packageId = String(metadata.package_id ?? "");
    const packageLabel = String(metadata.package_label ?? "Credit Purchase");

    /**
     * STEP 4:
     * Get wallet.
     */
    const { data: wallet, error: walletFetchError } = await supabase
      .from("credit_wallets")
      .select("id, balance")
      .eq("user_id", user.id)
      .maybeSingle();

    if (walletFetchError) {
      throw walletFetchError;
    }

    let newBalance = credits;

    /**
     * STEP 5:
     * Credit wallet.
     */
    if (!wallet) {
      const { error: walletInsertError } = await supabase
        .from("credit_wallets")
        .insert({
          user_id: user.id,
          balance: credits,
          updated_at: new Date().toISOString(),
        });

      if (walletInsertError) {
        throw walletInsertError;
      }
    } else {
      newBalance = Number(wallet.balance || 0) + credits;

      const { error: walletUpdateError } = await supabase
        .from("credit_wallets")
        .update({
          balance: newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (walletUpdateError) {
        throw walletUpdateError;
      }
    }

    /**
     * STEP 6:
     * Record transaction.
     */
    const { error: transactionInsertError } = await supabase
      .from("credit_transactions")
      .insert({
        user_id: user.id,
        amount: credits,
        type: "purchase",
        description: `${packageLabel} - Paystack payment ${reference}`,
        payment_reference: reference,
        amount_paid: amountPaid,
        currency,
        payment_provider: "paystack",
      });

    if (transactionInsertError) {
      console.error("Transaction insert failed:", transactionInsertError);

      const isDuplicate =
        transactionInsertError.code === "23505" ||
        String(transactionInsertError.message ?? "")
          .toLowerCase()
          .includes("duplicate");

      if (!isDuplicate) {
        throw transactionInsertError;
      }

      const { data: updatedWallet } = await supabase
        .from("credit_wallets")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle();

      return jsonResponse({
        ok: true,
        already_processed: true,
        message: "Payment was already processed.",
        credits_added: 0,
        balance: updatedWallet?.balance ?? newBalance,
        reference,
      });
    }

    /**
     * STEP 7:
     * Return final wallet balance.
     */
    const { data: updatedWallet, error: updatedWalletError } = await supabase
      .from("credit_wallets")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle();

    if (updatedWalletError) {
      throw updatedWalletError;
    }

    return jsonResponse({
      ok: true,
      already_processed: false,
      message: "Payment verified and credits added successfully.",
      credits_added: credits,
      balance: updatedWallet?.balance ?? newBalance,
      reference,
      package: {
        id: packageId,
        label: packageLabel,
        amount_paid: amountPaid,
        currency,
      },
    });
  } catch (error) {
    console.error("verify-credit-payment error:", error);

    return jsonResponse(
      {
        error: "Unexpected server error",
        details: String(error?.message ?? error),
      },
      500
    );
  }
});