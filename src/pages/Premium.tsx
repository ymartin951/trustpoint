import { useEffect, useState } from "react";
import {
  BadgeCheck,
  Crown,
  Eye,
  Heart,
  Loader2,
  MessageCircle,
  Rocket,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  getUserSubscription,
  initializePremiumPayment,
  verifyPremiumPayment,
  type SubscriptionStatus,
} from "../services/premiumService";

const PREMIUM_PRICE = "GHS 60";
const PREMIUM_DURATION = "30 days";

const BENEFITS = [
  {
    title: "Priority discovery",
    description: "Appear higher in search and discovery results.",
    icon: Rocket,
  },
  {
    title: "Unlimited likes",
    description: "Like more profiles without daily restrictions.",
    icon: Heart,
  },
  {
    title: "See who likes you",
    description: "Unlock stronger visibility into interested users.",
    icon: Eye,
  },
  {
    title: "Premium badge",
    description: "Stand out with a premium badge on your profile.",
    icon: Crown,
  },
  {
    title: "Better trust signal",
    description: "Premium members look more serious and committed.",
    icon: ShieldCheck,
  },
  {
    title: "More messaging power",
    description: "Prepare your account for future premium chat perks.",
    icon: MessageCircle,
  },
];

const formatDate = (date?: string | null) => {
  if (!date) return "Not available";

  return new Date(date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const Premium = () => {
  const { user } = useAuth();
  const toast = useToast();

  const [subscription, setSubscription] =
    useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingPayment, setStartingPayment] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);

  const isPremium = subscription?.is_premium === true;

  const loadSubscription = async () => {
    if (!user?.id) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    const { data, error } = await getUserSubscription(user.id);

    if (error) {
      console.error("Failed to load subscription:", error);
      toast.error("Failed to load subscription status.");
      setSubscription(null);
    } else {
      setSubscription(data);
    }

    setLoading(false);
  };

  useEffect(() => {
    void loadSubscription();
  }, [user?.id]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("reference");

    if (!reference) return;

    const runVerification = async () => {
      try {
        setVerifyingPayment(true);

        const { data, error } = await verifyPremiumPayment(reference);

        if (error) {
          console.error("Premium verification failed:", error);
          toast.error("Premium payment verification failed.");
          return;
        }

        if (data?.ok) {
          toast.success("Premium activated successfully!");
          await loadSubscription();

          window.history.replaceState({}, "", "/premium");
        } else {
          toast.error(data?.error || "Premium payment could not be verified.");
        }
      } finally {
        setVerifyingPayment(false);
      }
    };

    void runVerification();
  }, []);

  const handleStartPremiumPayment = async () => {
    if (!user?.id) {
      toast.error("Please log in to upgrade.");
      return;
    }

    try {
      setStartingPayment(true);

      const { authorizationUrl, error } = await initializePremiumPayment();

      if (error || !authorizationUrl) {
        console.error("Failed to initialize premium payment:", error);
        toast.error("Failed to start premium payment.");
        return;
      }

      window.location.href = authorizationUrl;
    } catch (error) {
      console.error("Premium payment error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setStartingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-rose-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 pb-24">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-gray-950 via-rose-950 to-pink-700 text-white shadow-xl">
        <div className="grid gap-8 px-6 py-10 md:grid-cols-[1.2fr_0.8fr] md:px-10">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium">
              <Sparkles className="h-4 w-4 text-yellow-300" />
              TrustPoint Premium
            </div>

            <h1 className="max-w-2xl text-4xl font-extrabold tracking-tight md:text-5xl">
              Upgrade your visibility and attract more serious connections.
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-white/80">
              Premium helps your profile stand out, increases your discovery
              priority, and gives you stronger tools to grow your matches on
              TrustPoint.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <div className="rounded-2xl bg-white/10 px-5 py-4">
                <p className="text-sm text-white/70">Monthly price</p>
                <p className="text-2xl font-bold">{PREMIUM_PRICE}</p>
              </div>

              <div className="rounded-2xl bg-white/10 px-5 py-4">
                <p className="text-sm text-white/70">Duration</p>
                <p className="text-2xl font-bold">{PREMIUM_DURATION}</p>
              </div>

              <div className="rounded-2xl bg-white/10 px-5 py-4">
                <p className="text-sm text-white/70">Status</p>
                <p className="text-2xl font-bold">
                  {isPremium ? "Active" : "Free"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 text-gray-900 shadow-2xl">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
              <Crown className="h-7 w-7" />
            </div>

            <h2 className="text-2xl font-bold">Premium Monthly</h2>

            <div className="mt-3 flex items-end gap-2">
              <span className="text-4xl font-extrabold">{PREMIUM_PRICE}</span>
              <span className="pb-1 text-sm text-gray-500">/ month</span>
            </div>

            {isPremium ? (
              <div className="mt-5 rounded-2xl bg-green-50 p-4 text-sm text-green-700">
                <div className="flex items-center gap-2 font-semibold">
                  <BadgeCheck className="h-5 w-5" />
                  Premium Active
                </div>
                <p className="mt-2">
                  Your premium expires on{" "}
                  <span className="font-semibold">
                    {formatDate(subscription?.expires_at)}
                  </span>
                  .
                </p>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">
                <div className="flex items-center gap-2 font-semibold">
                  <Zap className="h-5 w-5" />
                  Unlock premium benefits
                </div>
                <p className="mt-2">
                  Pay with Mobile Money or card through Paystack.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={handleStartPremiumPayment}
              disabled={startingPayment || verifyingPayment}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-500 px-5 py-4 font-semibold text-white shadow hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {startingPayment || verifyingPayment ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {verifyingPayment ? "Verifying..." : "Opening payment..."}
                </>
              ) : isPremium ? (
                <>
                  <Crown className="h-5 w-5" />
                  Extend Premium
                </>
              ) : (
                <>
                  <Crown className="h-5 w-5" />
                  Upgrade Now
                </>
              )}
            </button>

            <p className="mt-4 text-center text-xs text-gray-500">
              Premium lasts for 30 days. Buying again extends your active
              subscription.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-10">
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-gray-900">
            What Premium gives you
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            These benefits make premium users more visible and more attractive
            on TrustPoint.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((benefit) => {
            const Icon = benefit.icon;

            return (
              <div
                key={benefit.title}
                className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
                  <Icon className="h-6 w-6" />
                </div>

                <h3 className="font-semibold text-gray-900">
                  {benefit.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-gray-500">
                  {benefit.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};