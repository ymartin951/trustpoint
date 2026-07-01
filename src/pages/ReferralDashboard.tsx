import { useEffect, useMemo, useState } from "react";
import {
  Copy,
  Gift,
  Users,
  Coins,
  Share2,
  RefreshCw,
  Wallet,
  AlertCircle,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

type ReferralRow = {
  id: string;
  referrer_id: string;
  referred_user_id: string;
  reward_credits: number;
  status: string;
  created_at: string;
};

type CreditWalletRow = {
  user_id: string;
  balance: number;
  updated_at: string;
};

export default function ReferralDashboard() {
  const { user, profile, refreshProfile } = useAuth();

  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [wallet, setWallet] = useState<CreditWalletRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [referralCode, setReferralCode] = useState<string | null>(
    profile?.referral_code ?? null
  );

  const referralLink = useMemo(() => {
    if (!referralCode) return "";
    return `${window.location.origin}/signup?ref=${referralCode}`;
  }, [referralCode]);

  const totalCreditsEarned = useMemo(() => {
    return referrals.reduce(
      (sum, item) => sum + Number(item.reward_credits ?? 0),
      0
    );
  }, [referrals]);

  const successfulReferrals = useMemo(() => {
    return referrals.filter((item) => {
      const status = item.status?.toLowerCase();

      return (
        status === "rewarded" ||
        status === "active" ||
        status === "completed"
      );
    }).length;
  }, [referrals]);

  const loadReferralData = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");
      setWarning("");

      let code = profile?.referral_code ?? referralCode ?? null;

      if (!code) {
        const { data, error: codeError } = await supabase.rpc(
          "ensure_user_referral_code",
          {
            p_user_id: user.id,
          }
        );

        if (codeError) {
          console.error("Failed to generate referral code:", codeError);
          setError(codeError.message || "Failed to generate referral code.");
        } else {
          code = data;
          setReferralCode(data);
          await refreshProfile();
        }
      } else {
        setReferralCode(code);
      }

      const referralsQuery = supabase
        .from("referrals")
        .select("*")
        .eq("referrer_id", user.id)
        .order("created_at", { ascending: false });

      const walletQuery = supabase
        .from("credit_wallets")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      const [referralsResult, walletResult] = await Promise.all([
        referralsQuery,
        walletQuery,
      ]);

      if (referralsResult.error) {
        console.error("Failed to load referrals:", referralsResult.error);
        setReferrals([]);
        setError(
          referralsResult.error.message || "Failed to load referral history."
        );
      } else {
        const rows = (referralsResult.data ?? []) as unknown as ReferralRow[];

        console.log("Referral rows loaded:", rows);

        setReferrals(rows);
      }

      if (walletResult.error) {
        console.error("Failed to load credit wallet:", walletResult.error);
        setWallet(null);
        setError(walletResult.error.message || "Failed to load credit wallet.");
      } else {
        const walletRow = (walletResult.data ?? null) as CreditWalletRow | null;

        console.log("Wallet loaded:", walletRow);

        setWallet(walletRow);

        if (
          walletRow &&
          Number(walletRow.balance ?? 0) > 0 &&
          !referralsResult.error &&
          (referralsResult.data ?? []).length === 0
        ) {
          setWarning(
            "Your wallet balance is showing credits, but referral records are not visible. This usually means the referrals table RLS SELECT policy is missing or not allowing this user to read referral rows."
          );
        }
      }
    } catch (err: any) {
      console.error("Referral dashboard error:", err);
      setError(err.message || "Something went wrong while loading referrals.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReferralData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, profile?.referral_code]);

  const showCopied = () => {
    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  const copyReferralLink = async () => {
    if (!referralLink) return;

    try {
      await navigator.clipboard.writeText(referralLink);
      showCopied();
    } catch (err) {
      console.error("Failed to copy referral link:", err);
      setError("Failed to copy referral link.");
    }
  };

  const copyReferralCode = async () => {
    if (!referralCode) return;

    try {
      await navigator.clipboard.writeText(referralCode);
      showCopied();
    } catch (err) {
      console.error("Failed to copy referral code:", err);
      setError("Failed to copy referral code.");
    }
  };

  const shareReferral = async () => {
    if (!referralLink) return;

    const message = `Join me on TrustPoint Dating and use my referral code ${referralCode}: ${referralLink}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Join TrustPoint Dating",
          text: message,
          url: referralLink,
        });
        return;
      }

      await navigator.clipboard.writeText(message);
      showCopied();
    } catch (err) {
      console.error("Failed to share referral:", err);
      setError("Failed to share referral invite.");
    }
  };

  if (!user) {
    return (
      <div className="p-10 text-center text-gray-500">
        Please sign in to view your referral dashboard.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 pb-24">
      <div className="mb-8 rounded-3xl bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-500 p-8 text-white shadow-lg">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-sm">
              <Gift className="h-4 w-4" />
              Referral Rewards
            </div>

            <h1 className="text-3xl font-bold">
              Invite Friends. Earn Credits.
            </h1>

            <p className="mt-2 max-w-2xl text-white/90">
              Share your referral link with friends. When someone joins with
              your code, your referral history and credits will appear here.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => void loadReferralData()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/20 px-5 py-3 font-semibold text-white ring-1 ring-white/30 transition hover:bg-white/30"
            >
              <RefreshCw className="h-5 w-5" />
              Refresh
            </button>

            <button
              type="button"
              onClick={shareReferral}
              disabled={!referralLink}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 font-semibold text-rose-600 shadow disabled:opacity-60"
            >
              <Share2 className="h-5 w-5" />
              Share Invite
            </button>
          </div>
        </div>
      </div>

      {copied ? (
        <div className="mb-6 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
          Copied successfully.
        </div>
      ) : null}

      {error ? (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Referral dashboard issue</p>
            <p>{error}</p>
          </div>
        </div>
      ) : null}

      {warning ? (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Referral records not visible</p>
            <p>{warning}</p>
          </div>
        </div>
      ) : null}

      <div className="mb-8 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
            <Users className="h-5 w-5" />
          </div>

          <p className="text-sm text-gray-500">Total Referrals</p>

          <h2 className="mt-1 text-3xl font-bold text-gray-900">
            {loading ? "..." : referrals.length}
          </h2>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-green-50 text-green-600">
            <Gift className="h-5 w-5" />
          </div>

          <p className="text-sm text-gray-500">Rewarded Referrals</p>

          <h2 className="mt-1 text-3xl font-bold text-gray-900">
            {loading ? "..." : successfulReferrals}
          </h2>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Coins className="h-5 w-5" />
          </div>

          <p className="text-sm text-gray-500">Referral Credits Earned</p>

          <h2 className="mt-1 text-3xl font-bold text-gray-900">
            {loading ? "..." : totalCreditsEarned}
          </h2>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Wallet className="h-5 w-5" />
          </div>

          <p className="text-sm text-gray-500">Current Wallet Balance</p>

          <h2 className="mt-1 text-3xl font-bold text-gray-900">
            {loading ? "..." : wallet?.balance ?? 0}
          </h2>
        </div>
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            Your Referral Code
          </h3>

          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-5 text-center">
            <p className="text-sm text-gray-500">Code</p>

            <h2 className="mt-2 break-all text-3xl font-bold tracking-widest text-gray-900">
              {referralCode || "Loading..."}
            </h2>

            <button
              type="button"
              onClick={copyReferralCode}
              disabled={!referralCode}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              <Copy className="h-4 w-4" />
              Copy Code
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            Your Invite Link
          </h3>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={referralLink || "Generating referral link..."}
              readOnly
              className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700"
            />

            <button
              type="button"
              onClick={copyReferralLink}
              disabled={!referralLink}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-500 px-5 py-3 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-60"
            >
              <Copy className="h-4 w-4" />
              Copy Link
            </button>
          </div>

          <p className="mt-4 text-sm leading-6 text-gray-500">
            Share this link on WhatsApp, Facebook, TikTok, or with friends
            directly. When they register with your code, your referral record
            and reward credits should appear here.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Referral History
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              These are users who registered with your referral code.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadReferralData()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="py-10 text-center text-gray-500">
            Loading referrals...
          </div>
        ) : referrals.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center">
            <p className="font-medium text-gray-800">No referrals showing</p>

            <p className="mt-2 text-sm text-gray-500">
              Your wallet can update even when referral rows are hidden. If
              your wallet balance increased but this section is empty, check the
              referrals RLS SELECT policy.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-100">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Reward</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {referrals.map((item, index) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">
                          Referred user #{index + 1}
                        </p>

                        <p className="text-xs text-gray-500">
                          {item.referred_user_id}
                        </p>
                      </div>
                    </td>

                    <td className="px-4 py-3 font-semibold text-green-600">
                      +{item.reward_credits} credits
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium capitalize ${
                          item.status?.toLowerCase() === "rewarded" ||
                          item.status?.toLowerCase() === "active" ||
                          item.status?.toLowerCase() === "completed"
                            ? "bg-green-50 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-gray-500">
                      {new Date(item.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}