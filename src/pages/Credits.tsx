import { useEffect, useState } from "react";
import { Coins, MessageCircle, Image, History } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  getCreditBalance,
  getCreditTransactions,
  initializeCreditPayment,
  verifyCreditPayment,
} from "../services/creditService";
import type { Database } from "../lib/database.types";

type CreditTransaction =
  Database["public"]["Tables"]["credit_transactions"]["Row"];

  // Credit packages shown to users.
// packageId must match the package IDs inside the Paystack Edge Function.
const CREDIT_PACKAGES = [
  {
    packageId: "50",
    credits: 50,
    price: "GHS 5",
    label: "Starter",
    badge: null,
  },
  {
    packageId: "120",
    credits: 120,
    price: "GHS 10",
    label: "Bonus",
    badge: "20 bonus credits",
  },
  {
    packageId: "300",
    credits: 300,
    price: "GHS 20",
    label: "Best Value",
    badge: "Best value",
  },
  {
    packageId: "800",
    credits: 800,
    price: "GHS 50",
    label: "Premium",
    badge: "For serious users",
  },
];

export const Credits = () => {
  const { user } = useAuth();
  const toast = useToast();

  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingPackage, setPayingPackage] = useState<number | null>(null);

  // LOAD DATA
  useEffect(() => {
    let isMounted = true;

    const loadCredits = async () => {
      if (!user?.id) {
        if (isMounted) {
          setBalance(0);
          setTransactions([]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);

      const [balanceResult, transactionsResult] = await Promise.all([
        getCreditBalance(user.id),
        getCreditTransactions(user.id),
      ]);

      if (!isMounted) return;

      if (balanceResult.error) {
        console.error(balanceResult.error);
        toast.error("Failed to load balance");
        setBalance(0);
      } else {
        setBalance(balanceResult.balance);
      }

      if (transactionsResult.error) {
        console.error(transactionsResult.error);
        toast.error("Failed to load transactions");
        setTransactions([]);
      } else {
        setTransactions(transactionsResult.data);
      }

      setLoading(false);
    };

    void loadCredits();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  // VERIFY PAYMENT
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("reference");

    if (!reference) return;

    const verifyPayment = async () => {
      const { data, error } = await verifyCreditPayment(reference);

      if (error) {
        console.error(error);
        toast.error("Payment verification failed");
        return;
      }

      if (data?.ok) {
        toast.success("Payment successful! Credits added.");

        // reload clean URL
        window.location.href = "/credits";
      }
    };

    void verifyPayment();
  }, []);

  // BUY CREDITS
  const handleBuyCredits = async (credits: number) => {
    try {
      setPayingPackage(credits);

      const { authorizationUrl, error } = await initializeCreditPayment(
        String(credits)
      );

      if (error || !authorizationUrl) {
        console.error(error);
        toast.error("Failed to start payment");
        return;
      }

      window.location.href = authorizationUrl;
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong");
    } finally {
      setPayingPackage(null);
    }
  };

  // LOADING
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-rose-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Credits Wallet</h1>
        <p className="mt-1 text-sm text-gray-500">
          Use credits to send messages and keep communication on TrustPoint.
        </p>
      </div>

      {/* BALANCE */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 p-6 text-white shadow">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/20 p-3">
              <Coins className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-white/80">Current Balance</p>
              <h2 className="text-3xl font-bold">{balance}</h2>
            </div>
          </div>

          <p className="mt-4 text-sm text-white/80">
            Credits available for messaging
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-rose-50 p-3 text-rose-500">
              <MessageCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Text Message</p>
              <h2 className="text-2xl font-bold text-gray-900">1 credit</h2>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-rose-50 p-3 text-rose-500">
              <Image className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Image Message</p>
              <h2 className="text-2xl font-bold text-gray-900">3 credits</h2>
            </div>
          </div>
        </div>
      </div>

      {/* BUY */}
      <div className="mt-8 rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Buy Credits</h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CREDIT_PACKAGES.map((pkg) => (
            <button
  key={pkg.packageId}
  onClick={() => void handleBuyCredits(Number(pkg.packageId))}
  disabled={payingPackage !== null}
  className={`relative rounded-2xl border p-5 text-left transition hover:bg-rose-50 ${
    pkg.badge === "Best value" ? "border-rose-400 bg-rose-50" : ""
  }`}
>
  {pkg.badge ? (
    <span className="absolute right-3 top-3 rounded-full bg-rose-500 px-2 py-1 text-xs font-semibold text-white">
      {pkg.badge}
    </span>
  ) : null}

  <p className="text-sm font-medium text-gray-500">{pkg.label}</p>

  <h3 className="mt-2 text-2xl font-bold text-gray-900">
    {pkg.credits} credits
  </h3>

  <p className="mt-1 text-sm text-gray-500">{pkg.price}</p>

  <p className="mt-4 text-sm font-medium text-rose-600">
    {payingPackage === Number(pkg.packageId)
      ? "Opening payment..."
      : "Buy package"}
  </p>
</button>
          ))}
        </div>
      </div>

      {/* HISTORY */}
      <div className="mt-8 rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Transaction History</h2>

        {transactions.length === 0 ? (
          <p className="text-sm text-gray-500">No transactions yet</p>
        ) : (
          <div className="space-y-3">
            {transactions.map((t) => (
              <div
                key={t.id}
                className="flex justify-between bg-gray-50 px-4 py-3 rounded-xl"
              >
                <div>
                  <p className="text-sm font-medium">
                    {t.description ?? t.type}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(t.created_at).toLocaleString()}
                  </p>
                </div>

                <span
                  className={`font-bold ${
                    t.amount > 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {t.amount > 0 ? "+" : ""}
                  {t.amount}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};