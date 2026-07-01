import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCircle,
  Crown,
  Lock,
  RefreshCw,
  Shield,
  ShieldCheck,
  UserRound,
  Wallet,
  XCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  getSubscription,
  upgradeToPremium,
  cancelSubscription,
} from "../services/subscriptionService";
import { getBlockedUsers, unblockUser } from "../services/safetyService";
import { Database } from "../lib/database.types";
import {
  requestNotificationPermission,
  subscribeToPushNotifications,
} from "../services/pushService";

type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];

type SettingsTab = "account" | "subscription" | "notifications" | "safety";

type BlockedUser = {
  id: string;
  blocked_id: string;
  profile?: {
    full_name?: string | null;
    avatar_url?: string | null;
  } | null;
};

export const Settings = () => {
  const { user, profile, refreshProfile } = useAuth();

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [activeTab, setActiveTab] = useState<SettingsTab>("account");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as
    | string
    | undefined;

  const isPremium =
    subscription?.plan_type === "premium" && subscription?.status === "active";

  const loadData = async () => {
    if (!profile?.id) {
      setPageLoading(false);
      return;
    }

    try {
      setPageLoading(true);
      setError("");

      const [subResult, blockedResult] = await Promise.all([
        getSubscription(profile.id),
        getBlockedUsers(profile.id),
      ]);

      if (subResult.error) {
        console.error("Failed to load subscription:", subResult.error);
      }

      if (subResult.data) {
        setSubscription(subResult.data);
      } else {
        setSubscription(null);
      }

      if (blockedResult.error) {
        console.error("Failed to load blocked users:", blockedResult.error);
      }

      if (blockedResult.data) {
        setBlockedUsers(blockedResult.data as unknown as BlockedUser[]);
      } else {
        setBlockedUsers([]);
      }
    } catch (err: any) {
      console.error("Settings load error:", err);
      setError(err.message || "Failed to load settings.");
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const showMessage = (text: string) => {
    setMessage(text);
    setError("");

    setTimeout(() => {
      setMessage("");
    }, 3000);
  };

  const showError = (text: string) => {
    setError(text);
    setMessage("");
  };

  const handleUpgrade = async () => {
    if (!profile?.id || loading) return;

    try {
      setLoading(true);
      setError("");

      const { error } = await upgradeToPremium(profile.id);

      if (error) {
        showError("Failed to upgrade. Please try again.");
        return;
      }

      await loadData();
      showMessage("Successfully upgraded to Premium.");
    } catch (err: any) {
      console.error("Upgrade error:", err);
      showError(err.message || "Failed to upgrade. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!profile?.id || loading) return;

    const confirmed = window.confirm("Cancel premium subscription?");

    if (!confirmed) return;

    try {
      setLoading(true);
      setError("");

      const { error } = await cancelSubscription(profile.id);

      if (error) {
        showError("Failed to cancel subscription.");
        return;
      }

      await loadData();
      showMessage("Subscription cancelled.");
    } catch (err: any) {
      console.error("Cancel subscription error:", err);
      showError(err.message || "Failed to cancel subscription.");
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (blockedId: string) => {
    if (!profile?.id || loading) return;

    try {
      setLoading(true);
      setError("");

      const { error } = await unblockUser(profile.id, blockedId);

      if (error) {
        showError("Failed to unblock user.");
        return;
      }

      await loadData();
      showMessage("User unblocked successfully.");
    } catch (err: any) {
      console.error("Unblock error:", err);
      showError(err.message || "Failed to unblock user.");
    } finally {
      setLoading(false);
    }
  };

  const handleEnablePush = async () => {
    if (!user?.id || loading) return;

    if (!VAPID_PUBLIC_KEY) {
      showError(
        "Push notification key is missing. Add VITE_VAPID_PUBLIC_KEY to your environment variables."
      );
      return;
    }

    try {
      setLoading(true);
      setError("");

      const permission = await requestNotificationPermission();

      if (permission !== "granted") {
        showError("Notification permission was not granted.");
        return;
      }

      await subscribeToPushNotifications(user.id, VAPID_PUBLIC_KEY);

      showMessage("Push notifications enabled successfully.");
    } catch (err: any) {
      console.error("Push notification error:", err);
      showError(err.message || "Failed to enable notifications.");
    } finally {
      setLoading(false);
    }
  };

  const tabs: {
    id: SettingsTab;
    label: string;
    icon: typeof UserRound;
  }[] = [
    {
      id: "account",
      label: "Account",
      icon: UserRound,
    },
    {
      id: "subscription",
      label: "Premium",
      icon: Crown,
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: Bell,
    },
    {
      id: "safety",
      label: "Safety",
      icon: Shield,
    },
  ];

  if (!profile || pageLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-rose-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 pb-24">
      <div className="mb-8 rounded-3xl bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-500 p-8 text-white shadow-lg">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-sm">
              <ShieldCheck className="h-4 w-4" />
              Account Settings
            </div>

            <h1 className="text-3xl font-bold">Manage your TrustPoint account</h1>

            <p className="mt-2 max-w-2xl text-white/90">
              Control your subscription, notifications, safety settings, and
              account information from one place.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadData()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 font-semibold text-rose-600 shadow disabled:opacity-60"
          >
            <RefreshCw className="h-5 w-5" />
            Refresh
          </button>
        </div>
      </div>

      {message ? (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <p>{message}</p>
        </div>
      ) : null}

      {error ? (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-4 rounded-2xl bg-gray-50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                <UserRound className="h-6 w-6" />
              </div>

              <div className="min-w-0">
                <p className="truncate font-semibold text-gray-900">
                  {profile.full_name || "TrustPoint User"}
                </p>
                <p className="truncate text-sm text-gray-500">
                  {user?.email || "No email"}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
                    active
                      ? "bg-rose-50 text-rose-600"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm md:p-8">
          {activeTab === "account" ? (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Account Overview
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Review your basic account and profile status.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-gray-50 p-5">
                  <p className="text-sm text-gray-500">Full Name</p>
                  <p className="mt-1 font-semibold text-gray-900">
                    {profile.full_name || "Not added"}
                  </p>
                </div>

                <div className="rounded-2xl bg-gray-50 p-5">
                  <p className="text-sm text-gray-500">Email Address</p>
                  <p className="mt-1 break-all font-semibold text-gray-900">
                    {user?.email || "Not available"}
                  </p>
                </div>

                <div className="rounded-2xl bg-gray-50 p-5">
                  <p className="text-sm text-gray-500">Location</p>
                  <p className="mt-1 font-semibold text-gray-900">
                    {[profile.city, profile.region, profile.country]
                      .filter(Boolean)
                      .join(", ") || "Not added"}
                  </p>
                </div>

                <div className="rounded-2xl bg-gray-50 p-5">
                  <p className="text-sm text-gray-500">Verification Status</p>
                  <p className="mt-1 font-semibold capitalize text-gray-900">
                    {profile.verification_status || "not_submitted"}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-rose-100 bg-rose-50 p-5">
                <div className="flex items-start gap-3">
                  <Lock className="mt-0.5 h-5 w-5 text-rose-600" />
                  <div>
                    <h3 className="font-semibold text-rose-900">
                      Privacy settings note
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-rose-700">
                      I removed the old profile visibility, online status, and
                      read receipt switches because they were only frontend
                      checkboxes and were not connected to any database logic.
                      We can add them properly later with real columns and saved
                      preferences.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === "subscription" ? (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Premium Subscription
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Manage your premium plan and monetized features.
                </p>
              </div>

              <div
                className={`rounded-3xl p-6 ${
                  isPremium
                    ? "bg-gradient-to-r from-rose-500 to-pink-600 text-white"
                    : "bg-gray-50 text-gray-900"
                }`}
              >
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-bold">
                      {isPremium ? "Premium Plan" : "Free Plan"}
                    </h3>
                    <p
                      className={`mt-1 text-sm ${
                        isPremium ? "text-rose-100" : "text-gray-600"
                      }`}
                    >
                      {isPremium
                        ? "You currently have active premium access."
                        : "Upgrade to unlock more powerful dating features."}
                    </p>
                  </div>

                  <Crown
                    className={`h-12 w-12 ${
                      isPremium ? "text-white" : "text-gray-400"
                    }`}
                  />
                </div>

                {isPremium && subscription?.expires_at ? (
                  <p className="mb-5 text-sm text-rose-100">
                    Expires on{" "}
                    {new Date(subscription.expires_at).toLocaleDateString()}
                  </p>
                ) : null}

                {isPremium ? (
                  <button
                    type="button"
                    onClick={handleCancelSubscription}
                    disabled={loading}
                    className="w-full rounded-xl bg-white py-3 font-semibold text-rose-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? "Please wait..." : "Cancel Subscription"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleUpgrade}
                    disabled={loading}
                    className="w-full rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 py-3 font-semibold text-white transition hover:from-rose-600 hover:to-pink-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? "Please wait..." : "Upgrade to Premium"}
                  </button>
                )}
              </div>

              <div>
                <h3 className="mb-4 font-semibold text-gray-900">
                  Premium benefits
                </h3>

                <div className="grid gap-3 md:grid-cols-2">
                  {[
                    "More profile visibility",
                    "Boost your profile",
                    "See who liked you",
                    "Unlock profile visitors",
                    "Use more credits features",
                    "Stand out from free users",
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-3 rounded-2xl bg-gray-50 p-4"
                    >
                      <div className="rounded-full bg-rose-100 p-2 text-rose-600">
                        <Crown className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === "notifications" ? (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Notifications
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Enable push notifications so users do not miss likes,
                  messages, super likes, and profile views.
                </p>
              </div>

              <div className="rounded-3xl border border-gray-100 bg-gray-50 p-6">
                <div className="mb-5 flex items-start gap-4">
                  <div className="rounded-2xl bg-rose-100 p-3 text-rose-600">
                    <Bell className="h-6 w-6" />
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Push Notifications
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-gray-600">
                      Turn this on to receive important TrustPoint alerts even
                      when you are not actively using the app.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => void handleEnablePush()}
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 px-5 py-3 font-semibold text-white transition hover:from-rose-600 hover:to-pink-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Enabling..." : "Enable Push Notifications"}
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {[
                  "New messages",
                  "New likes",
                  "Super likes",
                  "Profile views",
                  "Premium and credit updates",
                  "Important account alerts",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-2xl bg-gray-50 p-4"
                  >
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-gray-700">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {activeTab === "safety" ? (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Safety & Security
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Keep your account safe and control blocked users.
                </p>
              </div>

              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />

                  <div>
                    <h3 className="font-semibold text-blue-900">
                      Safety Tips
                    </h3>

                    <ul className="mt-2 space-y-1 text-sm text-blue-700">
                      <li>• Do not share sensitive personal information early.</li>
                      <li>• Meet in public places for first dates.</li>
                      <li>• Report suspicious or abusive behavior.</li>
                      <li>• Trust your instincts and leave unsafe conversations.</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-3 font-semibold text-gray-900">
                  Blocked Users
                </h3>

                {blockedUsers.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center">
                    <Shield className="mx-auto mb-3 h-8 w-8 text-gray-400" />
                    <p className="font-medium text-gray-800">
                      No blocked users
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      Users you block will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {blockedUsers.map((block) => {
                      const blockedProfile = block.profile;

                      return (
                        <div
                          key={block.id}
                          className="flex items-center justify-between rounded-2xl bg-gray-50 p-4"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-gray-600">
                              <UserRound className="h-5 w-5" />
                            </div>

                            <div>
                              <p className="font-medium text-gray-900">
                                {blockedProfile?.full_name || "Blocked user"}
                              </p>
                              <p className="text-xs text-gray-500">
                                {block.blocked_id}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => void handleUnblock(block.blocked_id)}
                            disabled={loading}
                            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-rose-600 shadow-sm transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Unblock
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-red-100 bg-red-50 p-5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 text-red-600" />

                  <div>
                    <h3 className="font-semibold text-red-900">
                      Dangerous actions
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-red-700">
                      Account deletion is not added here yet because it should
                      be handled carefully with confirmation, data cleanup, and
                      admin rules. We can build that safely later.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};